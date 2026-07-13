// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect, test} from '@mattermost/playwright-lib';

import {getAsset} from '../../../../asset';

/**
 * @objective Verify Up skips a channel system message and edits the preceding user post.
 */
test(
    'MM-T1265 Up skips a system message when editing the previous post',
    {tag: '@keyboard_shortcuts'},
    async ({pw}) => {
        const message = `Previous regular message ${pw.random.id()}`;
        const newHeader = `Updated header ${pw.random.id()}`;
        const {adminClient, user, userClient, team} = await pw.initSetup();
        const offTopic = await userClient.getChannelByName(team.id, 'off-topic');

        // # Post a regular message, then update the channel header to create a system message
        const {channelsPage, page} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, offTopic.name);
        await channelsPage.toBeVisible();
        await channelsPage.postMessage(message);
        await adminClient.patchChannel(offTopic.id, {header: newHeader});
        await channelsPage.centerView.waitUntilLastPostContains(newHeader);

        // # Press Up from the center-channel textbox
        await channelsPage.centerView.postCreate.input.focus();
        await page.keyboard.press('ArrowUp');

        // * Verify edit mode opens for the regular message rather than the system message
        await channelsPage.centerView.postEdit.toBeVisible();
        await expect(channelsPage.centerView.postEdit.input).toHaveValue(message);
    },
);

/**
 * @objective Verify a multiline code block can be opened with Up and edited.
 */
test('MM-T1269 Up edits a code block post', {tag: '@keyboard_shortcuts'}, async ({pw}) => {
    const originalMessage = ['```', 'codeblock1', '```'].join('\n');
    const editedMessage = ['```', 'codeblock2', '```'].join('\n');
    const {user, team} = await pw.initSetup();

    // # Post a code block and press Up from the center-channel textbox
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, 'town-square');
    await channelsPage.toBeVisible();
    await channelsPage.postMessage(originalMessage);
    await channelsPage.centerView.postCreate.input.focus();
    await page.keyboard.press('ArrowUp');

    // # Replace the code block and save the edit
    await channelsPage.centerView.postEdit.toBeVisible();
    await channelsPage.centerView.postEdit.writeMessage(editedMessage);
    await channelsPage.centerView.postEdit.sendMessage();

    // * Verify the edited code block is displayed
    const editedPost = await channelsPage.getLastPost();
    await editedPost.toContainText('codeblock2');
    await editedPost.toNotContainText('codeblock1');
});

/**
 * @objective Verify Up can edit an attachment-only post, preserving its file and adding an edited indicator.
 */
test('MM-T1270 Up edits an attachment-only post', {tag: '@keyboard_shortcuts'}, async ({pw}) => {
    const filename = 'mattermost.png';
    const editedMessage = 'Test';
    const {user, team} = await pw.initSetup();

    // # Upload and send an attachment without entering message text
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, 'town-square');
    await channelsPage.toBeVisible();
    const uploadResponse = page.waitForResponse(
        (response) =>
            response.url().includes('/api/v4/files') &&
            response.request().method() === 'POST' &&
            response.status() >= 200 &&
            response.status() < 300,
    );
    page.once('filechooser', async (fileChooser) => {
        await fileChooser.setFiles(getAsset(filename));
    });
    await channelsPage.centerView.postCreate.attachmentButton.click();
    await channelsPage.centerView.postCreate.waitUntilFilePreviewContains([filename]);
    await uploadResponse;
    await expect(channelsPage.centerView.postCreate.sendMessageButton).toBeEnabled();
    await channelsPage.centerView.postCreate.sendMessageButton.click();

    // * Verify the attachment-only post has no edited indicator
    const post = await channelsPage.getLastPost();
    const postId = await post.getId();
    await expect(post.container.getByLabel(`file thumbnail ${filename}`)).toBeVisible();
    await expect(channelsPage.centerView.editedPostIcon(postId)).not.toBeVisible();

    // # Press Up, add text, and save the edit
    await channelsPage.centerView.postCreate.input.focus();
    await page.keyboard.press('ArrowUp');
    await channelsPage.centerView.postEdit.toBeVisible();
    await channelsPage.centerView.postEdit.writeMessage(editedMessage);
    await channelsPage.centerView.postEdit.sendMessage();

    // * Verify the text, attachment, and edited indicator are displayed
    const editedPost = await channelsPage.getLastPost();
    await editedPost.toContainText(editedMessage);
    await expect(editedPost.container.getByLabel(`file thumbnail ${filename}`)).toBeVisible();
    await expect(channelsPage.centerView.editedPostIcon(postId)).toBeVisible();
});

