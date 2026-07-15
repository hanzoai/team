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
import type {KeycloakUser, PlaywrightClient4, PlaywrightExtended} from '@mattermost/playwright-lib';

test.describe('SAML automated behaviors', () => {
    test.describe.configure({mode: 'serial'});

    test.beforeEach(async ({pw}) => {
        await pw.ensureLicense();
        await pw.skipIfNoLicense();
    });

    /**
     * @objective Verify service-provider metadata remains valid XML when SAML encryption is disabled
     *
     * @precondition Keycloak is available and the server has a SAML-capable license
     */
    test('MM-T3012 - Check SAML Metadata without Enable Encryption', {tag: '@saml'}, async ({pw, request}) => {
        const {adminClient} = await pw.getAdminClient();
        await configureKeycloakSaml(adminClient);

        // # Request Mattermost service-provider metadata with encryption disabled
        const response = await request.get(`${testConfig.baseURL}/api/v4/saml/metadata`);
        const metadata = await response.text();

        // * Verify the endpoint returns XML metadata without an encryption key descriptor
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toMatch(/^application\/xml(?:;|$)/);
        expect(metadata).toContain('<?xml version');
        expect(metadata).toContain('EntityDescriptor');
        expect(metadata).not.toContain('use="encryption"');
    });

    /**
     * @objective Verify a successful SAML login is recorded in the user's access history
     *
     * @precondition Keycloak is available and the server has a SAML-capable license
     */
    test('MM-T3280 - SAML Login Audit', {tag: '@saml'}, async ({pw, page}) => {
        const {adminClient} = await pw.getAdminClient();
        const keycloak = await configureKeycloakSaml(adminClient);
        const user = createKeycloakUser(pw, 'audit');
        await keycloak.createUser(user);
        const keycloakLoginPage = new KeycloakLoginPage(page);

        // # Register the user through SAML and assign a team and channel
        await keycloakLoginPage.login(user);
        const mattermostUser = await adminClient.getUserByEmail(user.email);
        const team = await adminClient.createTeam(await pw.random.team());
        await adminClient.addToTeam(team.id, mattermostUser.id);
        const townSquare = await adminClient.getChannelByName(team.id, 'town-square');
        await adminClient.addToChannel(mattermostUser.id, townSquare.id);

        // # Log in through SAML again and open the profile security settings
        await keycloakLoginPage.login(user);
        const channelsPage = new ChannelsPage(page);
        await channelsPage.goto(team.name, townSquare.name);
        await channelsPage.toBeVisible();
        const profileModal = await channelsPage.openProfileModal();

        // * Verify the SAML user lookup is present in access history
        await profileModal.expectAccessHistoryEntry('Saml obtained user');
    });

    /**
     * @objective Verify a Keycloak SAML login succeeds with the RSA SHA-256 signature algorithm configured
     *
     * @precondition Keycloak is available and the server has a SAML-capable license
     */
    test('MM-T3281 - SAML Signature Algorithm using RSAwithSHA256', {tag: '@saml'}, async ({pw, page}) => {
        // # Configure RSA SHA-256 and complete a Keycloak SAML login
        await verifySignatureAlgorithmLogin(pw, page, 'RSAwithSHA256');
        // * Verify Mattermost accepts the authenticated user
    });

    /**
     * @objective Verify a Keycloak SAML login succeeds with the RSA SHA-512 signature algorithm configured
     *
     * @precondition Keycloak is available and the server has a SAML-capable license
     */
    test('SAML Signature Algorithm using RSAwithSHA512', {tag: '@saml'}, async ({pw, page}) => {
        // # Configure RSA SHA-512 and complete a Keycloak SAML login
        await verifySignatureAlgorithmLogin(pw, page, 'RSAwithSHA512');
        // * Verify Mattermost accepts the authenticated user
    });
});

async function configureKeycloakSaml(
    adminClient: PlaywrightClient4,
    signatureAlgorithm: 'RSAwithSHA256' | 'RSAwithSHA512' = 'RSAwithSHA256',
) {
    const keycloak = new KeycloakAdminClient();
    const idpCertificate = await keycloak.configureSamlClient(testConfig.baseURL);
    await configureSamlWithKeycloak(adminClient, {
        baseURL: testConfig.baseURL,
        enableSyncWithLdap: false,
        enableGuestAccess: true,
        guestAttribute: '',
        enableAdminAttribute: false,
        adminAttribute: '',
        signatureAlgorithm,
        idpCertificate,
    });
    return keycloak;
}

async function verifySignatureAlgorithmLogin(
    pw: PlaywrightExtended,
    page: Page,
    signatureAlgorithm: 'RSAwithSHA256' | 'RSAwithSHA512',
) {
    const {adminClient} = await pw.getAdminClient();
    const keycloak = await configureKeycloakSaml(adminClient, signatureAlgorithm);
    const user = createKeycloakUser(pw, signatureAlgorithm.toLowerCase());
    await keycloak.createUser(user);

    // # Complete an actual browser login through Keycloak using the selected SAML signature setting
    await new KeycloakLoginPage(page).login(user);

    // * Verify Mattermost accepted the assertion and created the authenticated user
    const mattermostUser = await adminClient.getUserByEmail(user.email);
    expect(mattermostUser.email).toBe(user.email);
}

function createKeycloakUser(pw: PlaywrightExtended, prefix: string): KeycloakUser {
    const id = pw.random.id();
    return {
        username: `saml-${prefix}-${id}`,
        password: 'Password1!',
        email: `saml-${prefix}-${id}@mmtest.com`,
        firstName: 'SAML',
        lastName: prefix,
    };
}
