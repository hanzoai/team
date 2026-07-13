// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect, test} from '@mattermost/playwright-lib';

/**
 * @objective Verify a selected file can be removed from the message composer before posting.
 */
test('MM-T307 cancels a file upload', {tag: '@file_attachments'}, async ({pw}) => {
    const filename = 'vector_image.svg';
    const {adminClient, team, user} = await pw.initSetup();
    await adminClient.patchConfig({ServiceSettings: {EnableSVGs: true}});

    // # Log in and open Off-Topic
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, 'off-topic');
    await channelsPage.toBeVisible();

    // # Select an image in the center-channel message composer
    const file = pw.getFileFromAsset(filename);
    const fileChooserPromise = page.waitForEvent('filechooser');
    await channelsPage.centerView.postCreate.attachmentButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
        name: filename,
        mimeType: file.type,
        buffer: Buffer.from(await file.arrayBuffer()),
    });
    await channelsPage.centerView.postCreate.waitUntilFilePreviewContains([filename]);

    // * Verify the upload preview shows its thumbnail and filename
    const preview = channelsPage.centerView.postCreate.filePreview;
    await expect(preview).toBeVisible();
    await expect(preview.getByText(filename)).toBeVisible();
    await expect(preview.getByLabel(/file thumbnail/i)).toBeVisible();

    // # Remove the attachment from the upload preview
    await preview.getByTestId('file-preview-remove').click();

    // * Verify the upload preview disappears
    await expect(preview.getByTestId('file-preview-item')).toHaveCount(0);
});
