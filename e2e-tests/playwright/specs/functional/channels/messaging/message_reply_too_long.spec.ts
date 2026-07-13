// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect, test} from '@mattermost/playwright-lib';

/**
 * @objective Verify an overlong thread reply shows the character-count warning and is not posted.
 */
test('MM-T106 Webapp: Message too long warning text', {tag: '@messaging'}, async ({pw}) => {
    const {user, team} = await pw.initSetup();
    const validReply = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ';
    const maxReplyLength = 16383;
    const tooLongReply = validReply.repeat(maxReplyLength / validReply.length + 1);

    // # Log in, open Off-Topic, post a root message, and open its thread
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, 'off-topic');
    await channelsPage.toBeVisible();
    await channelsPage.postMessage(`Hello ${pw.random.id()}`);
    const rootPost = await channelsPage.getLastPost();
    await rootPost.reply();
    await channelsPage.sidebarRight.toBeVisible();

    // # Post a valid reply
    await channelsPage.sidebarRight.postMessage(validReply);

    // * Verify no overlong-message warning is shown
    const warningPattern = /Your message is too long\. Character count:/;
    await expect(channelsPage.sidebarRight.postCreate.container.getByText(warningPattern)).not.toBeVisible();

    // # Enter an overlong reply and try to send it
    await channelsPage.sidebarRight.postCreate.input.fill(tooLongReply);
    const warning = channelsPage.sidebarRight.postCreate.container.getByText(
        `Your message is too long. Character count: ${tooLongReply.length}/${maxReplyLength}`,
        {exact: true},
    );

    // * Verify the character-count warning is visible without replacing the reply textbox
    await expect(warning).toBeVisible();
    await expect(channelsPage.sidebarRight.postCreate.input).toBeVisible();
    await channelsPage.sidebarRight.postCreate.input.press('Enter');

    // * Verify the warning remains and the last posted reply is still the valid reply
    await expect(warning).toBeVisible();
    const lastReply = await channelsPage.sidebarRight.getLastPost();
    await lastReply.toContainText(validReply);
});
