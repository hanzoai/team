// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect, test} from '@mattermost/playwright-lib';

/**
 * @objective Verify the keyboard shortcuts modal opens from Ctrl/Cmd+/ and /shortcuts, displays the
 * platform-specific upload shortcut, and can be closed by the shortcut, its close button, or Escape.
 */
test('MM-T1239 CTRL/CMD+/ and /shortcuts open keyboard shortcuts', async ({pw}) => {
    const {user, team} = await pw.initSetup();

    // # Open the keyboard shortcuts modal with the shortcut
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, 'town-square');
    await channelsPage.toBeVisible();
    await channelsPage.centerView.postCreate.input.focus();
    await page.keyboard.press('ControlOrMeta+/');

    // * Verify the shortcuts modal opens and shows the platform-specific "Upload files" shortcut
    const modal = channelsPage.keyboardShortcutsModal;
    await expect(modal).toBeVisible();
    const filesSection = modal.locator('.subsection').filter({hasText: 'Files'});
    await expect(filesSection).toBeVisible();
    await expect(filesSection.getByText(process.platform === 'darwin' ? '⌘' : 'Ctrl')).toBeVisible();
    await expect(filesSection.getByText('U', {exact: true})).toBeVisible();

    // # Close the modal by pressing the same shortcut again
    await page.keyboard.press('ControlOrMeta+/');
    await expect(modal).not.toBeVisible();

    // # Reopen via the slash command and close using the modal's close button
    await channelsPage.postMessage('/shortcuts');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', {name: 'Close'}).click();
    await expect(modal).not.toBeVisible();

    // # Reopen via the slash command and close by pressing Escape
    await channelsPage.postMessage('/shortcuts');
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
});

/**
 * @objective Verify Ctrl/Cmd+K channel switch keeps focus so typed characters are not lost.
 */
test('MM-T1242 CTRL/CMD+K typed characters are not lost after switching channels', async ({pw}) => {
    const {user, team} = await pw.initSetup();
    const message = 'Hello World!';

    // # Open quick switcher, select the current channel, and type into the focused page
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, 'town-square');
    await channelsPage.toBeVisible();
    await channelsPage.centerView.postCreate.input.focus();
    await page.keyboard.press('ControlOrMeta+K');
    await expect(channelsPage.findChannelsModal.input).toBeVisible();
    await channelsPage.findChannelsModal.input.fill('off');
    await channelsPage.findChannelsModal.selectChannel('off-topic');
    await channelsPage.centerView.header.toHaveTitle('Off-Topic');
    await page.keyboard.type(message);

    // * Verify typed characters land in the post textbox
    await expect(channelsPage.centerView.postCreate.input).toHaveValue(message);
});

/**
 * @objective Verify Ctrl/Cmd+K opens the Find Channels modal with its input focused and closes it
 * when pressed again.
 */
test('MM-T1240 opens and closes Find Channels with CTRL/CMD+K', {tag: '@keyboard_shortcuts'}, async ({pw}) => {
    const {user, team} = await pw.initSetup();

    // # Log in, open Town Square, and focus the post textbox
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, 'town-square');
    await channelsPage.toBeVisible();
    await channelsPage.centerView.postCreate.input.focus();

    // # Press Ctrl/Cmd+K to open Find Channels
    await page.keyboard.press('ControlOrMeta+K');

    // * Verify the modal is visible and its quick-switch input has focus
    await channelsPage.findChannelsModal.toBeVisible();
    await expect(channelsPage.findChannelsModal.input).toBeFocused();

    // # Press Ctrl/Cmd+K again
    await page.keyboard.press('ControlOrMeta+K');

    // * Verify Find Channels closes
    await expect(channelsPage.findChannelsModal.container).not.toBeVisible();
});

/**
 * @objective Verify Ctrl/Cmd+K works when the post textbox is not focused and keyboard selection
 * opens the chosen public channel with focus restored to its post textbox.
 */
