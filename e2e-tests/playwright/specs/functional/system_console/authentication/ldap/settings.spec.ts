// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {duration, EnterpriseSystemConsolePage, expect, test} from '@mattermost/playwright-lib';

import {ldapUsers, loginFromPage, setupLdap} from './support';

test.describe('LDAP authentication and guest filters', () => {
    test.describe.configure({mode: 'serial'});

    test.beforeEach(async ({pw}) => {
        await setupLdap(pw);
    });

    /**
     * @objective Verify an LDAP admin filter grants system administrator access to matching LDAP users
     *
     * @precondition
     * OpenLDAP is populated and the server has an LDAP-capable license
     */
    test('MM-T2821 LDAP Admin Filter', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient} = await pw.getAdminClient();
        await adminClient.patchConfig({LdapSettings: {EnableAdminFilter: true, AdminFilter: '(cn=dev*)'}});

        // # Log in with an LDAP account matching the admin filter
        await loginFromPage(pw, ldapUsers.admin);

        // * Verify the LDAP user can open the System Console
        await pw.loginPage.page.goto('/admin_console');
        await expect(pw.loginPage.page.getByText('System Console', {exact: true})).toBeVisible();
    });

    /**
     * @objective Verify a member excluded by the LDAP user filter cannot log in
     */
    test('Invalid login with user filter', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient} = await pw.getAdminClient();
        await adminClient.patchConfig({LdapSettings: {UserFilter: '(cn=no_users)'}});
        await expect
            .poll(async () => (await adminClient.getConfig()).LdapSettings.UserFilter, {
                timeout: duration.half_min,
            })
            .toBe('(cn=no_users)');

        // # Attempt LDAP login with a filtered member
        await loginFromPage(pw, ldapUsers.member);

        // * Verify login is rejected
        await expect(pw.loginPage.loginRejectionMessage).toBeVisible({timeout: duration.half_min});
    });

    /**
     * @objective Verify a guest excluded by both LDAP filters cannot log in
     */
    test('Invalid login with guest filter', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient} = await pw.getAdminClient();
        await adminClient.patchConfig({
            LdapSettings: {UserFilter: '(cn=no_users)', GuestFilter: '(cn=no_guests)'},
        });
        await expect
            .poll(
                async () => {
                    const config = await adminClient.getConfig();
                    return [config.LdapSettings.UserFilter, config.LdapSettings.GuestFilter];
                },
                {timeout: duration.half_min},
            )
            .toEqual(['(cn=no_users)', '(cn=no_guests)']);

        // # Attempt LDAP login with a filtered guest
        await loginFromPage(pw, ldapUsers.guest);

        // * Verify login is rejected
        await expect(pw.loginPage.loginRejectionMessage).toBeVisible({timeout: duration.half_min});
    });

    /**
     * @objective Verify the LDAP connection test reports success
     */
    test('MM-T2699 Connection test button - Successful', {tag: '@ldap'}, async ({pw}) => {
        const {adminUser} = await pw.getAdminClient();
        const {page} = await pw.testBrowser.login(adminUser!);
        const consolePage = new EnterpriseSystemConsolePage(page);
        await consolePage.gotoLdap();

        // # Test the configured LDAP connection
        await page.getByRole('button', {name: /test connection/i}).click();

        // * Verify a successful result
        await expect(page.getByText(/test connection successful/i)).toBeVisible();
        await expect(page.getByTitle(/success icon/i)).toBeVisible();
    });

    /**
     * @objective Verify Username Attribute is required in LDAP settings
     */
    test('MM-T2700 LDAP username required', {tag: '@ldap'}, async ({pw}) => {
        const {adminUser} = await pw.getAdminClient();
        const {page} = await pw.testBrowser.login(adminUser!);
        const consolePage = new EnterpriseSystemConsolePage(page);
        await consolePage.gotoLdap();

        // # Clear Username Attribute and save
        await page.getByLabel(/username attribute:/i).fill('');
        await page.getByRole('button', {name: 'Save', exact: true}).click();

        // * Verify required-field validation
        await expect(page.getByText('AD/LDAP field "Username Attribute" is required.')).toBeVisible();

        // # Restore the configured value
        await page.getByLabel(/username attribute:/i).fill('uid');
        await page.getByRole('button', {name: 'Save', exact: true}).click();
    });

    /**
     * @objective Verify Login ID Attribute is required in LDAP settings
     */
    test('MM-T2701 LDAP LoginidAttribute required', {tag: '@ldap'}, async ({pw}) => {
        const {adminUser} = await pw.getAdminClient();
        const {page} = await pw.testBrowser.login(adminUser!);
        const consolePage = new EnterpriseSystemConsolePage(page);
        await consolePage.gotoLdap();

        // # Clear Login ID Attribute and save
        await page.getByTestId('LdapSettings.LoginIdAttributeinput').fill('');
        await page.getByRole('button', {name: 'Save', exact: true}).click();

        // * Verify required-field validation
        await expect(page.getByText(/ad\/ldap field "login id attribute" is required./i)).toBeVisible();
    });
});
