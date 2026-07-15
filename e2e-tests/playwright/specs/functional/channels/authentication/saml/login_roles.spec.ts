// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Page} from '@playwright/test';

import {
    ChannelsPage,
    configureSamlWithKeycloak,
    expect,
    KeycloakAdminClient,
    KeycloakLoginPage,
    test,
    testConfig,
} from '@mattermost/playwright-lib';
import type {KeycloakUser, PlaywrightExtended} from '@mattermost/playwright-lib';

type RoleOptions = {
    attributeName?: 'UserType' | 'IsGuest' | 'IsAdmin';
    attributeValue?: string;
    guestAttribute?: string;
    adminAttribute?: string;
    expectedRole: 'member' | 'guest' | 'admin';
};

test.describe('SAML login roles', () => {
    test.describe.configure({mode: 'serial'});

    test.beforeEach(async ({pw}) => {
        await pw.ensureLicense();
        await pw.skipIfNoLicense();
    });

    /**
     * @objective Verify a new SAML member is created and the same Mattermost account is used on the next login
     *
     * @precondition Keycloak is available and the server has a SAML-capable license
     */
    test('Saml login new and existing MM regular user', {tag: '@saml'}, async ({pw, page}) => {
        // # Complete new and existing SAML login flows
        await verifyNewAndExistingLogin(pw, page, {expectedRole: 'member'});
        // * Verify both logins use the same member account
    });

    /**
     * @objective Verify the UserType=Guest SAML attribute creates a guest and preserves that role on the next login
     *
     * @precondition Keycloak is available and guest accounts are licensed
     */
    test('Saml login new and existing MM guest user(userType=Guest)', {tag: '@saml'}, async ({pw, page}) => {
        // # Complete new and existing SAML login flows with UserType=Guest
        await verifyNewAndExistingLogin(pw, page, {
            attributeName: 'UserType',
            attributeValue: 'Guest',
            guestAttribute: 'UserType=Guest',
            expectedRole: 'guest',
        });
        // * Verify both logins use the same guest account
    });

    /**
     * @objective Verify the IsGuest=true SAML attribute creates a guest and preserves that role on the next login
     *
     * @precondition Keycloak is available and guest accounts are licensed
     */
    test('Saml login new and existing MM guest(isGuest=true)', {tag: '@saml'}, async ({pw, page}) => {
        // # Complete new and existing SAML login flows with IsGuest=true
        await verifyNewAndExistingLogin(pw, page, {
            attributeName: 'IsGuest',
            attributeValue: 'true',
            guestAttribute: 'IsGuest=true',
            expectedRole: 'guest',
        });
        // * Verify both logins use the same guest account
    });

    /**
     * @objective Verify the UserType=Admin SAML attribute creates an administrator and preserves that role on the next login
     *
     * @precondition Keycloak is available and SAML administrator attributes are licensed
     */
    test('Saml login new and existing MM admin(userType=Admin)', {tag: '@saml'}, async ({pw, page}) => {
        // # Complete new and existing SAML login flows with UserType=Admin
        await verifyNewAndExistingLogin(pw, page, {
            attributeName: 'UserType',
            attributeValue: 'Admin',
            adminAttribute: 'UserType=Admin',
            expectedRole: 'admin',
        });
        // * Verify both logins use the same administrator account
    });

    /**
     * @objective Verify the IsAdmin=true SAML attribute creates an administrator and preserves that role on the next login
     *
     * @precondition Keycloak is available and SAML administrator attributes are licensed
     */
    test('Saml login new and existing MM admin(isAdmin=true)', {tag: '@saml'}, async ({pw, page}) => {
        // # Complete new and existing SAML login flows with IsAdmin=true
        await verifyNewAndExistingLogin(pw, page, {
            attributeName: 'IsAdmin',
            attributeValue: 'true',
            adminAttribute: 'IsAdmin=true',
            expectedRole: 'admin',
        });
        // * Verify both logins use the same administrator account
    });
});

async function verifyNewAndExistingLogin(pw: PlaywrightExtended, page: Page, options: RoleOptions) {
    const {adminClient} = await pw.getAdminClient();
    const keycloak = new KeycloakAdminClient();
    const mapperNames = options.attributeName ? [options.attributeName] : [];
    const idpCertificate = await keycloak.configureSamlClient(testConfig.baseURL, mapperNames);
    await configureSamlWithKeycloak(adminClient, {
        baseURL: testConfig.baseURL,
        enableSyncWithLdap: false,
        enableGuestAccess: true,
        guestAttribute: options.guestAttribute || '',
        enableAdminAttribute: Boolean(options.adminAttribute),
        adminAttribute: options.adminAttribute || '',
        idpCertificate,
    });
    const user = createKeycloakUser(pw, options);
    await keycloak.createUser(user);
    const keycloakLoginPage = new KeycloakLoginPage(page);

    // # Log in as a new Keycloak user through the visible SAML flow
    await keycloakLoginPage.login(user);

    // * Verify Mattermost creates the user with the mapped role
    const mattermostUser = await adminClient.getUserByEmail(user.email);
    expectRole(mattermostUser.roles, options.expectedRole);

    // # Give the new account a team and channel, then log in through SAML again
    const team = await adminClient.createTeam(await pw.random.team());
    await adminClient.addToTeam(team.id, mattermostUser.id);
    const townSquare = await adminClient.getChannelByName(team.id, 'town-square');
    await adminClient.addToChannel(mattermostUser.id, townSquare.id);
    await keycloakLoginPage.login(user);
    const channelsPage = new ChannelsPage(page);
    await channelsPage.goto(team.name, townSquare.name);
    await channelsPage.toBeVisible();

    // * Verify the existing Mattermost account and mapped role are reused
    const existingUser = await adminClient.getUserByEmail(user.email);
    expect(existingUser.id).toBe(mattermostUser.id);
    expectRole(existingUser.roles, options.expectedRole);
}

function createKeycloakUser(pw: PlaywrightExtended, options: RoleOptions): KeycloakUser {
    const id = pw.random.id();
    return {
        username: `saml-role-${id}`,
        password: 'Password1!',
        email: `saml-role-${id}@mmtest.com`,
        firstName: 'SAML',
        lastName: 'Role',
        attributes:
            options.attributeName && options.attributeValue
                ? {[options.attributeName]: [options.attributeValue]}
                : undefined,
    };
}

function expectRole(roles: string, expectedRole: RoleOptions['expectedRole']) {
    if (expectedRole === 'guest') {
        expect(roles).toContain('system_guest');
        return;
    }
    if (expectedRole === 'admin') {
        expect(roles).toContain('system_admin');
        return;
    }
    expect(roles).not.toContain('system_guest');
    expect(roles).not.toContain('system_admin');
}
