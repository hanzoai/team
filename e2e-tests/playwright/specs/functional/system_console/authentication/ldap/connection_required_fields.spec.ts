// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SystemConsolePage, test} from '@mattermost/playwright-lib';

import {setupLdap} from './support';

test.describe('LDAP connection and required-field validation', () => {
    test.beforeEach(async ({pw}) => {
        await setupLdap(pw);
    });

    test.afterEach(async ({pw}) => {
        const {adminClient} = await pw.getAdminClient();
        await adminClient.configureOpenLdap();
    });

    /**
     * @objective Verify the LDAP connection test reports success
     */
    test('MM-T2699 Connection test button - Successful', {tag: '@ldap'}, async ({pw}) => {
        const {adminUser} = await pw.getAdminClient();
        const {page} = await pw.testBrowser.login(adminUser!);
        const consolePage = new SystemConsolePage(page);
        await consolePage.ldap.goto();

        // # Test the configured LDAP connection
        await consolePage.ldap.testConnection();

        // * Verify a successful result
        await consolePage.ldap.expectConnectionSuccess();
    });

    /**
     * @objective Verify Username Attribute is required in LDAP settings
     */
    test('MM-T2700 LDAP username required', {tag: '@ldap'}, async ({pw}) => {
        const {adminUser} = await pw.getAdminClient();
        const {page} = await pw.testBrowser.login(adminUser!);
        const consolePage = new SystemConsolePage(page);
        await consolePage.ldap.goto();

        // # Clear Username Attribute and save
        await consolePage.ldap.setUsernameAttribute('');
        await consolePage.ldap.save();

        // * Verify required-field validation
        await consolePage.ldap.expectRequiredFieldError('Username Attribute');

        // # Restore the configured value
        await consolePage.ldap.setUsernameAttribute('uid');
        await consolePage.ldap.save();
    });

    /**
     * @objective Verify Login ID Attribute is required in LDAP settings
     */
    test('MM-T2701 LDAP LoginidAttribute required', {tag: '@ldap'}, async ({pw}) => {
        const {adminUser} = await pw.getAdminClient();
        const {page} = await pw.testBrowser.login(adminUser!);
        const consolePage = new SystemConsolePage(page);
        await consolePage.ldap.goto();

        // # Clear Login ID Attribute and save
        await consolePage.ldap.setLoginIdAttribute('');
        await consolePage.ldap.save();

        // * Verify required-field validation
        await consolePage.ldap.expectRequiredFieldError('Login ID Attribute');
    });
});
