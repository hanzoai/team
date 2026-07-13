// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect, test} from '@mattermost/playwright-lib';

import {saveAndReload, setup} from './support';

test.describe('LDAP group configuration channel roles', () => {
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
