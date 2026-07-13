// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect, test} from '@mattermost/playwright-lib';

import {saveAndReload, setup} from './support';

test.describe('LDAP group configuration', () => {
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