test(
    'MM-T1243 opens a public channel with CTRL/CMD+K, arrow keys, and Enter after focus leaves the textbox',
    {tag: '@keyboard_shortcuts'},
    async ({pw}) => {
        const {adminClient, user, team} = await pw.initSetup();
        const channel = await adminClient.createPublicChannel(team.id, `Starting Channel ${pw.random.id()}`);
        await adminClient.addToChannel(user.id, channel.id);

        // # Log in, visit Town Square to establish the Cypress channel recency, then open the test channel
        const {channelsPage, page} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, 'town-square');
        await channelsPage.toBeVisible();
        await channelsPage.goto(team.name, channel.name);
        await channelsPage.toBeVisible();

        // # Click the center-channel message area to move focus out of the post textbox
        await page.getByRole('main').click();
        await expect(channelsPage.centerView.postCreate.input).not.toBeFocused();

        // # Open Find Channels and search for channels matching "To"
        // Playwright's default server enables Collapsed Threads, so "To" excludes the Threads
        // pseudo-channel while preserving the Cypress test's Town Square -> Off-Topic ordering.
        await page.keyboard.press('ControlOrMeta+K');
        const {findChannelsModal} = channelsPage;
        await findChannelsModal.input.pressSequentially('To');
        await pw.wait(pw.duration.half_sec);

        // * Verify Town Square is selected
        const townSquareOption = findChannelsModal.container.getByRole('option', {
            name: 'Town Square',
            exact: true,
        });
        await expect(townSquareOption).toHaveClass(/suggestion--selected/);

        // # Move down to Off-Topic and select it with Enter
        await findChannelsModal.input.focus();
        await expect(findChannelsModal.input).toBeFocused();
        await page.keyboard.press('ArrowDown');

        // * Verify Off-Topic is selected
        const offTopicOption = findChannelsModal.container.getByRole('option', {name: 'Off-Topic', exact: true});
        await expect(offTopicOption).toHaveClass(/suggestion--selected/);
        await page.keyboard.press('Enter');

        // * Verify Off-Topic opens and its post textbox receives focus
        await channelsPage.centerView.header.toHaveTitle('Off-Topic');
        await expect(page).toHaveURL(new RegExp(`/${team.name}/channels/off-topic$`));
        await expect(channelsPage.centerView.postCreate.input).toBeFocused();
    },
);

/**
 * @objective Verify Escape closes Find Channels after a no-results search without navigating away
 * from the current channel.
 */
test(
    'MM-T1244 closes Find Channels with Escape without changing channels',
    {tag: '@keyboard_shortcuts'},
    async ({pw}) => {
        const {user, team} = await pw.initSetup();
        const searchTerm = `no-results-${pw.random.id()}`;

        // # Log in to Off-Topic and open Find Channels from its sidebar button
        const {channelsPage, page} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, 'off-topic');
        await channelsPage.toBeVisible();
        await channelsPage.sidebarLeft.findChannelButton.click();

        // # Search for a value that does not match any channel or user
        await channelsPage.findChannelsModal.input.fill(searchTerm);

        // * Verify the empty state reports the searched value
        await expect(
            channelsPage.findChannelsModal.container.getByText(`No results for “${searchTerm}”`),
        ).toBeVisible();

        // # Press Escape in the quick-switch input
        await channelsPage.findChannelsModal.input.press('Escape');

        // * Verify the modal closes and the browser remains in Off-Topic
        await expect(channelsPage.findChannelsModal.container).not.toBeVisible();
        await expect(page).toHaveURL(new RegExp(`/${team.name}/channels/off-topic$`));
    },
);

/**
 * @objective Verify Ctrl/Cmd+Shift+L moves focus from search or a reply textbox to the center channel textbox.
 */
test('MM-T1248 CTRL/CMD+SHIFT+L focuses the center channel message box', {tag: '@keyboard_shortcuts'}, async ({pw}) => {
    const {user, team} = await pw.initSetup();
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, 'town-square');
    await channelsPage.toBeVisible();

    // # Open search so focus moves away from the center channel textbox
    await channelsPage.globalHeader.openSearch();
    await channelsPage.searchBox.toBeVisible();
    await expect(channelsPage.searchBox.searchInput).toBeFocused();

    // # Press Ctrl/Cmd+Shift+L
    await page.keyboard.press('ControlOrMeta+Shift+L');

    // * Verify the center channel textbox receives focus
    await expect(channelsPage.centerView.postCreate.input).toBeFocused();

    // # Close search, post a message, and open its reply thread
    await page.keyboard.press('Escape');
    await expect(channelsPage.searchBox.container).not.toBeVisible();
    await channelsPage.postMessage(`focus shortcut ${pw.random.id()}`);
    const post = await channelsPage.getLastPost();
    await post.reply();
    await channelsPage.sidebarRight.toBeVisible();
    await expect(channelsPage.sidebarRight.postCreate.input).toBeFocused();

    // # Press Ctrl/Cmd+Shift+L from the reply textbox
    await page.keyboard.press('ControlOrMeta+Shift+L');

    // * Verify focus returns to the center channel textbox
    await expect(channelsPage.centerView.postCreate.input).toBeFocused();
});

