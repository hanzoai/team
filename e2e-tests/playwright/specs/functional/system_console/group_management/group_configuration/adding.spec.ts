// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getRandomId, test} from '@mattermost/playwright-lib';

import {discardAndReload, saveAndReload, setup} from './support';

test.describe('LDAP group configuration', () => {
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
});
