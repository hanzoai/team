// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    EnterpriseSystemConsolePage,
    expect,
    getOrLinkLdapGroup,
    getRandomId,
    initializeOpenLdap,
    test,
} from '@mattermost/playwright-lib';

test.describe('LDAP group configuration', () => {
    async function setup(pw: any, teamDisplayName = `AAA Test ${getRandomId()}`) {
        await pw.ensureLicense();
        await pw.skipIfNoLicense();
        const {adminClient, adminUser} = await pw.getAdminClient();
        await initializeOpenLdap(adminClient);
        const group = await getOrLinkLdapGroup(adminClient, 'board');
        const team = await adminClient.createTeam({
            ...(await pw.random.team()),
            display_name: teamDisplayName,
        });
        await adminClient.addToTeam(team.id, adminUser.id);
        const channel = await adminClient.createPublicChannel(team.id, `Group Config ${getRandomId()}`);

        for (const link of await adminClient.getGroupSyncables(group.id, 'team')) {
            await adminClient.unlinkGroupSyncable(group.id, link.team_id, 'team');
        }
        for (const link of await adminClient.getGroupSyncables(group.id, 'channel')) {
            await adminClient.unlinkGroupSyncable(group.id, link.channel_id, 'channel');
        }

        const {page} = await pw.testBrowser.login(adminUser);
        const consolePage = new EnterpriseSystemConsolePage(page);
        await consolePage.gotoGroupConfiguration(group.id);
        await consolePage.assertNoTeamOrChannelMemberships();
        return {adminClient, channel, consolePage, group, team};
    }

    async function saveAndReload(consolePage: EnterpriseSystemConsolePage, groupId: string) {
        await consolePage.saveConfiguration();
        await consolePage.gotoGroupConfiguration(groupId);
    }

    async function discardAndReload(consolePage: EnterpriseSystemConsolePage, groupId: string) {
        await consolePage.attemptToLeaveGroupConfiguration();
        await consolePage.gotoGroupConfiguration(groupId);
    }

    /**
     * @objective Verify an invalid group configuration URL returns to the LDAP groups listing
     */
    test("MM-58840 Groups - can't navigate to invalid URL", {tag: '@ldap'}, async ({pw}) => {
        const {consolePage} = await setup(pw);

        // # Visit a group configuration URL with an invalid group identifier
        // * Verify the LDAP groups listing is displayed
        await consolePage.gotoInvalidGroupConfiguration('invalid');
    });

    /**
     * @objective Verify adding a team without saving does not persist the membership
     */
    test('does not add a team without saving', {tag: '@ldap'}, async ({pw}) => {
        const {consolePage, group, team} = await setup(pw);

        // # Add a team and leave the page without saving
        await consolePage.addTeamOrChannel('Team', team.display_name);
        await discardAndReload(consolePage, group.id);

        // * Verify the team membership was discarded
        await consolePage.assertNoTeamOrChannelMemberships();
    });

    /**
     * @objective Verify adding and saving a team persists the membership without a server error
     */
    test('does add a team when saved', {tag: '@ldap'}, async ({pw}) => {
        const {consolePage, group, team} = await setup(pw);

        // # Add a team and save the group configuration
        await consolePage.addTeamOrChannel('Team', team.display_name);
        await saveAndReload(consolePage, group.id);

        // * Verify the team membership persisted
        await consolePage.assertTeamOrChannelMembership(team.display_name);
    });

    /**
     * @objective Verify the channel selector lists default channels and identifies their team
     */
    test('shows default channels', {tag: '@ldap'}, async ({pw}) => {
        const {consolePage, team} = await setup(pw, `000 Default Channel ${getRandomId()}`);

        // # Search the add-channel selector for default off-topic channels
        // * Verify matching default channels and their team are shown
        await consolePage.assertDefaultChannelsAvailable(team.display_name);
    });

    /**
     * @objective Verify adding a channel without saving does not persist the membership
     */
    test('does not add a channel without saving', {tag: '@ldap'}, async ({pw}) => {
        const {channel, consolePage, group} = await setup(pw);

        // # Add a channel and leave the page without saving
        await consolePage.addTeamOrChannel('Channel', channel.display_name);
        await discardAndReload(consolePage, group.id);

        // * Verify the channel membership was discarded
        await consolePage.assertNoTeamOrChannelMemberships();
    });

    /**
     * @objective Verify adding and saving a channel persists the membership without a server error
     */
    test('does add a channel when saved', {tag: '@ldap'}, async ({pw}) => {
        const {channel, consolePage, group} = await setup(pw);

        // # Add a channel and save the group configuration
        await consolePage.addTeamOrChannel('Channel', channel.display_name);
        await saveAndReload(consolePage, group.id);

        // * Verify the channel membership persisted
        await consolePage.assertTeamOrChannelMembership(channel.display_name);
    });

    /**
     * @objective Verify removing a team without saving leaves the persisted membership intact
     */
    test('does not remove a team without saving', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, consolePage, group, team} = await setup(pw);
        await adminClient.linkGroupSyncable(group.id, team.id, 'team', {auto_add: true});
        await consolePage.gotoGroupConfiguration(group.id);

        // # Remove the team, start to leave, cancel the warning, and reload without saving
        await consolePage.removeTeamOrChannel(team.display_name);
        await consolePage.assertNoTeamOrChannelMemberships();
        await consolePage.attemptToLeaveGroupConfiguration();
        await consolePage.cancelLeavingGroupConfiguration();
        await consolePage.gotoGroupConfiguration(group.id);

        // * Verify the team is still present
        await consolePage.assertTeamOrChannelMembership(team.display_name);
    });

    /**
     * @objective Verify removing and saving a team deletes the membership
     */
    test('does remove a team when saved', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, consolePage, group, team} = await setup(pw);
        await adminClient.linkGroupSyncable(group.id, team.id, 'team', {auto_add: true});
        await consolePage.gotoGroupConfiguration(group.id);

        // # Remove the team, cancel navigation, then save
        await consolePage.removeTeamOrChannel(team.display_name);
        await consolePage.attemptToLeaveGroupConfiguration();
        await consolePage.cancelLeavingGroupConfiguration();
        await saveAndReload(consolePage, group.id);

        // * Verify the team is no longer present
        await consolePage.assertNoTeamOrChannelMemberships();
    });

    /**
     * @objective Verify removing a channel without saving leaves the persisted channel and implied team intact
     */
    test('does not remove a channel without saving', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, channel, consolePage, group} = await setup(pw);
        await adminClient.linkGroupSyncable(group.id, channel.id, 'channel', {auto_add: true});
        await consolePage.gotoGroupConfiguration(group.id);

        // # Remove the channel, cancel the navigation warning, and reload
        await consolePage.removeTeamOrChannel(channel.display_name);
        await consolePage.attemptToLeaveGroupConfiguration();
        await consolePage.cancelLeavingGroupConfiguration();
        await consolePage.gotoGroupConfiguration(group.id);

        // * Verify the channel is still present
        await consolePage.assertTeamOrChannelMembership(channel.display_name);
    });

    /**
     * @objective Verify removing and saving a channel leaves only its implied team membership
     */
    test('does remove a channel when saved', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, channel, consolePage, group, team} = await setup(pw);
        await adminClient.linkGroupSyncable(group.id, channel.id, 'channel', {auto_add: true});
        await consolePage.gotoGroupConfiguration(group.id);
        await consolePage.assertTeamOrChannelMembership(team.display_name);
        await consolePage.assertTeamOrChannelMembership(channel.display_name);

        // # Remove the channel, cancel navigation, then save
        await consolePage.removeTeamOrChannel(channel.display_name);
        await consolePage.attemptToLeaveGroupConfiguration();
        await consolePage.cancelLeavingGroupConfiguration();
        await saveAndReload(consolePage, group.id);

        // * Verify only the implied team remains
        await consolePage.assertTeamOrChannelMembership(team.display_name);
        await consolePage.assertTeamOrChannelMembership(channel.display_name, false);
    });

    /**
     * @objective Verify changing and saving the role for a newly added team persists Team Admin
     */
    test('updates the role for a new team', {tag: '@ldap'}, async ({pw}) => {
        const {consolePage, group, team} = await setup(pw);

        // # Add a team, promote it, cancel navigation, and save
        await consolePage.addTeamOrChannel('Team', team.display_name);
        await consolePage.changeMembershipRole(team.display_name, 'Member', 'Team Admin');
        await consolePage.attemptToLeaveGroupConfiguration();
        await consolePage.cancelLeavingGroupConfiguration();
        await saveAndReload(consolePage, group.id);

        // * Verify Team Admin persisted
        await consolePage.assertMembershipRole(team.display_name, 'Team Admin');
    });

    /**
     * @objective Verify changing and saving the role for an existing team persists Team Admin
     */
    test('updates the role for an existing team', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, consolePage, group, team} = await setup(pw);
        await adminClient.linkGroupSyncable(group.id, team.id, 'team', {auto_add: true});
        await consolePage.gotoGroupConfiguration(group.id);

        // # Promote the existing team, cancel navigation, and save
        await consolePage.changeMembershipRole(team.display_name, 'Member', 'Team Admin');
        await consolePage.attemptToLeaveGroupConfiguration();
        await consolePage.cancelLeavingGroupConfiguration();
        await saveAndReload(consolePage, group.id);

        // * Verify Team Admin persisted
        await consolePage.assertMembershipRole(team.display_name, 'Team Admin');
    });

    /**
     * @objective Verify changing a team role without saving leaves the role as Member
     */
    test('does not update the team role if not saved', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, consolePage, group, team} = await setup(pw);
        await adminClient.linkGroupSyncable(group.id, team.id, 'team', {auto_add: true});
        await consolePage.gotoGroupConfiguration(group.id);

        // # Promote the team and reload after canceling the navigation warning
        await consolePage.changeMembershipRole(team.display_name, 'Member', 'Team Admin');
        await consolePage.attemptToLeaveGroupConfiguration();
        await consolePage.cancelLeavingGroupConfiguration();
        await consolePage.gotoGroupConfiguration(group.id);

        // * Verify the unsaved role change was discarded
        await consolePage.assertMembershipRole(team.display_name, 'Member');
    });

    /**
     * @objective Verify a role change on a removed team is not persisted when the removal is saved
     */
    test('does not update the role of a removed team', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, consolePage, group, team} = await setup(pw);
        await adminClient.linkGroupSyncable(group.id, team.id, 'team', {auto_add: true});
        await consolePage.gotoGroupConfiguration(group.id);

        // # Promote and remove the team, then save
        await consolePage.changeMembershipRole(team.display_name, 'Member', 'Team Admin');
        await consolePage.removeTeamOrChannel(team.display_name);
        await consolePage.attemptToLeaveGroupConfiguration();
        await consolePage.cancelLeavingGroupConfiguration();
        await consolePage.saveConfiguration();

        // * Verify the deleted membership did not retain the administrator role
        const link = await adminClient.getGroupSyncableIncludingDeleted(group.id, team.id, 'team');
        expect(link.delete_at).not.toBe(0);
        expect(link.scheme_admin).toBe(false);
    });

    /**
     * @objective Verify changing and saving the role for a newly added channel persists Channel Admin
     */
    test('updates the role for a new channel', {tag: '@ldap'}, async ({pw}) => {
        const {channel, consolePage, group} = await setup(pw);

        // # Add a channel, promote it, cancel navigation, and save
        await consolePage.addTeamOrChannel('Channel', channel.display_name);
        await consolePage.changeMembershipRole(channel.display_name, 'Member', 'Channel Admin');
        await consolePage.attemptToLeaveGroupConfiguration();
        await consolePage.cancelLeavingGroupConfiguration();
        await saveAndReload(consolePage, group.id);

        // * Verify Channel Admin persisted
        await consolePage.assertMembershipRole(channel.display_name, 'Channel Admin');
    });

    /**
     * @objective Verify changing and saving the role for an existing channel persists Channel Admin
     */
    test('updates the role for an existing channel', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, channel, consolePage, group} = await setup(pw);
        await adminClient.linkGroupSyncable(group.id, channel.id, 'channel', {auto_add: true});
        await consolePage.gotoGroupConfiguration(group.id);

        // # Promote the existing channel, cancel navigation, and save
        await consolePage.changeMembershipRole(channel.display_name, 'Member', 'Channel Admin');
        await consolePage.attemptToLeaveGroupConfiguration();
        await consolePage.cancelLeavingGroupConfiguration();
        await saveAndReload(consolePage, group.id);

        // * Verify Channel Admin persisted
        await consolePage.assertMembershipRole(channel.display_name, 'Channel Admin');
    });

    /**
     * @objective Verify changing a channel role without saving leaves the role as Member
     */
    test('does not update the channel role if not saved', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, channel, consolePage, group} = await setup(pw);
        await adminClient.linkGroupSyncable(group.id, channel.id, 'channel', {auto_add: true});
        await consolePage.gotoGroupConfiguration(group.id);

        // # Promote the channel and reload after canceling the navigation warning
        await consolePage.changeMembershipRole(channel.display_name, 'Member', 'Channel Admin');
        await consolePage.attemptToLeaveGroupConfiguration();
        await consolePage.cancelLeavingGroupConfiguration();
        await consolePage.gotoGroupConfiguration(group.id);

        // * Verify the unsaved role change was discarded
        await consolePage.assertMembershipRole(channel.display_name, 'Member');
    });

    /**
     * @objective Verify a role change on a removed channel is not persisted when the removal is saved
     */
    test('does not update the role of a removed channel', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, channel, consolePage, group} = await setup(pw);
        await adminClient.linkGroupSyncable(group.id, channel.id, 'channel', {auto_add: true});
        await consolePage.gotoGroupConfiguration(group.id);

        // # Promote and remove the channel, then save
        await consolePage.changeMembershipRole(channel.display_name, 'Member', 'Channel Admin');
        await consolePage.removeTeamOrChannel(channel.display_name);
        await consolePage.attemptToLeaveGroupConfiguration();
        await consolePage.cancelLeavingGroupConfiguration();
        await consolePage.saveConfiguration();

        // * Verify the deleted membership did not retain the administrator role
        const link = await adminClient.getGroupSyncableIncludingDeleted(group.id, channel.id, 'channel');
        expect(link.delete_at).not.toBe(0);
        expect(link.scheme_admin).toBe(false);
    });
});