/**
 * @objective Verify Ctrl/Cmd+Shift+L focuses the center channel textbox while a reply thread is open.
 */
test(
    'MM-T1249 CTRL/CMD+SHIFT+L focuses the center channel message box with reply RHS open',
    {tag: '@keyboard_shortcuts'},
    async ({pw}) => {
        const {user, team} = await pw.initSetup();
        const {channelsPage, page} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, 'town-square');
        await channelsPage.toBeVisible();

        // # Post a message and open its reply thread
        await channelsPage.postMessage('Hello World!');
        const post = await channelsPage.getLastPost();
        await post.reply();
        await channelsPage.sidebarRight.toBeVisible();
        await expect(channelsPage.sidebarRight.postCreate.input).toBeFocused();

        // # Press Ctrl/Cmd+Shift+L
        await page.keyboard.press('ControlOrMeta+Shift+L');

        // * Verify the center channel textbox receives focus
        await expect(channelsPage.centerView.postCreate.input).toBeFocused();
    },
);

/**
 * @objective Verify Ctrl/Cmd+Shift+L focuses the center channel textbox while search results are open.
 */
test(
    'MM-T1250 CTRL/CMD+SHIFT+L focuses the center channel message box with search RHS open',
    {tag: '@keyboard_shortcuts'},
    async ({pw}) => {
        const {user, team} = await pw.initSetup();
        const {channelsPage, page} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, 'town-square');
        await channelsPage.toBeVisible();

        // # Search for a term and wait for the search results panel
        await channelsPage.searchFor('test');
        await channelsPage.searchResultsPanel.toBeVisible();

        // # Press Ctrl/Cmd+Shift+L
        await page.keyboard.press('ControlOrMeta+Shift+L');

        // * Verify the center channel textbox receives focus
        await expect(channelsPage.centerView.postCreate.input).toBeFocused();
    },
);

/**
 * @objective Verify Ctrl/Cmd+Shift+L does not focus the center channel textbox over an open modal.
 */
test(
    'MM-T1251 CTRL/CMD+SHIFT+L does not focus the center channel message box when a modal is open',
    {tag: '@keyboard_shortcuts'},
    async ({pw}) => {
        const {adminUser, team} = await pw.initSetup();
        const {channelsPage, page} = await pw.testBrowser.login(adminUser);
        await channelsPage.goto(team.name, 'town-square');
        await channelsPage.toBeVisible();

        // # Open Settings and press Ctrl/Cmd+Shift+L
        const settingsModal = await channelsPage.globalHeader.openSettings();
        await page.keyboard.press('ControlOrMeta+Shift+L');

        // * Verify Settings remains open and the center channel textbox does not receive focus
        await settingsModal.toBeVisible();
        await expect(channelsPage.centerView.postCreate.input).not.toBeFocused();
        await settingsModal.close();

        // # Open Invite People and press Ctrl/Cmd+Shift+L
        await channelsPage.sidebarLeft.teamMenuButton.click();
        await channelsPage.teamMenu.toBeVisible();
        await channelsPage.teamMenu.clickInvitePeople();
        const invitePeopleModal = await channelsPage.getInvitePeopleModal(team.display_name);
        await invitePeopleModal.toBeVisible();
        await page.keyboard.press('ControlOrMeta+Shift+L');

        // * Verify Invite People remains open and the center channel textbox does not receive focus
        await invitePeopleModal.toBeVisible();
        await expect(channelsPage.centerView.postCreate.input).not.toBeFocused();
    },
);

/**
 * @objective Verify Ctrl/Cmd+Shift+A opens and closes Settings.
 */
test('MM-T1252 CTRL/CMD+SHIFT+A toggles the Settings modal', {tag: '@keyboard_shortcuts'}, async ({pw}) => {
    const {user, team} = await pw.initSetup();
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, 'town-square');
    await channelsPage.toBeVisible();

    // # Press Ctrl/Cmd+Shift+A from the center channel textbox
    await channelsPage.centerView.postCreate.input.focus();
    await page.keyboard.press('ControlOrMeta+Shift+A');

    // * Verify Settings opens
    await channelsPage.settingsModal.toBeVisible();

    // # Press Ctrl/Cmd+Shift+A again
    await page.keyboard.press('ControlOrMeta+Shift+A');

    // * Verify Settings closes
    await expect(channelsPage.settingsModal.container).not.toBeVisible();
});

