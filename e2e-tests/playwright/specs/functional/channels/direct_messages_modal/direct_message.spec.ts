// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {duration, expect, test} from '@mattermost/playwright-lib';

/**
 * @objective Verify a user can open a self direct message, post a message, and does not receive a desktop notification.
 */
test('MM-T457 Self direct message', {tag: '@direct_messages'}, async ({pw}) => {
    const {team, user} = await pw.initSetup();

    // # Open the Direct Messages modal and search for the current user
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, 'town-square');
    await channelsPage.toBeVisible();
    await pw.stubNotification(page, 'granted');
    const modal = await channelsPage.openDirectChannelsModal();
    await modal.fillSearchInput(user.username);

    // * Verify the current user appears in the search results
    await expect(modal.results.getByText(`@${user.username}`, {exact: false})).toBeVisible();

    // # Select the current user, which immediately opens the self direct message
    await modal.results.getByText(`@${user.username}`, {exact: false}).click();
    await expect(modal.container).not.toBeAttached();

    // * Verify the channel header identifies the current user
    await channelsPage.centerView.header.toHaveTitle(`${user.username} (you)`);

    // # Post a message to the self direct message
    await channelsPage.postMessage('todo list for today: 1,2,3');
    await pw.wait(duration.one_sec);

    // * Verify no desktop notification is received for the self-authored message
    expect(await page.evaluate(() => window.getNotifications())).toHaveLength(0);
});

/**
 * @objective Verify a direct message channel header supports multiline text and displays the saved text in its popover.
 */
test('MM-T458 Edit direct message channel header', {tag: '@direct_messages'}, async ({pw}) => {
    const {adminClient, team, user} = await pw.initSetup();
    const [otherUser] = await adminClient.createUsers(team.id, 1, 'dm-header');
    const channel = await adminClient.createDirectChannel([user.id, otherUser.id]);
    await adminClient.createPost({channel_id: channel.id, user_id: otherUser.id, message: 'Hello'});

    // # Open the direct message and choose to add its channel header
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, `@${otherUser.username}`);
    await channelsPage.toBeVisible();
    const addHeaderButton = channelsPage.centerView.header.container.getByRole('button', {
        name: 'Add a channel header',
    });
    await channelsPage.centerView.header.container.hover();
    await addHeaderButton.click();

    // # Enter and save a multiline channel header
    const modalHeading = page.getByRole('heading', {name: /^Edit Header(?: for)?/});
    await expect(modalHeading).toBeVisible();
    const headerInput = page.getByRole('textbox', {
        name: 'Edit the text appearing next to the channel name in the header.',
    });
    const expectedHeader = 'This is a line\n\nThis is another line';
    await headerInput.fill(expectedHeader);
    await headerInput.press('Enter');
    await expect(modalHeading).not.toBeVisible();

    // # Hover over the saved header text
    await page.mouse.move(0, 0);
    await expect(page.getByRole('tooltip').filter({hasText: 'This is a line'})).not.toBeVisible();
    const headerText = channelsPage.centerView.header.container.getByText('This is a line', {exact: false});
    await headerText.hover({force: true});

    // * Verify the popover displays the complete multiline header
    await expect(page.getByRole('tooltip').filter({hasText: 'This is a line'})).toHaveText(expectedHeader);
});
