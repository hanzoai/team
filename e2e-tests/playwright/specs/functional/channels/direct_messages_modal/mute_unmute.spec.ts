// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect, test} from '@mattermost/playwright-lib';

/**
 * @objective Verify that a direct message can be muted and unmuted from the channel menu.
 */
test('MM-T1536 mutes and unmutes a direct message', {tag: '@direct_messages'}, async ({pw}) => {
    // # Create a direct message with a post from another user
    const {user, team, adminClient} = await pw.initSetup();
    const [otherUser] = await adminClient.createUsers(team.id, 1, 'dm-mute');
    const directChannel = await adminClient.createDirectChannel([user.id, otherUser.id]);
    await adminClient.createPost({
        channel_id: directChannel.id,
        user_id: otherUser.id,
        message: 'Hello',
    });

    // # Log in, open the direct message, and mute it from the channel menu
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, `@${otherUser.username}`);
    await channelsPage.toBeVisible();
    await channelsPage.centerView.header.openChannelMenu();
    await page.getByRole('menuitem', {name: 'Mute', exact: true}).click();

    // * Verify the direct message is muted in the sidebar and the header offers to unmute it
    const directMessageLink = page.getByRole('link', {name: new RegExp(otherUser.username, 'i')});
    await expect(directMessageLink).toHaveClass(/muted/);
    await expect(page.getByRole('button', {name: 'Unmute', exact: true})).toBeVisible();

    // # Unmute the direct message from the channel menu
    await channelsPage.centerView.header.openChannelMenu();
    await page.getByRole('menuitem', {name: 'Unmute', exact: true}).click();

    // * Verify the direct message is no longer muted in the sidebar
    await expect(directMessageLink).not.toHaveClass(/muted/);
});