/**
 * @objective Verify Ctrl/Cmd+Shift+M opens Recent Mentions and shows direct username mentions while
 * excluding broad channel mentions authored by the mentioned user.
 */
test('MM-T1253 CTRL/CMD+SHIFT+M opens recent mentions', {tag: '@keyboard_shortcuts'}, async ({pw}) => {
    const {adminClient, user, team} = await pw.initSetup();
    const [otherUser] = await adminClient.createUsers(team.id, 1, 'mention-peer');
    await adminClient.createDirectChannel([user.id, otherUser.id]);

    const mentionPrefix = `mention @${user.username}`;
    const directMessage = `${mentionPrefix} from DM channel`;
    const channelMessage = `${mentionPrefix} from channel`;
    const suggestedMessage = `${mentionPrefix} using suggestion`;

    // # Log in and post a username mention in a direct message
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, `@${otherUser.username}`);
    await channelsPage.toBeVisible();
    await channelsPage.postMessage(directMessage);

    // # Post two more username mentions and the broad mentions in Town Square
    await channelsPage.goto(team.name, 'town-square');
    await channelsPage.toBeVisible();
    await channelsPage.postMessage(channelMessage);
    await channelsPage.postMessage(suggestedMessage);
    await channelsPage.postMessage('mention @here');
    await channelsPage.postMessage('mention @all');
    await channelsPage.postMessage('mention @channel');

    // # Open Recent Mentions with Ctrl/Cmd+Shift+M
    await channelsPage.centerView.postCreate.input.focus();
    await page.keyboard.press('ControlOrMeta+Shift+M');

    // * Verify only the three direct username mentions are shown
    const recentMentions = channelsPage.searchResultsPanel;
    await recentMentions.toHaveHeading('Recent Mentions');
    await expect(recentMentions.getResultItems()).toHaveCount(3);
    await expect(recentMentions.getResultByText(directMessage)).toBeVisible();
    await expect(recentMentions.getResultByText(channelMessage)).toBeVisible();
    await expect(recentMentions.getResultByText(suggestedMessage)).toBeVisible();
});

/**
 * @objective Verify Ctrl/Cmd+Up and Ctrl/Cmd+Down cycle through previous messages in the post textbox.
 */
test('MM-T1254 CTRL/CMD+UP and CTRL/CMD+DOWN cycle previous messages', async ({pw}) => {
    const {user, team} = await pw.initSetup();
    const messages = ['post 1', 'post 2', 'post 3', 'post 4', 'post 5'];

    // # Post several messages and focus the textbox
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, 'town-square');
    await channelsPage.toBeVisible();
    for (const message of messages) {
        await channelsPage.postMessage(message);
    }
    await channelsPage.centerView.postCreate.input.focus();

    // * Verify Ctrl/Cmd+Up cycles backward through message history
    for (const message of [...messages].reverse()) {
        await page.keyboard.press('ControlOrMeta+ArrowUp');
        await expect(channelsPage.centerView.postCreate.input).toHaveValue(message);
    }

    // * Verify one extra Ctrl/Cmd+Up past the oldest message does not change the displayed message
    await page.keyboard.press('ControlOrMeta+ArrowUp');
    await expect(channelsPage.centerView.postCreate.input).toHaveValue(messages[0]);

    // * Verify Ctrl/Cmd+Down cycles forward through message history
    for (const message of messages.slice(1)) {
        await page.keyboard.press('ControlOrMeta+ArrowDown');
        await expect(channelsPage.centerView.postCreate.input).toHaveValue(message);
    }
});

/**
 * @objective Verify Ctrl/Cmd+Up and Ctrl/Cmd+Down move the caret without changing a draft post.
 */
