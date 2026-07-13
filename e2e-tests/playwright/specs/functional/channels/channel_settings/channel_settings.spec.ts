// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect, test} from '@mattermost/playwright-lib';

/**
 * @objective Verify existing team members can be added to a public channel and the resulting system post identifies them.
 */
test('MM-T856_1 adds existing users to a public channel from the channel members flow', async ({pw}) => {
    const {adminClient, team, user} = await pw.initSetup();
    const [newMember] = await adminClient.createUsers(team.id, 1, 'channel-member');
    const channel = await adminClient.createPublicChannel(team.id, 'Add Existing Members');
    await adminClient.addToChannel(user.id, channel.id);

    // # Open the channel members flow and search for an existing team member
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, channel.name);
    await channelsPage.toBeVisible();
    await channelsPage.centerView.header.openChannelMenu();
    await page.getByRole('menuitem', {name: 'Members'}).click();
    await page.getByRole('button', {name: 'Add people'}).click();
    const addPeopleDialog = page.getByRole('dialog', {name: `Add people to ${channel.display_name}`});
    await expect(addPeopleDialog).toBeVisible();
    const searchInput = addPeopleDialog.getByRole('combobox', {name: 'Search for people or groups'});
    await searchInput.fill(newMember.username);

    // * Verify the available user is shown with their status indicator
    const userOption = addPeopleDialog.getByText(newMember.username, {exact: true});
    await expect(userOption).toBeVisible();
    await expect(addPeopleDialog.getByRole('img', {name: 'user profile image'})).toBeVisible();

    // # Select the user and add them to the channel
    await userOption.click();
    await addPeopleDialog.getByRole('button', {name: 'Add', exact: true}).click();
    await expect(addPeopleDialog).not.toBeVisible();

    // * Verify the system post identifies the newly added user
    const lastPost = await channelsPage.getLastPost();
    await lastPost.toContainText(`${newMember.username} added to the channel by you`);
});

/**
 * @objective Verify a user who already belongs to a public channel is marked unavailable in the add-people flow.
 */
test('MM-T856_2 prevents adding an existing channel member again', async ({pw}) => {
    const {adminClient, team, user} = await pw.initSetup();
    const channel = await adminClient.createPublicChannel(team.id, 'Existing Channel Member');
    await adminClient.addToChannel(user.id, channel.id);

    // # Open the add-people dialog and search for the current channel member
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, channel.name);
    await channelsPage.toBeVisible();
    await channelsPage.centerView.header.openChannelMenu();
    await page.getByRole('menuitem', {name: 'Members'}).click();
    await page.getByRole('button', {name: 'Add people'}).click();
    const addPeopleDialog = page.getByRole('dialog', {name: `Add people to ${channel.display_name}`});
    const searchInput = addPeopleDialog.getByRole('combobox', {name: 'Search for people or groups'});
    await searchInput.fill(user.username);

    // * Verify the matching user is labelled as already belonging to the channel
    await expect(addPeopleDialog.getByText(new RegExp(`${user.username}.*Already in channel`))).toBeVisible();
    await expect(addPeopleDialog.getByText('Already in channel', {exact: true})).toBeVisible();
});

/**
 * @objective Verify a markdown quote in a channel header renders as a block quote without losing the header text.
 */
test('MM-T881_1 renders a markdown quote in the channel header', async ({pw}) => {
    const {adminClient, team, user} = await pw.initSetup();
    const channel = await adminClient.createPublicChannel(team.id, 'Markdown Header');
    await adminClient.addToChannel(user.id, channel.id);
    const header = `This is a quote in the header ${pw.random.id()}`;
    await adminClient.patchChannel(channel.id, {header: `>${header}`});

    // # Open the channel whose header starts with markdown quote syntax
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, channel.name);
    await channelsPage.toBeVisible();

    // * Verify the header renders the text inside a block quote
    const headerDescription = channelsPage.centerView.header.container.getByText(header, {exact: true});
    await expect(headerDescription).toBeVisible();
    await expect(headerDescription.locator('xpath=ancestor::blockquote[1]')).toBeVisible();
});

/**
 * @objective Verify channel URL validation rejects a duplicate URL while leaving the current URL unchanged, then accepts a unique URL.
 */
test('MM-T882 validates channel URL changes', async ({pw}) => {
    const {adminClient, team, user} = await pw.initSetup();
    const channel = await adminClient.createPublicChannel(team.id, 'URL Validation');
    await adminClient.addToChannel(user.id, channel.id);
    const uniqueUrl = `another-town-square-${pw.random.id()}`.toLowerCase();

    // # Open Channel Settings and change the display name without changing the URL
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, channel.name);
    await channelsPage.toBeVisible();
    const channelSettings = await channelsPage.openChannelSettings();
    const infoSettings = await channelSettings.openInfoTab();
    await infoSettings.updateName('town-square');

    // # Explicitly edit the URL to use an existing channel URL
    await channelSettings.container.getByRole('button', {name: 'Edit'}).click();
    const urlInput = channelSettings.container.getByTestId('channelURLInput');
    await urlInput.fill('town-square');
    await channelSettings.container.getByRole('button', {name: 'Done'}).click();
    await channelSettings.save();

    // * Verify the duplicate URL error appears and navigation remains on the original URL
    await expect(channelSettings.container.getByRole('alert')).toContainText(
        'A channel with that name already exists on the same team.',
    );
    await expect(page).toHaveURL(new RegExp(`/${team.name}/channels/${channel.name}$`));

    // # Replace the duplicate URL with a unique URL and save
    await urlInput.fill(uniqueUrl);
    await channelSettings.container.getByRole('button', {name: 'Done'}).click();
    await channelSettings.save();

    // * Verify the browser navigates to the updated channel URL
    await expect(page).toHaveURL(new RegExp(`/${team.name}/channels/${uniqueUrl}$`));
});

/**
 * @objective Verify a channel can be muted and unmuted from its channel menu.
 */
test('MM-T887 mutes and unmutes a channel from the channel menu', async ({pw}) => {
    const {team, user} = await pw.initSetup();

    // # Open Off-Topic and mute it from the channel menu
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, 'off-topic');
    await channelsPage.toBeVisible();
    await channelsPage.centerView.header.openChannelMenu();
    await page.getByRole('menuitem', {name: 'Mute Channel'}).click();

    // * Verify the sidebar item is muted and the header offers to unmute the channel
    await expect(channelsPage.sidebarLeft.item('off-topic')).toHaveClass(/muted/);
    await expect(channelsPage.centerView.header.container.getByRole('button', {name: 'Unmute'})).toBeVisible();

    // # Reopen the channel menu and unmute the channel
    await channelsPage.centerView.header.openChannelMenu();
    await page.getByRole('menuitem', {name: 'Unmute Channel'}).click();

    // * Verify the sidebar item and header return to their unmuted state
    await expect(channelsPage.sidebarLeft.item('off-topic')).not.toHaveClass(/muted/);
    await expect(channelsPage.centerView.header.container.getByRole('button', {name: 'Unmute'})).not.toBeVisible();
});
