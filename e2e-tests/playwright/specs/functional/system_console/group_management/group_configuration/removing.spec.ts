// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {test} from '@mattermost/playwright-lib';

import {saveAndReload, setup} from './support';

test.describe('LDAP group configuration', () => {
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
});
