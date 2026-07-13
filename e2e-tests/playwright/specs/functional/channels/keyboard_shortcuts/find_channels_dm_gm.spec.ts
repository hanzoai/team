// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect, test} from '@mattermost/playwright-lib';

/**
 * @objective Verify Ctrl/Cmd+K can search for and open a direct message by @username, a group message
 * with the mouse, and a public channel.
 *
 * MM-T1245 and MM-T1246 overlap the group-message and direct-message portions of MM-T1247, so the
 * three keys share one setup while retaining each original Cypress interaction and assertion.
 */
test(
    'MM-T1245 MM-T1246 MM-T1247 finds and opens direct messages, group messages, and channels with CTRL/CMD+K',
    {tag: '@keyboard_shortcuts'},
    async ({pw}) => {
        const {adminClient, team, user} = await pw.initSetup();
        const [member1, member2] = await adminClient.createUsers(team.id, 2, 'switch');

        // # Create a direct message, a group message, and a public channel for the test user
        const directMessage = await adminClient.createDirectChannel([user.id, member1.id]);
        await adminClient.createPost({
            channel_id: directMessage.id,
            user_id: member1.id,
            message: 'Direct message for quick switch',
        });
        const groupMessage = await adminClient.createGroupChannel([user.id, member1.id, member2.id]);
        await adminClient.createPost({
            channel_id: groupMessage.id,
            user_id: member2.id,
            message: 'Group message for quick switch',
        });
        const publicChannel = await adminClient.createPublicChannel(team.id, `Switcher ${pw.random.id()}`);
        await adminClient.addToChannel(user.id, publicChannel.id);

        // # Log in and open Town Square
        const {channelsPage, page} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, 'town-square');
        await channelsPage.toBeVisible();
        const {findChannelsModal} = channelsPage;

        // # Open Find Channels and search with @ followed by the start of member1's username
        await page.keyboard.press('ControlOrMeta+K');
        await findChannelsModal.input.fill(`@${member1.username.slice(0, 3)}`);
        const directMessageOption = findChannelsModal.container
            .getByRole('option')
            .filter({hasText: `@${member1.username}`})
            .filter({hasNotText: member2.username})
            .first();
        await directMessageOption.click();

        // * Verify member1's direct-message channel opens
        await expect(page).toHaveURL(new RegExp(`/${team.name}/messages/@${member1.username}$`));
        await channelsPage.centerView.header.toHaveTitle(member1.username);

        // # Reopen Find Channels, search for member2, and click the group-message option with the mouse
        await page.keyboard.press('ControlOrMeta+K');
        await findChannelsModal.input.fill(member2.username);
        const groupMessageOption = findChannelsModal.container
            .getByRole('option')
            .filter({hasText: member2.username})
            .filter({hasText: member1.username})
            .first();
        await groupMessageOption.click();

        // * Verify the group-message intro and both other members are visible
        await expect(channelsPage.centerView.channelIntro).toContainText(
            'This is the start of your group message history with these teammates',
        );
        await channelsPage.centerView.header.toHaveTitle(member1.username);
        await channelsPage.centerView.header.toHaveTitle(member2.username);

        // # Reopen Find Channels, search for the public channel, and click its option
        await page.keyboard.press('ControlOrMeta+K');
        await findChannelsModal.input.fill(publicChannel.display_name);
        await findChannelsModal.container.getByRole('option', {name: new RegExp(publicChannel.display_name)}).click();

        // * Verify the public channel opens
        await channelsPage.centerView.header.toHaveTitle(publicChannel.display_name);
        await expect(page).toHaveURL(new RegExp(`/${team.name}/channels/${publicChannel.name}$`));
    },
);
