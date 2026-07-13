// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {EnterpriseSystemConsolePage, getRandomId, test} from '@mattermost/playwright-lib';

import {assertMentionDisabled, assertMentionEnabled, boardAccount, setup} from './support';

test.describe('LDAP group mentions', () => {
    /**
     * @objective Verify a custom LDAP group mention can be enabled and disabled
     */
    test('MM-23937 enables and disables a custom LDAP group mention', {tag: '@ldap'}, async ({pw}) => {
        const {adminUser, boardGroup, boardUser, team} = await setup(pw);
        const groupName = `board-test-${getRandomId()}`;

        // # Enable the group mention and assign a custom name in Group Configuration
        const {page} = await pw.testBrowser.login(adminUser);
        const consolePage = new EnterpriseSystemConsolePage(page);
        await consolePage.gotoGroupConfiguration(boardGroup.id, boardAccount.email);
        await consolePage.setGroupMention(true, groupName);

        // * Verify suggestions, links, and member highlighting are enabled
        await assertMentionEnabled(pw, adminUser, boardUser, team.name, groupName);

        // # Disable the group mention in Group Configuration
        const {page: adminPage} = await pw.testBrowser.login(adminUser);
        const adminConsolePage = new EnterpriseSystemConsolePage(adminPage);
        await adminConsolePage.gotoGroupConfiguration(boardGroup.id, boardAccount.email);
        await adminConsolePage.setGroupMention(false);

        // * Verify suggestions, links, and member highlighting are disabled
        await assertMentionDisabled(pw, adminUser, boardUser, team.name, groupName);
    });

    /**
     * @objective Verify the use_group_mentions permission controls whether a member can mention an enabled LDAP group
     */
    test('MM-23937 restricts LDAP group mentions with the group mention permission', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, adminUser, boardGroup, boardUser, regularUser, team} = await setup(pw);
        const groupName = `board-test-${getRandomId()}`;
        await adminClient.patchGroup(boardGroup.id, {allow_reference: true, name: groupName});

        const {page} = await pw.testBrowser.login(adminUser);
        const consolePage = new EnterpriseSystemConsolePage(page);

        try {
            // # Reset the System Scheme to defaults
            await consolePage.gotoSystemScheme();
            await consolePage.resetSystemScheme();

            // * Verify a regular member can mention the enabled group
            await assertMentionEnabled(pw, regularUser, boardUser, team.name, groupName);

            // # Disable Group Mentions for regular members
            const {page: adminPage} = await pw.testBrowser.login(adminUser);
            const adminConsolePage = new EnterpriseSystemConsolePage(adminPage);
            await adminConsolePage.gotoSystemScheme();
            await adminConsolePage.disableGroupMentionsPermission();

            // * Verify the regular member can no longer mention the group
            await assertMentionDisabled(pw, regularUser, boardUser, team.name, groupName);
        } finally {
            const {page: cleanupPage} = await pw.testBrowser.login(adminUser);
            const cleanupConsolePage = new EnterpriseSystemConsolePage(cleanupPage);
            await cleanupConsolePage.gotoSystemScheme();
            await cleanupConsolePage.resetSystemScheme();
        }
    });
});
