// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect, test} from '@mattermost/playwright-lib';

/**
 * @objective Verify collapsing a link preview is user-specific while removing it removes the preview for other users.
 */
test('MM-T199 Removing a link preview removes it from the views of other users', {tag: '@messaging'}, async ({pw}) => {
    const {adminClient, adminUser, userClient, team, user} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }

    await Promise.all([
        userClient.savePreferences(user.id, [
            {user_id: user.id, category: 'display_settings', name: 'link_previews', value: 'true'},
            {user_id: user.id, category: 'display_settings', name: 'collapse_previews', value: 'false'},
        ]),
        adminClient.savePreferences(adminUser.id, [
            {user_id: adminUser.id, category: 'display_settings', name: 'link_previews', value: 'true'},
            {user_id: adminUser.id, category: 'display_settings', name: 'collapse_previews', value: 'false'},
        ]),
    ]);
    const message = 'https://www.bbc.com/news/uk-wales-45142614';

    // # Log in as the test user, post a link, and wait for its preview
    const {channelsPage: userChannelsPage, page: userPage} = await pw.testBrowser.login(user);
    await userChannelsPage.goto(team.name, 'off-topic');
    await userChannelsPage.toBeVisible();
    const postResponsePromise = userPage.waitForResponse(
        (response) => response.url().endsWith('/api/v4/posts') && response.request().method() === 'POST',
    );
    await userChannelsPage.postMessage(message);
    const postId = ((await (await postResponsePromise).json()) as {id: string}).id;
    const userPost = await userChannelsPage.centerView.getPostById(postId);
    const userPreview = userPost.body.getByRole('link').nth(1);
    const userPreviewImage = userPreview.getByRole('img', {name: /.+/});

    // * Verify the link preview and its image are shown
    await expect(userPreview).toBeVisible({timeout: pw.duration.half_min});
    await expect(userPreviewImage).toBeVisible();

    // # Log in as the other user and visit the same channel
    const {channelsPage: adminChannelsPage, page: adminPage} = await pw.testBrowser.login(adminUser);
    await adminChannelsPage.goto(team.name, 'off-topic');
    await adminChannelsPage.toBeVisible();
    const adminPost = await adminChannelsPage.centerView.getPostById(postId);
    const adminPreview = adminPost.body.getByRole('link').nth(1);
    const adminPreviewImage = adminPreview.getByRole('img', {name: /.+/});

    // * Verify the other user also sees the expanded preview
    await expect(adminPreview).toBeVisible({timeout: pw.duration.half_min});
    await expect(adminPreviewImage).toBeVisible();

    // # Collapse the preview as the test user
    const collapseButton = userPreview.getByRole('button');
    await collapseButton.click();

    // * Verify the preview image is collapsed for the test user
    await expect(userPreview.getByRole('button', {name: 'Show image preview'})).toBeVisible();
    await expect(userPreviewImage).not.toBeVisible();

    // # Reload the channel as the other user
    await adminPage.reload();
    await adminChannelsPage.toBeVisible();

    // * Verify the preview remains expanded for the other user
    await expect(adminPreview).toBeVisible();
    await expect(adminPreviewImage).toBeVisible();

    // # Remove the link preview as the test user
    await userPage.reload();
    await userChannelsPage.toBeVisible();
    await userPreview.hover();
    await userPreview.getByRole('button', {name: 'Remove'}).click();

    // * Verify the preview is removed for the test user
    await expect(userPreview).not.toBeVisible();

    // # Reload the channel as the other user
    await adminPage.reload();
    await adminChannelsPage.toBeVisible();

    // * Verify the preview is also removed for the other user
    await expect(adminPreview).not.toBeVisible();
});