/**
 * @objective Verify clearing all text while editing a post without attachments prompts for deletion and deletes it.
 */
test('MM-T1271_1 Up deletes a text-only post when its edit is cleared', {tag: '@keyboard_shortcuts'}, async ({pw}) => {
    const message = `Message to be deleted ${pw.random.id()}`;
    const {user, team} = await pw.initSetup();

    // # Post a message, press Up, and clear its edit
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, 'town-square');
    await channelsPage.toBeVisible();
    await channelsPage.postMessage(message);
    const postMessage = channelsPage.centerView.container.getByText(message, {exact: true});
    await expect(postMessage).toBeVisible();
    await channelsPage.centerView.postCreate.input.focus();
    await page.keyboard.press('ArrowUp');
    await channelsPage.centerView.postEdit.toBeVisible();
    await expect(channelsPage.centerView.postEdit.input).toHaveValue(message);
    await channelsPage.centerView.postEdit.writeMessage('');
    await channelsPage.centerView.postEdit.sendMessage();

    // * Verify a deletion confirmation is shown
    const confirmation = channelsPage.centerView.postEdit.deleteConfirmationDialog;
    await confirmation.toBeVisible();

    // # Confirm deletion
    await confirmation.confirmDeletion();

    // * Verify the post is removed
    await confirmation.notToBeVisible();
    await expect(postMessage).not.toBeVisible();
});

/**
 * @objective Verify clearing all text while editing a post with an attachment preserves the post and file.
 */
test(
    'MM-T1271_2 Up clears text without deleting a post that has an attachment',
    {tag: '@keyboard_shortcuts'},
    async ({pw}) => {
        const message = `Message with attachment ${pw.random.id()}`;
        const filename = 'mattermost.png';
        const {user, team} = await pw.initSetup();

        // # Post a message with an attachment, press Up, and clear its text
        const {channelsPage, page} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, 'town-square');
        await channelsPage.toBeVisible();
        await channelsPage.postMessage(message, [filename]);
        const post = await channelsPage.getLastPost();
        const postId = await post.getId();
        await channelsPage.centerView.postCreate.input.focus();
        await page.keyboard.press('ArrowUp');
        await channelsPage.centerView.postEdit.toBeVisible();
        await channelsPage.centerView.postEdit.writeMessage('');
        await channelsPage.centerView.postEdit.sendMessage();

        // * Verify no deletion confirmation appears and the attachment and edited indicator remain
        await channelsPage.centerView.postEdit.deleteConfirmationDialog.notToBeVisible();
        const editedPost = await channelsPage.getLastPost();
        await expect(editedPost.container.getByLabel(`file thumbnail ${filename}`)).toBeVisible();
        await expect(channelsPage.centerView.editedPostIcon(postId)).toBeVisible();
    },
);

/**
 * @objective Verify clearing a reply opened for editing with Up prompts for deletion and deletes the reply.
 */
test('MM-T1272 Up deletes a reply when its edit is cleared', {tag: '@keyboard_shortcuts'}, async ({pw}) => {
    const message = `Thread root ${pw.random.id()}`;
    const reply = `Reply to delete ${pw.random.id()}`;
    const {user, team} = await pw.initSetup();

    // # Post a root message and reply to it in the right sidebar
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, 'town-square');
    await channelsPage.toBeVisible();
    await channelsPage.postMessage(message);
    const rootPost = await channelsPage.getLastPost();
    await rootPost.openAThread();
    await channelsPage.sidebarRight.postMessage(reply);
    const replyMessage = channelsPage.sidebarRight.container.getByText(reply, {exact: true});
    await expect(replyMessage).toBeVisible();

    // # Focus the reply textbox, press Up, and clear the reply edit
    await channelsPage.sidebarRight.postCreate.input.focus();
    await page.keyboard.press('ArrowUp');
    await channelsPage.sidebarRight.postEdit.toBeVisible();
    await expect(channelsPage.sidebarRight.postEdit.input).toHaveValue(reply);
    await channelsPage.sidebarRight.postEdit.writeMessage('');
    await channelsPage.sidebarRight.postEdit.sendMessage();

    // * Verify a deletion confirmation is shown
    const confirmation = channelsPage.sidebarRight.postEdit.deleteConfirmationDialog;
    await confirmation.toBeVisible();

    // # Confirm deletion
    await confirmation.confirmDeletion();

    // * Verify the reply is removed
    await confirmation.notToBeVisible();
    await expect(replyMessage).not.toBeVisible();
});
