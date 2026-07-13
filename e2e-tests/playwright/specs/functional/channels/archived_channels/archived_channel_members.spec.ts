// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect, test} from '@mattermost/playwright-lib';

/**
 * @objective Verify the member list of an archived channel is viewable but has no member-management controls.
 *
 * MM-T1719 is an exact duplicate of the existing MM-T1671 scenario and is mapped to this test.
 */
test('MM-T1671 MM-T1719 shows a read-only member list for an archived channel', {tag: '@channels'}, async ({pw}) => {
    // # Create a channel containing the test user and another member
    const {adminClient, adminUser, team, user} = await pw.initSetup();
    const channel = await adminClient.createPublicChannel(team.id, `Archive Members ${pw.random.id()}`);
    await adminClient.addToChannel(user.id, channel.id);
    await adminClient.addToChannel(adminUser.id, channel.id);

    // # Log in, open the channel, and archive it
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, channel.name);
    await channelsPage.toBeVisible();
    await channelsPage.archiveChannel();

    // # Open the archived channel's member list
    await channelsPage.centerView.header.openChannelMenu();
    await page.getByRole('menuitem', {name: 'Members'}).click();
    await channelsPage.sidebarRight.toBeVisible();

    // * Verify the member list contains the other channel member
    await expect(channelsPage.sidebarRight.container.getByText(adminUser.username).first()).toBeVisible();

    // * Verify controls for changing channel roles or membership are unavailable
    await expect(channelsPage.sidebarRight.container.getByRole('button', {name: 'Manage'})).toHaveCount(0);
    await expect(channelsPage.sidebarRight.container.getByRole('button', {name: 'Add'})).toHaveCount(0);
});
