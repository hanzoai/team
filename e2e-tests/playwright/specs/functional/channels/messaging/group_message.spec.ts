// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect, test} from '@mattermost/playwright-lib';

/**
 * @objective Verify a reaction can be added to a group message post and its action visibility adapts between desktop and mobile layouts.
 */
test('MM-T471 add a reaction to a message in a GM', {tag: '@messaging'}, async ({pw}) => {
    const {adminClient, team, user} = await pw.initSetup();
    const members = await adminClient.createUsers(team.id, 2, 'gm-reaction');
    const groupChannel = await adminClient.createGroupChannel([user.id, ...members.map((member) => member.id)]);

    // # Open the group message and post a message
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.gotoMessage(team.name, groupChannel.name);
    await channelsPage.toBeVisible();
    await channelsPage.postMessage('This is a post');
    const post = await channelsPage.getLastPost();

    // # Open the post reaction picker and choose slightly frowning face
    await post.openReactionPicker();
    await channelsPage.reactionEmojiPicker.clickEmoji('slightly frowning face');

    // * Verify the reaction is visible with a count of one
    const reaction = post.container.getByRole('button', {name: /slightly_frowning_face/i});
    await expect(reaction).toBeVisible();
    await expect(reaction).toContainText('1');
    const addReactionButton = post.container.getByRole('button', {name: 'Add a reaction', exact: true});

    // # Click the channel intro, then focus the message input to clear post focus
    await channelsPage.centerView.channelIntro.click();
    await channelsPage.centerView.postCreate.input.click();

    // * Verify the Add Reaction action is hidden when the desktop post is not hovered
    await expect(addReactionButton).not.toBeVisible();

    // # Hover the post, then focus the message input again
    await post.hover();
    await expect(addReactionButton).toBeVisible();
    await channelsPage.centerView.postCreate.input.click();

    // * Verify the Add Reaction action is hidden again
    await expect(addReactionButton).not.toBeVisible();

    // # Resize the window to a mobile viewport
    await page.setViewportSize({width: 375, height: 667});

    // * Verify the Add Reaction action is visible in the mobile layout
    await expect(addReactionButton).toBeVisible();
});

/**
 * @objective Verify a group message channel header can be added, posts a system message, and updates read state for participants.
 */
test('MM-T472 Add a channel header to a GM', {tag: '@messaging'}, async ({pw}) => {
    const {adminClient, team, user} = await pw.initSetup();
    const members = await adminClient.createUsers(team.id, 3, 'gm-header-add');
    const groupChannel = await adminClient.createGroupChannel([user.id, ...members.map((member) => member.id)]);
    const header = 'peace and progress';

    // # Open the group message
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.gotoMessage(team.name, groupChannel.name);
    await channelsPage.toBeVisible();
    const addHeaderButton = channelsPage.centerView.header.container.getByRole('button', {
        name: 'Add a channel header',
    });

    // * Verify no channel header is set
    await expect(addHeaderButton).not.toBeVisible();

    // # Hover the header, open the header editor, and save a header
    await channelsPage.centerView.header.container.hover();
    await addHeaderButton.click();
    const modalHeading = page.getByRole('heading', {name: /Edit Header for/});
    await expect(modalHeading).toBeVisible();
    const headerInput = page.getByRole('textbox', {
        name: 'Edit the text appearing next to the channel name in the header.',
    });
    await headerInput.fill(header);
    await headerInput.press('Enter');
    await expect(modalHeading).not.toBeVisible();

    // * Verify the header appears and a deletable system message records the update
    await expect(channelsPage.centerView.header.container.getByText(header, {exact: true})).toBeVisible();
    const systemPost = await channelsPage.getLastPost();
    await systemPost.toContainText('updated the channel header');
    await systemPost.hover();
    await systemPost.postMenu.openDotMenu();
    await expect(channelsPage.postDotMenu.deleteMenuItem).toBeVisible();
    await page.keyboard.press('Escape');

    // * Verify the group message remains read for the user who changed the header
    await channelsPage.sidebarLeft.assertItemRead(members[0].username);

    // # Sign in as another group member and view Town Square
    const {channelsPage: memberChannelsPage} = await pw.testBrowser.login(members[0]);
    await memberChannelsPage.goto(team.name, 'town-square');
    await memberChannelsPage.toBeVisible();

    // * Verify the header update marks the group message unread for the other member
    await memberChannelsPage.sidebarLeft.assertItemUnread(user.username);
});

