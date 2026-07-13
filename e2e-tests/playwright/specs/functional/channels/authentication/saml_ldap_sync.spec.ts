// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Page} from '@playwright/test';

import {
    configureSamlWithKeycloak,
    createLdapUser,
    expect,
    KeycloakAdminClient,
    OpenLdapClient,
    runLdapSync,
    SamlLoginPage,
    test,
    testConfig,
} from '@mattermost/playwright-lib';
import type {KeycloakUser, LdapUser, PlaywrightClient4, PlaywrightExtended} from '@mattermost/playwright-lib';

type SamlUserSetup = {
    adminClient: PlaywrightClient4;
    keycloak: KeycloakAdminClient;
    ldap: OpenLdapClient;
    ldapUser: LdapUser;
    samlUser: KeycloakUser;
    samlLogin: SamlLoginPage;
};

test.describe('SAML and LDAP synchronization', () => {
    test.describe.configure({mode: 'serial'});

    test.beforeEach(async ({pw}) => {
        await pw.ensureLicense();
        await pw.skipIfNoLicense();
    });

    /**
     * @objective Verify SAML attributes remain authoritative when SAML-to-LDAP synchronization is disabled
     *
     * @precondition
     * OpenLDAP and Keycloak are available
     */
    test(
        'MM-T3013_1 keeps SAML profile attributes when LDAP synchronization is disabled',
        {tag: '@saml'},
        async ({pw, page}) => {
            // # Register a matching SAML and LDAP user with intentionally different names
            const setup = await setupSamlUser(pw, page, {enableSyncWithLdap: false});

            // * Verify the live profile displays SAML attributes
            await setup.samlLogin.assertFullName(setup.samlUser.firstName, setup.samlUser.lastName);

            // # Synchronize LDAP while SAML-to-LDAP synchronization remains disabled
            await runLdapSync(setup.adminClient);
            await page.reload();

            // * Verify LDAP synchronization does not replace the SAML profile attributes
            await setup.samlLogin.assertFullName(setup.samlUser.firstName, setup.samlUser.lastName);
        },
    );

    /**
     * @objective Verify LDAP attributes replace SAML attributes when SAML-to-LDAP synchronization is enabled
     *
     * @precondition
     * OpenLDAP and Keycloak are available
     */
    test(
        'MM-T3013_2 synchronizes SAML profile attributes from LDAP when enabled',
        {tag: '@saml'},
        async ({pw, page}) => {
            // # Register a matching SAML and LDAP user with synchronization enabled
            const setup = await setupSamlUser(pw, page, {enableSyncWithLdap: true});

            // # Run LDAP synchronization after the initial SAML registration
            await runLdapSync(setup.adminClient);
            await page.reload();

            // * Verify LDAP attributes are authoritative in the live profile
            await setup.samlLogin.assertFullName(setup.ldapUser.firstName, setup.ldapUser.lastName);

            // # Change the LDAP names and run synchronization
            const firstName = `UpdatedFirst-${pw.random.id()}`;
            const lastName = `UpdatedLast-${pw.random.id()}`;
            await setup.ldap.updateUserNames(setup.ldapUser.username, firstName, lastName);
            await runLdapSync(setup.adminClient);
            await page.reload();

            // * Verify the live profile displays the updated LDAP attributes
            await setup.samlLogin.assertFullName(firstName, lastName);
        },
    );

    /**
     * @objective Verify SAML login is rejected until the user is registered in LDAP
     *
     * @precondition
     * OpenLDAP and Keycloak are available
     */
    test('MM-T3664 allows a SAML user to log in only after LDAP registration', {tag: '@saml'}, async ({pw, page}) => {
        // # Configure synchronized SAML and create the user only in Keycloak
        const setup = await setupSamlUser(pw, page, {enableSyncWithLdap: true, createInLdap: false});

        // * Verify Mattermost rejects the SAML user missing from LDAP
        await setup.samlLogin.assertMattermostError('No user registered on AD/LDAP server that matches the SAML user.');

        // # Register the same user in LDAP and complete SAML registration
        await setup.ldap.createUser(setup.ldapUser);
        await setup.samlLogin.login(setup.samlUser);

        // # Synchronize the registered account and add it to a team
        await runLdapSync(setup.adminClient);
        await addUserToNewTeam(pw, setup.adminClient, setup.ldapUser.email);

        // # Log in through SAML again
        await setup.samlLogin.login(setup.samlUser);

        // * Verify login succeeds and the user can post in a channel
        await setup.samlLogin.assertAuthenticated();
        await setup.samlLogin.postMessage(`SAML LDAP login ${pw.random.id()}`);
        await runLdapSync(setup.adminClient);
        await page.reload();
        await setup.samlLogin.assertFullName(setup.ldapUser.firstName, setup.ldapUser.lastName);
    });

    /**
     * @objective Verify disabling and re-enabling a Keycloak user controls SAML login
     *
     * @precondition
     * OpenLDAP and Keycloak are available
     */
    test(
        'MM-T3665 rejects a disabled SAML user and restores login after reactivation',
        {tag: '@saml'},
        async ({pw, page}) => {
            // # Register and authenticate a synchronized SAML and LDAP user
            const setup = await setupSamlUser(pw, page, {enableSyncWithLdap: true});

            // # Disable the user in Keycloak and attempt another login
            await setup.keycloak.setUserEnabled(setup.samlUser.email, false);
            await setup.samlLogin.login(setup.samlUser, false);

            // * Verify Keycloak rejects the disabled account
            await setup.samlLogin.assertKeycloakAccountDisabled();

            // # Reactivate the Keycloak user and log in again
            await setup.keycloak.setUserEnabled(setup.samlUser.email, true);
            await setup.samlLogin.login(setup.samlUser);

            // * Verify SAML login and synchronized profile access are restored
            await setup.samlLogin.assertAuthenticated();
            await setup.samlLogin.postMessage(`Reactivated SAML user ${pw.random.id()}`);
            await runLdapSync(setup.adminClient);
            await page.reload();
            await setup.samlLogin.assertFullName(setup.ldapUser.firstName, setup.ldapUser.lastName);
        },
    );

    /**
     * @objective Verify SAML-to-LDAP synchronization matches users by the configured ID attribute
     *
     * @precondition
     * OpenLDAP and Keycloak are available
     */
    test('MM-T3666 synchronizes SAML users by the LDAP ID attribute', {tag: '@saml'}, async ({pw, page}) => {
        // # Register a synchronized user whose SAML and LDAP username ID attributes match
        const setup = await setupSamlUser(pw, page, {enableSyncWithLdap: true});

        // # Run LDAP synchronization after the initial SAML registration
        await runLdapSync(setup.adminClient);
        await page.reload();

        // * Verify the initial LDAP profile attributes
        await setup.samlLogin.assertFullName(setup.ldapUser.firstName, setup.ldapUser.lastName);

        // # Update the LDAP names for the same ID attribute and synchronize
        const firstName = `IdFirst-${pw.random.id()}`;
        const lastName = `IdLast-${pw.random.id()}`;
        await setup.ldap.updateUserNames(setup.ldapUser.username, firstName, lastName);
        await runLdapSync(setup.adminClient);
        await page.reload();

        // * Verify synchronization updates the existing SAML user
        await setup.samlLogin.assertFullName(firstName, lastName);
        const user = await setup.adminClient.getUserByEmail(setup.ldapUser.email);
        expect(user.username).toBe(setup.ldapUser.username);
    });
});

