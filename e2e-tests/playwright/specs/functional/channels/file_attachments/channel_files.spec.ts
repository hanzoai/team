// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {ChannelsPage} from '@mattermost/playwright-lib';
import {expect, test} from '@mattermost/playwright-lib';

async function expectFiles(channelsPage: ChannelsPage, files: string[]) {
    await expect(channelsPage.searchResultItems).toHaveCount(files.length);
    for (const [index, file] of files.entries()) {
        await expect(channelsPage.searchResultItems.nth(index).getByText(file, {exact: true})).toBeVisible();
    }
}

async function filterFiles(channelsPage: ChannelsPage, option: string, expectedFiles: string[]) {
    const filesPanel = channelsPage.page.getByRole('region', {name: /^Files /});
    const filterButton = filesPanel.getByRole('button').filter({has: channelsPage.page.getByRole('img')});
    await filterButton.click();
    await filesPanel.getByRole('menu').getByRole('menuitem', {name: option, exact: true}).click();

    await expectFiles(channelsPage, expectedFiles);
    if (expectedFiles.length === 0) {
        await expect(channelsPage.page.getByText('No files found', {exact: true})).toBeVisible();
    }
}

/**
 * @objective Verify channel files can be filtered by each available file type.
 */
test('MM-T4418 filters channel files by type', {tag: '@file_attachments'}, async ({pw}) => {
    const {adminClient, team, user} = await pw.initSetup();
    const channel = await adminClient.getChannelByName(team.id, 'off-topic');
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, channel.name);
    await channelsPage.toBeVisible();

    // # Upload a document followed by an image
    await channelsPage.postMessage('Document attachment', ['sample_text_file.txt']);
    await channelsPage.postMessage('Image attachment', ['vector_image.svg']);

    // # Open the channel files panel
    await channelsPage.page.getByRole('button', {name: 'Channel files'}).click();

    // * Verify all files appear in reverse chronological order by default
    await expectFiles(channelsPage, ['vector_image.svg', 'sample_text_file.txt']);

    // * Verify every file-type filter returns the expected files
    await filterFiles(channelsPage, 'Documents', ['sample_text_file.txt']);
    await filterFiles(channelsPage, 'Spreadsheets', []);
    await filterFiles(channelsPage, 'Presentations', []);
    await filterFiles(channelsPage, 'Code', []);
    await filterFiles(channelsPage, 'Images', ['vector_image.svg']);
    await filterFiles(channelsPage, 'Audio', []);
    await filterFiles(channelsPage, 'Videos', []);
});
