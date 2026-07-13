// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {UserProfile} from '@mattermost/types/users';

import {
    EnterpriseChannelsPage,
    EnterpriseSystemConsolePage,
    getOrLinkLdapGroup,
    getRandomId,
    initializeOpenLdap,
    test,
} from '@mattermost/playwright-lib';

const boardAccount = {
    username: 'board.one',
    password: 'Password1',
    email: 'success+boardone@simulator.amazonses.com',
};

test.describe('LDAP group mentions', () => {
    async function setup(pw: any) {
        await pw.ensureLicense();
        await pw.skipIfNoLicense();
        const {adminClient, adminUser} = await pw.getAdminClient();
        await initializeOpenLdap(adminClient);
        const boardGroup = await getOrLinkLdapGroup(adminClient, 'board');
        await adminClient.patchGroup(boardGroup.id, {allow_reference: false});

        const team = await adminClient.createTeam(await pw.random.team());
        await adminClient.addToTeam(team.id, adminUser.id);
        const offTopic = await adminClient.getChannelByName(team.id, 'off-topic');
        const randomUser = await pw.random.user();
        const regularUser = {
            ...(await adminClient.createUser(randomUser, '', '')),
            password: randomUser.password,
        } as UserProfile;
        await adminClient.addToTeam(team.id, regularUser.id);
        await adminClient.addToChannel(regularUser.id, offTopic.id);

        const {user: authenticatedBoardUser} = await pw.makeClient(boardAccount, {useCache: false});
        if (!authenticatedBoardUser) {
            throw new Error(`Unable to authenticate LDAP user ${boardAccount.username}`);
        }
        const boardUser = {...authenticatedBoardUser, password: boardAccount.password} as UserProfile;
        await adminClient.updateUserRoles(boardUser.id, 'system_user');
        await adminClient
            .getTeamMember(team.id, boardUser.id)
            .catch(() => adminClient.addToTeam(team.id, boardUser.id));
        await adminClient
            .getChannelMember(offTopic.id, boardUser.id)
            .catch(() => adminClient.addToChannel(boardUser.id, offTopic.id));
        await adminClient.savePreferences(boardUser.id, [
            {user_id: boardUser.id, category: 'tutorial_step', name: boardUser.id, value: '999'},
        ]);

        return {adminClient, adminUser, boardGroup, boardUser, regularUser, team};
    }

    async function assertMentionEnabled(
        pw: any,
        user: UserProfile,
        boardUser: UserProfile,
        teamName: string,
        groupName: string,
    ) {
        const {page} = await pw.testBrowser.login(user);
        const channelsPage = new EnterpriseChannelsPage(page);
        await channelsPage.goto(teamName);
        await channelsPage.typeGroupMentionPrefix(groupName.slice(0, -1));
        await channelsPage.assertGroupMentionSuggested(groupName);
        await channelsPage.postGroupMention(groupName);
        await channelsPage.assertMentionIsLinked(groupName);

        const {page: boardPage} = await pw.testBrowser.login(boardUser);
        const boardChannelsPage = new EnterpriseChannelsPage(boardPage);
        await boardChannelsPage.goto(teamName);
        await boardChannelsPage.assertMentionIsHighlighted(groupName);
    }

    async function assertMentionDisabled(
        pw: any,
        user: UserProfile,
        boardUser: UserProfile,
        teamName: string,
        groupName: string,
    ) {
        const {page} = await pw.testBrowser.login(user);
        const channelsPage = new EnterpriseChannelsPage(page);
        await channelsPage.goto(teamName);
        await channelsPage.typeGroupMentionPrefix(groupName.slice(0, -1));
        await channelsPage.assertGroupMentionNotSuggested();
        await channelsPage.postGroupMention(groupName);
        await channelsPage.assertMentionIsPlainText(groupName);

        const {page: boardPage} = await pw.testBrowser.login(boardUser);
        const boardChannelsPage = new EnterpriseChannelsPage(boardPage);
        await boardChannelsPage.goto(teamName);
        await boardChannelsPage.assertMentionIsPlainText(groupName);
    }

    async function enableMention(adminClient: any, groupId: string, groupName: string) {
        await adminClient.patchGroup(groupId, {allow_reference: true, name: groupName});
    }

    async function openChannel(
        pw: any,
        user: UserProfile,
        teamName: string,
        channelName: string,
        messageRoute = false,
    ) {
        const {page} = await pw.testBrowser.login(user);
        const channelsPage = new EnterpriseChannelsPage(page);
        if (messageRoute) {
            await channelsPage.gotoMessage(teamName, channelName);
        } else {
            await channelsPage.goto(teamName, channelName);
        }
        return channelsPage;
    }

    async function configureMentionPermissions(
        pw: any,
        adminUser: UserProfile,
        permissions: Parameters<EnterpriseSystemConsolePage['setGroupMentionPermissions']>[0],
    ) {
        const {page} = await pw.testBrowser.login(adminUser);
        const consolePage = new EnterpriseSystemConsolePage(page);
        await consolePage.gotoSystemScheme();
        await consolePage.setGroupMentionPermissions(permissions);
    }

    async function resetMentionPermissions(pw: any, adminUser: UserProfile) {
        const {page} = await pw.testBrowser.login(adminUser);
        const consolePage = new EnterpriseSystemConsolePage(page);
        await consolePage.gotoSystemScheme();
        await consolePage.resetSystemScheme();
    }

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

    /**
     * @objective Verify an unlinked LDAP group is neither suggested nor rendered as an active group mention
     */
    test('MM-T2447 excludes an unlinked LDAP group from group mentions', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, boardGroup, regularUser, team} = await setup(pw);
        const groupName = `board-test-${getRandomId()}`;
        await enableMention(adminClient, boardGroup.id, groupName);
        await adminClient.unlinkLdapGroup(boardGroup.remote_id);
        const channel = await adminClient.createPublicChannel(team.id, 'Group Mentions');
        await adminClient.addToChannel(regularUser.id, channel.id);
        const channelsPage = await openChannel(pw, regularUser, team.name, channel.name);

        // # Type and post the former group mention after unlinking the LDAP group
        await channelsPage.typeGroupMentionPrefix(groupName);
        await channelsPage.assertGroupMentionNotSuggested();
        await channelsPage.postGroupMention(groupName);

        // * Verify the unlinked mention remains plain text
        await channelsPage.assertMentionIsPlainText(groupName);
    });

    /**
     * @objective Verify an enabled LDAP group mention is suggested and linked in a direct message without highlighting
     */
    test('MM-T2460 renders group mentions in direct messages without highlighting', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, adminUser, boardGroup, regularUser, team} = await setup(pw);
        const groupName = `board-test-${getRandomId()}`;
        await enableMention(adminClient, boardGroup.id, groupName);
        const {client: regularClient} = await pw.makeClient(regularUser);
        const directChannel = await regularClient.createDirectChannel([regularUser.id, adminUser.id]);
        const channelsPage = await openChannel(pw, regularUser, team.name, directChannel.name, true);

        // # Suggest and post the group mention in a direct message
        await channelsPage.typeGroupMentionPrefix(groupName);
        await channelsPage.assertGroupMentionSuggested(groupName);
        await channelsPage.postGroupMention(groupName);

        // * Verify the mention is linked and no membership warning is displayed
        await channelsPage.assertMentionIsLinked(groupName);
        await channelsPage.assertMentionIsNotHighlighted(groupName);
        await channelsPage.assertNoGroupMentionSystemMessage();
    });

    /**
     * @objective Verify an enabled LDAP group mention is suggested and linked in a group message without highlighting
     */
    test('MM-T2461 renders group mentions in group messages without highlighting', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, adminUser, boardGroup, boardUser, regularUser, team} = await setup(pw);
        const groupName = `board-test-${getRandomId()}`;
        await enableMention(adminClient, boardGroup.id, groupName);
        const {client: regularClient} = await pw.makeClient(regularUser);
        const groupChannel = await regularClient.createGroupChannel([regularUser.id, adminUser.id, boardUser.id]);
        const channelsPage = await openChannel(pw, regularUser, team.name, groupChannel.name, true);

        // # Suggest and post the group mention in a group message
        await channelsPage.typeGroupMentionPrefix(groupName);
        await channelsPage.assertGroupMentionSuggested(groupName);
        await channelsPage.postGroupMention(groupName);

        // * Verify the mention is linked and no membership warning is displayed
        await channelsPage.assertMentionIsLinked(groupName);
        await channelsPage.assertMentionIsNotHighlighted(groupName);
        await channelsPage.assertNoGroupMentionSystemMessage();
    });

    /**
     * @objective Verify a group-constrained channel does not notify members of an unrelated LDAP group
     */
    test('MM-T2443 limits group mentions in a group-synchronized channel', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, boardGroup, boardUser, team} = await setup(pw);
        const developersGroup = await getOrLinkLdapGroup(adminClient, 'developers');
        const boardGroupName = `board-test-${getRandomId()}`;
        const developersGroupName = `developers-test-${getRandomId()}`;
        await enableMention(adminClient, boardGroup.id, boardGroupName);
        await enableMention(adminClient, developersGroup.id, developersGroupName);
        const channel = await adminClient.createPrivateChannel(team.id, 'Group Mentions Synced');
        await adminClient.linkGroupSyncable(boardGroup.id, channel.id, 'channel', {auto_add: true});
        await adminClient.patchChannel(channel.id, {group_constrained: true});
        await adminClient.addToChannel(boardUser.id, channel.id);
        const {user: developer} = await pw.makeClient({username: 'dev.one', password: 'Password1'}, {useCache: false});
        if (!developer) {
            throw new Error('Unable to authenticate LDAP user dev.one');
        }
        await adminClient.addToTeam(team.id, developer.id);
        const channelsPage = await openChannel(pw, boardUser, team.name, channel.name);

        // # Post a mention for a group that is not linked to the constrained channel
        await channelsPage.postGroupMention(developersGroupName);

        // * Verify the post is rendered without an out-of-channel membership prompt
        await channelsPage.assertNoGroupMentionSystemMessage();
    });

    /**
     * @objective Verify Channel Admin group-mention permission controls suggestions, rendering, and member prompts
     */
    test('MM-T2450 controls Channel Admin group mentions with role permissions', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, adminUser, boardGroup, boardUser, regularUser, team} = await setup(pw);
        const groupName = `board-test-${getRandomId()}`;
        await enableMention(adminClient, boardGroup.id, groupName);
        const {client: regularClient} = await pw.makeClient(regularUser);
        const channel = await regularClient.createPublicChannel(team.id, 'Group Mention Channel Admin');

        try {
            // # Disable group mentions for members and Channel Admins
            await resetMentionPermissions(pw, adminUser);
            await configureMentionPermissions(pw, adminUser, [
                {id: 'all_users-posts-use_group_mentions-checkbox', enabled: false},
                {id: 'channel_admin-posts-use_group_mentions-checkbox', enabled: false},
            ]);
            let channelsPage = await openChannel(pw, regularUser, team.name, channel.name);
            await channelsPage.typeGroupMentionPrefix(groupName);
            await channelsPage.assertGroupMentionNotSuggested();
            await channelsPage.postGroupMention(groupName);
            await channelsPage.assertMentionIsPlainText(groupName);

            // # Enable group mentions for Channel Admins
            await configureMentionPermissions(pw, adminUser, [
                {id: 'channel_admin-posts-use_group_mentions-checkbox', enabled: true},
            ]);
            channelsPage = await openChannel(pw, regularUser, team.name, channel.name);
            await channelsPage.typeGroupMentionPrefix(groupName);
            await channelsPage.assertGroupMentionSuggested(groupName);
            await channelsPage.postGroupMention(groupName);

            // * Verify the enabled mention offers to add the out-of-channel group member
            await channelsPage.assertOutOfChannelMentionMessage(boardUser.username, true);
        } finally {
            await resetMentionPermissions(pw, adminUser);
        }
    });

    /**
     * @objective Verify Team Admin group-mention permission controls suggestions, rendering, and no-team-member messages
     */
    test('MM-T2451 controls Team Admin group mentions with role permissions', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, adminUser, boardGroup, regularUser} = await setup(pw);
        const groupName = `board-test-${getRandomId()}`;
        await enableMention(adminClient, boardGroup.id, groupName);
        const {client: regularClient} = await pw.makeClient(regularUser);
        const team = await regularClient.createTeam(await pw.random.team());
        const channel = await regularClient.createPublicChannel(team.id, 'Group Mention Team Admin');

        try {
            // # Disable group mentions for members, Channel Admins, and Team Admins
            await resetMentionPermissions(pw, adminUser);
            await configureMentionPermissions(pw, adminUser, [
                {id: 'all_users-posts-use_group_mentions-checkbox', enabled: false},
                {id: 'channel_admin-posts-use_group_mentions-checkbox', enabled: false},
                {id: 'team_admin-posts-use_group_mentions-checkbox', enabled: false},
            ]);
            let channelsPage = await openChannel(pw, regularUser, team.name, channel.name);
            await channelsPage.typeGroupMentionPrefix(groupName);
            await channelsPage.assertGroupMentionNotSuggested();
            await channelsPage.postGroupMention(groupName);
            await channelsPage.assertMentionIsPlainText(groupName);

            // # Enable group mentions for Team Admins
            await configureMentionPermissions(pw, adminUser, [
                {id: 'team_admin-posts-use_group_mentions-checkbox', enabled: true},
            ]);
            channelsPage = await openChannel(pw, regularUser, team.name, channel.name);
            await channelsPage.typeGroupMentionPrefix(groupName);
            await channelsPage.assertGroupMentionSuggested(groupName);
            await channelsPage.postGroupMention(groupName);

            // * Verify the enabled mention reports that the group has no team members
            await channelsPage.assertGroupHasNoTeamMembers(groupName);
            await channelsPage.assertMentionIsLinked(groupName);
            await channelsPage.assertMentionIsNotHighlighted(groupName);
        } finally {
            await resetMentionPermissions(pw, adminUser);
        }
    });

    /**
     * @objective Verify Guest group-mention permission controls suggestions, rendering, and invitation availability
     */
    test('MM-T2452 controls Guest group mentions with role permissions', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, adminUser, boardGroup, boardUser, team} = await setup(pw);
        await adminClient.patchConfig({GuestAccountsSettings: {Enable: true}});
        const groupName = `board-test-${getRandomId()}`;
        await enableMention(adminClient, boardGroup.id, groupName);
        const channel = await adminClient.createPublicChannel(team.id, 'Group Mention Guest');
        const randomGuest = await pw.random.user();
        const guest = {
            ...(await adminClient.createUser(randomGuest, '', '')),
            password: randomGuest.password,
        } as UserProfile;
        await adminClient.addToTeam(team.id, guest.id);
        await adminClient.addToChannel(guest.id, channel.id);
        await adminClient.demoteUserToGuest(guest.id);

        try {
            // # Verify member and Guest group mentions are disabled
            await resetMentionPermissions(pw, adminUser);
            const {page} = await pw.testBrowser.login(adminUser);
            const consolePage = new EnterpriseSystemConsolePage(page);
            await consolePage.gotoSystemScheme();
            await consolePage.setGroupMentionPermissions([
                {id: 'all_users-posts-use_group_mentions-checkbox', enabled: false},
                {id: 'guests-guest_use_group_mentions-checkbox', enabled: false},
            ]);
            await consolePage.assertGroupMentionPermissionsDisabled(
                'all_users-posts-use_group_mentions-checkbox',
                'guests-guest_use_group_mentions-checkbox',
            );
            let channelsPage = await openChannel(pw, guest, team.name, channel.name);
            await channelsPage.typeGroupMentionPrefix(groupName);
            await channelsPage.assertGroupMentionNotSuggested();
            await channelsPage.postGroupMention(groupName);
            await channelsPage.assertMentionIsPlainText(groupName);

            // # Enable group mentions for Guests
            await configureMentionPermissions(pw, adminUser, [
                {id: 'guests-guest_use_group_mentions-checkbox', enabled: true},
            ]);
            channelsPage = await openChannel(pw, guest, team.name, channel.name);
            await channelsPage.typeGroupMentionPrefix(groupName);
            await channelsPage.assertGroupMentionSuggested(groupName);
            await channelsPage.postGroupMention(groupName);

            // * Verify the Guest sees the warning without an option to invite the group member
            await channelsPage.assertOutOfChannelMentionMessage(boardUser.username, false);
        } finally {
            await resetMentionPermissions(pw, adminUser);
        }
    });

    /**
     * @objective Verify a member can invite an LDAP group member who belongs to the team but not the channel
     */
    test(
        'MM-T2456 offers to add group members who are in the team but not the channel',
        {tag: '@ldap'},
        async ({pw}) => {
            const {adminClient, boardGroup, boardUser, regularUser, team} = await setup(pw);
            const groupName = `board-test-${getRandomId()}`;
            await enableMention(adminClient, boardGroup.id, groupName);
            const {client: regularClient} = await pw.makeClient(regularUser);
            const channel = await regularClient.createPublicChannel(team.id, 'Group Mention Team Member');
            const channelsPage = await openChannel(pw, regularUser, team.name, channel.name);

            // # Mention the group whose member is outside the channel
            await channelsPage.postGroupMention(groupName);

            // * Verify the member warning includes an option to add them to the channel
            await channelsPage.assertOutOfChannelMentionMessage(boardUser.username, true);
        },
    );

    /**
     * @objective Verify mentioning an LDAP group with no members on the current team reports that condition
     */
    test('MM-T2457 reports when a mentioned group has no members on the team', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, boardGroup} = await setup(pw);
        const groupName = `board-test-${getRandomId()}`;
        await enableMention(adminClient, boardGroup.id, groupName);
        const team = await adminClient.createTeam(await pw.random.team());
        const randomUser = await pw.random.user();
        const user = {
            ...(await adminClient.createUser(randomUser, '', '')),
            password: randomUser.password,
        } as UserProfile;
        await adminClient.addToTeam(team.id, user.id);
        const channel = await adminClient.createPublicChannel(team.id, 'Group Mention No Team Members');
        await adminClient.addToChannel(user.id, channel.id);
        const channelsPage = await openChannel(pw, user, team.name, channel.name);

        // # Mention the LDAP group from a team with no group members
        await channelsPage.postGroupMention(groupName);

        // * Verify the no-team-members message and non-highlighted rendering
        await channelsPage.assertGroupHasNoTeamMembers(groupName);
        await channelsPage.assertMentionIsLinked(groupName);
        await channelsPage.assertMentionIsNotHighlighted(groupName);
    });

    /**
     * @objective Verify Guests cannot invite out-of-channel LDAP group members from a group mention warning
     */
    test('MM-T2458 hides the add-member option from Guests using group mentions', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, adminUser, boardGroup, boardUser, team} = await setup(pw);
        await adminClient.patchConfig({GuestAccountsSettings: {Enable: true}});
        const groupName = `board-test-${getRandomId()}`;
        await enableMention(adminClient, boardGroup.id, groupName);
        const channel = await adminClient.createPublicChannel(team.id, 'Group Mention Guest Warning');
        const randomGuest = await pw.random.user();
        const guest = {
            ...(await adminClient.createUser(randomGuest, '', '')),
            password: randomGuest.password,
        } as UserProfile;
        await adminClient.addToTeam(team.id, guest.id);
        await adminClient.addToChannel(guest.id, channel.id);
        await adminClient.demoteUserToGuest(guest.id);

        try {
            await resetMentionPermissions(pw, adminUser);
            await configureMentionPermissions(pw, adminUser, [
                {id: 'guests-guest_use_group_mentions-checkbox', enabled: true},
            ]);
            const channelsPage = await openChannel(pw, guest, team.name, channel.name);

            // # Mention the group as a Guest
            await channelsPage.postGroupMention(groupName);

            // * Verify the warning is shown without an add-member link
            await channelsPage.assertOutOfChannelMentionMessage(boardUser.username, false);
        } finally {
            await resetMentionPermissions(pw, adminUser);
        }
    });

    /**
     * @objective Verify users without Manage Members permission cannot invite out-of-channel LDAP group members
     */
    test('MM-T2459 hides the add-member option when Manage Members is disabled', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, boardGroup, boardUser, regularUser, team} = await setup(pw);
        const groupName = `board-test-${getRandomId()}`;
        await enableMention(adminClient, boardGroup.id, groupName);
        const channel = await adminClient.createPublicChannel(team.id, 'Group Mention No Manage Members');
        await adminClient.addToChannel(regularUser.id, channel.id);
        const [channelUserRole] = await adminClient.getRolesByNames(['channel_user']);
        const originalPermissions = channelUserRole.permissions;

        try {
            await adminClient.patchRole(channelUserRole.id, {
                permissions: originalPermissions.filter(
                    (permission: string) => permission !== 'manage_public_channel_members',
                ),
            });
            const channelsPage = await openChannel(pw, regularUser, team.name, channel.name);

            // # Mention the group without Manage Members permission
            await channelsPage.postGroupMention(groupName);

            // * Verify the warning is shown without an add-member link
            await channelsPage.assertOutOfChannelMentionMessage(boardUser.username, false);
        } finally {
            await adminClient.patchRole(channelUserRole.id, {permissions: originalPermissions});
        }
    });
});
