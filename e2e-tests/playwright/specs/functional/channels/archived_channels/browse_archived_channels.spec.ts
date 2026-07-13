// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect, test} from '@mattermost/playwright-lib';

/**
 * @objective Verify Browse Channels offers an archived-channel filter and opens an archived public channel.
 */
test('MM-T1697 MM-T1703 browses and opens an archived public channel', {tag: '@channels'}, async ({pw}) => {
    // # Create a public channel and add the test user
    const {adminClient, team, user} = await pw.initSetup();
    const channel = await adminClient.createPublicChannel(team.id, `Archive Browse ${pw.random.id()}`);
    await adminClient.addToChannel(user.id, channel.id);

    // # Log in, open the channel, and archive it
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, channel.name);
    await channelsPage.toBeVisible();
    await channelsPage.archiveChannel();

    // # Open Browse Channels and choose the archived-channel filter
    const dialog = await channelsPage.openBrowseChannelsModal();
    await dialog.container.getByRole('button', {name: 'Channel type filter'}).click();
    await page.getByRole('menuitem', {name: 'Archived channels'}).click();

    // * Verify the filter changes to Archived and the archived channel is listed
    await expect(dialog.container.getByRole('button', {name: 'Channel type filter'})).toContainText(
        'Channel Type: Archived',
    );
    await dialog.fillSearchInput(channel.display_name);
    await dialog.toBeDoneLoading();
    await expect(dialog.results.getByText(channel.display_name, {exact: true})).toBeVisible();

    // # Open the archived channel from the results
    await dialog.results.getByText(channel.display_name, {exact: true}).click();

    // * Verify the archived channel opens
    await expect(page).toHaveURL(new RegExp(`/${team.name}/channels/${channel.name}$`));
    await channelsPage.centerView.header.toHaveTitle(channel.display_name);
    await expect(channelsPage.archivedChannelMessage).toBeVisible();
});