test('MM-T1255 CTRL/CMD+UP or DOWN does not change a draft post', {tag: '@keyboard_shortcuts'}, async ({pw}) => {
    const {user, team} = await pw.initSetup();
    const message = 'Test message from User 1';

    // # Type a draft in the center-channel post textbox
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, 'town-square');
    await channelsPage.toBeVisible();
    const input = channelsPage.centerView.postCreate.input;
    await input.fill(message);

    // # Press Ctrl/Cmd+Down
    await page.keyboard.press('ControlOrMeta+ArrowDown');

    // * Verify the draft and focus are unchanged and the caret is at the end
    await expect(input).toBeFocused();
    await expect(input).toHaveValue(message);
    await expect(input).toHaveJSProperty('selectionStart', message.length);
    await expect(input).toHaveJSProperty('selectionEnd', message.length);

    // # Press Ctrl/Cmd+Up
    await page.keyboard.press('ControlOrMeta+ArrowUp');

    // * Verify the draft and focus are unchanged and the caret is at the start
    await expect(input).toBeFocused();
    await expect(input).toHaveValue(message);
    await expect(input).toHaveJSProperty('selectionStart', 0);
    await expect(input).toHaveJSProperty('selectionEnd', 0);
});

/**
 * @objective Verify Up arrow opens inline edit for the previous message and saving marks the post as edited.
 */
test('MM-T1260 UP arrow edits the previous post', async ({pw}) => {
    const {user, team} = await pw.initSetup();

    // # Post a message and press Up from the center textbox
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, 'town-square');
    await channelsPage.toBeVisible();
    await channelsPage.postMessage('Test');
    const postId = await channelsPage.centerView.getLastPostID();
    await channelsPage.centerView.postCreate.input.focus();
    await page.keyboard.press('ArrowUp');

    // # Edit and save the previous message
    await channelsPage.centerView.postEdit.toBeVisible();
    await channelsPage.centerView.postEdit.writeMessage('Edit Test');
    await channelsPage.centerView.postEdit.sendMessage();

    // * Verify the post was edited and has the edited marker
    const editedPost = await channelsPage.getLastPost();
    await editedPost.toContainText('Edit Test');
    await expect(channelsPage.centerView.editedPostIcon(postId)).toContainText('Edited');
});

/**
 * @objective Verify Up arrow from the RHS reply textbox opens the latest reply for editing.
 */
test('MM-T1261 UP arrow edits the previous RHS reply', {tag: '@keyboard_shortcuts'}, async ({pw}) => {
    const {user, team} = await pw.initSetup();
    const rootMessage = 'Hello World';
    const replyMessage = 'Well, hello there.';

    // # Post a root message, open its thread, and add a reply
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, 'town-square');
    await channelsPage.toBeVisible();
    await channelsPage.postMessage(rootMessage);
    const rootPost = await channelsPage.getLastPost();
    await rootPost.openAThread();
    await channelsPage.sidebarRight.postMessage(replyMessage);

    // # Focus the empty RHS reply textbox and press Up
    await channelsPage.sidebarRight.postCreate.input.focus();
    await page.keyboard.press('ArrowUp');

    // * Verify the latest reply opens in the RHS edit textbox
    await channelsPage.sidebarRight.postEdit.toBeVisible();
    await expect(channelsPage.sidebarRight.postEdit.input).toHaveValue(replyMessage);
});

/**
 * @objective Verify Up arrow skips an ephemeral post and opens the previous regular post for editing.
 */
test('MM-T1264 UP arrow skips an ephemeral message when editing', {tag: '@keyboard_shortcuts'}, async ({pw}) => {
    const {user, team} = await pw.initSetup();
    const message = 'Hello World';

    // # Post a regular message followed by a slash command that returns an ephemeral message
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, 'town-square');
    await channelsPage.toBeVisible();
    await channelsPage.postMessage(message);
    await channelsPage.postMessage('/code ');

    // * Verify the ephemeral command response is visible
    const ephemeralPost = channelsPage.centerView.container
        .getByTestId('postView')
        .filter({hasText: 'A message must be provided with the /code command.'});
    await expect(ephemeralPost.getByText('(Only visible to you)', {exact: true})).toBeVisible();
    await expect(
        ephemeralPost.getByText('A message must be provided with the /code command.', {exact: true}),
    ).toBeVisible();

    // # Focus the empty center-channel textbox and press Up
    await channelsPage.centerView.postCreate.input.focus();
    await page.keyboard.press('ArrowUp');

    // * Verify editing skips the ephemeral response and opens the regular message
    await channelsPage.centerView.postEdit.toBeVisible();
    await expect(channelsPage.centerView.postEdit.input).toHaveValue(message);
});
