// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Page} from '@playwright/test';

import {
    ChannelsPage,
    configureSamlWithKeycloak,
    KeycloakAdminClient,
    KeycloakLoginPage,
    LoginPage,
    SystemConsolePage,
    expect,
    test,
    testConfig,
} from '@mattermost/playwright-lib';
import type {KeycloakUser, PlaywrightExtended} from '@mattermost/playwright-lib';

const guestAttributeName = 'mattermostGuest';

test.describe('SAML guest and member access', () => {
    test.describe.configure({mode: 'serial'});

    test.beforeEach(async ({pw}) => {
        await pw.ensureLicense();
        await pw.skipIfNoLicense();
    });

    /**
     * @objective Verify the SAML guest attribute becomes disabled after a configured value is saved and guest access is disabled
     *
     * @precondition Keycloak is available and the server has a SAML-capable license
     */
    test('MM-T1423_1 SAML Guest Setting disabled if Guest Access is turned off', {tag: '@saml'}, async ({pw}) => {
        const {adminClient, adminUser} = await pw.getAdminClient();
        const keycloak = new KeycloakAdminClient();
        const idpCertificate = await keycloak.configureSamlClient(testConfig.baseURL, [guestAttributeName]);
        await configureSamlWithKeycloak(adminClient, {
            baseURL: testConfig.baseURL,
            enableSyncWithLdap: false,
            enableGuestAccess: true,
            guestAttribute: '',
            idpCertificate,
        });
        const {page} = await pw.testBrowser.login(adminUser!);
        const systemConsolePage = new SystemConsolePage(page);

        // # Set and save a SAML guest attribute while guest access is enabled
        await systemConsolePage.saml.goto();
        await systemConsolePage.saml.setGuestAttribute(`${guestAttributeName}=true`);

        // # Disable guest access and confirm the warning
        await systemConsolePage.guestAccess.goto();
        await systemConsolePage.guestAccess.setEnabled(false);

        // * Verify the previously configured SAML guest attribute is disabled
        await systemConsolePage.saml.goto();
        await systemConsolePage.saml.expectGuestAttributeDisabled();
    });

    /**
     * @objective Verify a SAML user logs in as a member when guest access is disabled
     *
     * @precondition Keycloak is available and the server has a SAML-capable license
     */
    test('MM-T1423_2 SAML User will login as member', {tag: '@saml'}, async ({pw, page}) => {
        // # Configure guest access off and log in through SAML
        const setup = await setupSamlUser(pw, page, {enableGuestAccess: false, guestAttribute: ''});

        // * Verify the SAML user can create a public channel as a member
        await setup.channelsPage.expectCanCreatePublicChannel(true);
        expect((await setup.adminClient.getUserByEmail(setup.user.email)).roles).not.toContain('system_guest');
    });

    /**
     * @objective Verify a SAML user logs in as a member when the guest attribute value does not match
     *
     * @precondition Keycloak is available and the server has a SAML-capable license
     */
    test('MM-T1426_1 User logged in as member, filter does not match', {tag: '@saml'}, async ({pw, page}) => {
        // # Configure a non-matching SAML guest filter and log in
        const setup = await setupSamlUser(pw, page, {
            enableGuestAccess: true,
            guestAttribute: `${guestAttributeName}=wrong`,
        });

        // * Verify the non-matching SAML user can create a public channel as a member
        await setup.channelsPage.expectCanCreatePublicChannel(true);
        expect((await setup.adminClient.getUserByEmail(setup.user.email)).roles).not.toContain('system_guest');
    });

    /**
     * @objective Verify a SAML user logs in as a guest when the guest attribute value matches
     *
     * @precondition Keycloak is available and the server has a SAML-capable license
     */
    test('MM-T1426_2 User logged in as guest, correct filter', {tag: '@saml'}, async ({pw, page}) => {
        // # Configure a matching SAML guest filter and log in
        const setup = await setupSamlUser(pw, page, {
            enableGuestAccess: true,
            guestAttribute: `${guestAttributeName}=true`,
        });

        // * Verify the matching SAML user cannot create a public channel as a guest
        await setup.channelsPage.expectCanCreatePublicChannel(false);
        expect((await setup.adminClient.getUserByEmail(setup.user.email)).roles).toContain('system_guest');
    });
});

async function setupSamlUser(
    pw: PlaywrightExtended,
    page: Page,
    options: {enableGuestAccess: boolean; guestAttribute: string},
) {
    const {adminClient} = await pw.getAdminClient();
    const keycloak = new KeycloakAdminClient();
    const idpCertificate = await keycloak.configureSamlClient(testConfig.baseURL, [guestAttributeName]);
    await configureSamlWithKeycloak(adminClient, {
        baseURL: testConfig.baseURL,
        enableSyncWithLdap: false,
        enableGuestAccess: options.enableGuestAccess,
        guestAttribute: options.guestAttribute,
        idpCertificate,
    });
    const user: KeycloakUser = {
        username: `saml-${pw.random.id()}`,
        password: 'Password1!',
        email: `saml-${pw.random.id()}@mmtest.com`,
        firstName: 'SAML',
        lastName: 'Guest',
        attributes: {[guestAttributeName]: ['true']},
    };
    await keycloak.createUser(user);

    // # Register the user through the visible Mattermost and Keycloak SAML login flow
    await loginWithSaml(page, user);

    // # Assign the registered account to a team and its default public channel
    const mattermostUser = await adminClient.getUserByEmail(user.email);
    const team = await adminClient.createTeam(await pw.random.team());
    await adminClient.addToTeam(team.id, mattermostUser.id);
    const townSquare = await adminClient.getChannelByName(team.id, 'town-square');
    await adminClient.addToChannel(mattermostUser.id, townSquare.id);

    // # Log in through SAML again and open the assigned channel
    await loginWithSaml(page, user);
    const channelsPage = new ChannelsPage(page);
    await channelsPage.goto(team.name, townSquare.name);
    await channelsPage.toBeVisible();
    return {adminClient, channelsPage, user};
}

async function loginWithSaml(page: Page, user: KeycloakUser) {
    await page.goto('about:blank');
    await page.context().clearCookies();
    const loginPage = new LoginPage(page);
    const keycloakLoginPage = new KeycloakLoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithSaml();
    await keycloakLoginPage.submit(user);
}