/**
 * @objective Verify an existing group message channel header can be edited and marks the conversation unread for another participant.
 */
test('MM-T473_1 Edit GM channel header', {tag: '@messaging'}, async ({pw}) => {
    const {adminClient, team, user} = await pw.initSetup();
    const members = await adminClient.createUsers(team.id, 3, 'gm-header-edit');
    const groupChannel = await adminClient.createGroupChannel([user.id, ...members.map((member) => member.id)]);
    await adminClient.patchChannel(groupChannel.id, {header: 'peace and progress'});
    const header = 'In pursuit of peace and progress';

    // # Open the group message with an existing header
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.gotoMessage(team.name, groupChannel.name);
    await channelsPage.toBeVisible();

    // * Verify the add-header action is absent because a header is already set
    await expect(
        channelsPage.centerView.header.container.getByRole('button', {name: 'Add a channel header'}),
    ).toHaveCount(0);

    // # Open the channel menu, choose Edit Header, and save the replacement
    await channelsPage.centerView.header.openChannelMenu();
    await page.getByRole('menuitem', {name: 'Settings'}).hover();
    await page.getByRole('menuitem', {name: 'Edit Header'}).click();
    const modalHeading = page.getByRole('heading', {name: /Edit Header for/});
    await expect(modalHeading).toBeVisible();
    const headerInput = page.getByRole('textbox', {
        name: 'Edit the text appearing next to the channel name in the header.',
    });
    await headerInput.fill(header);
    await headerInput.press('Enter');
    await expect(modalHeading).not.toBeVisible();

    // * Verify the new header appears and a system message records the update
    await expect(channelsPage.centerView.header.container.getByText(header, {exact: true})).toBeVisible();
    await (await channelsPage.getLastPost()).toContainText('updated the channel header');

    // # Sign in as another group member and view Town Square
    const {channelsPage: memberChannelsPage} = await pw.testBrowser.login(members[0]);
    await memberChannelsPage.goto(team.name, 'town-square');
    await memberChannelsPage.toBeVisible();

    // * Verify the edit marks the group message unread for the other member
    await memberChannelsPage.sidebarLeft.assertItemUnread(user.username);
});

/**
 * @objective Verify a username mention in a group message channel header renders as a link without highlighting the current user.
 */
test('MM-T473_2 Edit GM channel header with a mention', {tag: '@messaging'}, async ({pw}) => {
    const {adminClient, team, user} = await pw.initSetup();
    const members = await adminClient.createUsers(team.id, 3, 'gm-header-mention');
    const groupChannel = await adminClient.createGroupChannel([user.id, ...members.map((member) => member.id)]);
    await adminClient.patchChannel(groupChannel.id, {header: 'peace and progress'});
    const header = `In pursuit of peace and progress by @${user.username}`;

    // # Open the group message and edit the existing header
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.gotoMessage(team.name, groupChannel.name);
    await channelsPage.toBeVisible();
    await channelsPage.centerView.header.openChannelMenu();
    await page.getByRole('menuitem', {name: 'Settings'}).hover();
    await page.getByRole('menuitem', {name: 'Edit Header'}).click();
    const headerInput = page.getByRole('textbox', {
        name: 'Edit the text appearing next to the channel name in the header.',
    });
    await headerInput.fill(header);
    await page.getByRole('button', {name: 'Save', exact: true}).click();
    await expect(page.getByRole('heading', {name: /Edit Header for/})).not.toBeVisible();

    // * Verify the mention is a link in the header and is not highlighted for the mentioned user
    const mention = channelsPage.centerView.header.container.locator('.mention-link');
    await expect(mention).toBeVisible();
    await expect(mention).toHaveText(`@${user.username}`);
    await expect(mention).not.toHaveClass(/mention--highlight/);
});