async function setupSamlUser(
    pw: PlaywrightExtended,
    page: Page,
    options: {enableSyncWithLdap: boolean; createInLdap?: boolean},
): Promise<SamlUserSetup> {
    const {adminClient} = await pw.getAdminClient();
    const ldap = new OpenLdapClient();
    const keycloak = new KeycloakAdminClient();
    const ldapUser = createLdapUser('saml');
    const samlUser = {
        username: ldapUser.username,
        password: ldapUser.password,
        email: ldapUser.email,
        firstName: `SamlFirst-${pw.random.id()}`,
        lastName: `SamlLast-${pw.random.id()}`,
    };
    const samlLogin = new SamlLoginPage(page);

    await pw.hasSeenLandingPage();
    const idpCertificate = await keycloak.configureSamlClient(testConfig.baseURL);
    await configureSamlWithKeycloak(adminClient, {
        baseURL: testConfig.baseURL,
        enableSyncWithLdap: options.enableSyncWithLdap,
        idpCertificate,
    });
    if (options.createInLdap !== false) {
        await ldap.createUser(ldapUser);
    }
    await keycloak.createUser(samlUser);
    await samlLogin.login(samlUser);

    if (options.createInLdap !== false) {
        await addUserToNewTeam(pw, adminClient, ldapUser.email);
        await samlLogin.login(samlUser);
        await samlLogin.assertAuthenticated();
    }

    return {adminClient, keycloak, ldap, ldapUser, samlUser, samlLogin};
}

async function addUserToNewTeam(pw: PlaywrightExtended, adminClient: PlaywrightClient4, email: string) {
    const user = await adminClient.getUserByEmail(email);
    const team = await adminClient.createTeam(await pw.random.team());
    await adminClient.addToTeam(team.id, user.id);
}
