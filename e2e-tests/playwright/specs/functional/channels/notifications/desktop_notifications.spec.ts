// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Client4} from '@mattermost/client';
import type {Page} from '@playwright/test';
import type {UserProfile} from '@mattermost/types/users';

import {duration, expect, test, type ChannelsPage, type PlaywrightExtended} from '@mattermost/playwright-lib';

type DesktopNotificationLevel = 'all' | 'mention' | 'none';
type NameFormat = 'username' | 'nickname_full_name' | 'full_name';

type DisplayNameCase = {
    nameFormat: NameFormat;
    senderName: (sender: UserProfile) => string;
    messageSuffix: string;
    removeNickname?: boolean;
};

type NotificationSettingCase = {
    desktop: DesktopNotificationLevel;
    channelMessages: Array<{message: (receiver: UserProfile) => string; shouldNotify: boolean}>;
    directMessageShouldNotify: boolean;
};

const displayNameCases = {
    username: {
        nameFormat: 'username',
        senderName: (sender) => sender.username,
        messageSuffix: 'How are things?',
    },
    nickname: {
        nameFormat: 'nickname_full_name',
        senderName: (sender) => sender.nickname,
        messageSuffix: 'first',
    },
    nicknameFallback: {
        nameFormat: 'nickname_full_name',
        senderName: (sender) => `${sender.first_name} ${sender.last_name}`,
        messageSuffix: 'second',
        removeNickname: true,
    },
    fullName: {
        nameFormat: 'full_name',
        senderName: (sender) => `${sender.first_name} ${sender.last_name}`,
        messageSuffix: 'How are things?',
    },
} satisfies Record<string, DisplayNameCase>;

const notificationSettingCases = {
    mentions: {
        desktop: 'mention',
        channelMessages: [
            {message: () => 'message without notification', shouldNotify: false},
            {message: (receiver) => `random message with mention @${receiver.username}`, shouldNotify: true},
        ],
        directMessageShouldNotify: true,
    },
    never: {
        desktop: 'none',
        channelMessages: [
            {message: (receiver) => `random message with mention @${receiver.username}`, shouldNotify: false},
        ],
        directMessageShouldNotify: false,
    },
} satisfies Record<string, NotificationSettingCase>;

async function setDesktopNotificationLevel(adminClient: Client4, user: UserProfile, desktop: DesktopNotificationLevel) {
    await adminClient.patchUser({
        id: user.id,
        notify_props: {...user.notify_props, desktop},
    });
}

async function setNameFormat(adminClient: Client4, user: UserProfile, value: NameFormat) {
    await adminClient.savePreferences(user.id, [
        {
            user_id: user.id,
            category: 'display_settings',
            name: 'name_format',
            value,
        },
    ]);
}

async function expectSingleNotification(pw: PlaywrightExtended, page: Page, expected: {title: string; body: string}) {
    const notifications = await pw.waitForNotification(page);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe(expected.title);
    expect(notifications[0].body).toBe(expected.body);
}

async function expectNoNotification(pw: PlaywrightExtended, page: Page) {
    await pw.wait(duration.one_sec);
    expect(await page.evaluate(() => window.getNotifications())).toHaveLength(0);
}

async function runDisplayNameCase(pw: PlaywrightExtended, testCase: DisplayNameCase) {
    const {adminClient, team, user: sender, userClient: senderClient} = await pw.initSetup();
    const receiver = await pw.createNewUserProfile(adminClient, {prefix: 'notification-receiver'});
    await adminClient.addToTeam(team.id, receiver.id);
    await setDesktopNotificationLevel(adminClient, receiver, 'mention');
    await setNameFormat(adminClient, receiver, testCase.nameFormat);

    if (testCase.removeNickname) {
        await adminClient.patchUser({id: sender.id, nickname: ''});
        sender.nickname = '';
    }

    const channel = await adminClient.getChannelByName(team.id, 'off-topic');
    const {page, channelsPage} = await pw.testBrowser.login(receiver);
    await channelsPage.goto(team.name, 'town-square');
    await channelsPage.toBeVisible();
    await pw.stubNotification(page, 'granted');

    const message = `@${receiver.username} ${testCase.messageSuffix}`;

    // # Post a mention while the receiver is viewing another channel
    await senderClient.createPost({channel_id: channel.id, message});

    // * Verify the notification uses the configured sender display name and exact message body
    await expectSingleNotification(pw, page, {
        title: channel.display_name,
        body: `@${testCase.senderName(sender)}: ${message}`,
    });
}

async function waitForDirectMessageProcessing(
    senderClient: Client4,
    channelsPage: ChannelsPage,
    syncChannelId: string,
    syncChannelName: string,
) {
    await senderClient.createPost({
        channel_id: syncChannelId,
        message: `notification sync ${Date.now()}`,
    });
    await channelsPage.sidebarLeft.assertItemUnread(syncChannelName);
}

async function runNotificationSettingCase(pw: PlaywrightExtended, testCase: NotificationSettingCase) {
    const {adminClient, team, user: sender, userClient: senderClient} = await pw.initSetup();
    const receiver = await pw.createNewUserProfile(adminClient, {prefix: 'notification-receiver'});
    await adminClient.addToTeam(team.id, receiver.id);
    await setDesktopNotificationLevel(adminClient, receiver, testCase.desktop);

    const channel = await adminClient.getChannelByName(team.id, 'off-topic');
    const syncChannel = await adminClient.createChannel(
        pw.random.channel({
            teamId: team.id,
            name: 'notification-sync',
            displayName: 'Notification Sync',
            unique: true,
        }),
    );
    await adminClient.addToChannel(receiver.id, syncChannel.id);
    await adminClient.addToChannel(sender.id, syncChannel.id);

    const {page, channelsPage} = await pw.testBrowser.login(receiver);
    await channelsPage.goto(team.name, 'town-square');
    await channelsPage.toBeVisible();
    await pw.stubNotification(page, 'granted');

    for (const channelMessage of testCase.channelMessages) {
        const message = channelMessage.message(receiver);

        // # Post a channel message with or without a mention, according to the setting matrix
        await senderClient.createPost({channel_id: channel.id, message});

        if (channelMessage.shouldNotify) {
            // * Verify a mentioned channel message sends the exact desktop notification
            await expectSingleNotification(pw, page, {
                title: channel.display_name,
                body: `@${sender.username}: ${message}`,
            });
        } else {
            // * Verify the channel event is processed without sending a desktop notification
            await channelsPage.sidebarLeft.assertItemUnread(channel.name);
            await expectNoNotification(pw, page);
        }

        await pw.clearCapturedNotifications(page);
    }

    const directChannel = await adminClient.createDirectChannel([receiver.id, sender.id]);

    // # Send a direct message, then a non-notifying sync post to establish WebSocket processing order
    await senderClient.createPost({channel_id: directChannel.id, message: 'hi'});
    await waitForDirectMessageProcessing(senderClient, channelsPage, syncChannel.id, syncChannel.name);

    if (testCase.directMessageShouldNotify) {
        // * Verify the direct message sends a desktop notification
        const notifications = await pw.waitForNotification(page);
        expect(notifications).toHaveLength(1);
    } else {
        // * Verify the processed direct message does not send a desktop notification
        await expectNoNotification(pw, page);
    }
}

/**
 * @objective Verify all-activity desktop notifications preserve apostrophes and emoji text while stripping markdown.
 *
 * @precondition
 * - Browser notification permission is granted
 * - The receiver's desktop notification setting is All new messages
 */
test(
    'MM-T487 Desktop Notifications for all activity with apostrophe, emoji, and markdown',
    {tag: '@notifications'},
    async ({pw}) => {
        const {adminClient, team, user: sender, userClient: senderClient} = await pw.initSetup();
        const receiver = await pw.createNewUserProfile(adminClient, {prefix: 'notification-receiver'});
        await adminClient.addToTeam(team.id, receiver.id);
        await setDesktopNotificationLevel(adminClient, receiver, 'all');

        const channel = await adminClient.getChannelByName(team.id, 'off-topic');
        const {page, channelsPage} = await pw.testBrowser.login(receiver);
        await channelsPage.goto(team.name, 'town-square');
        await channelsPage.toBeVisible();
        await pw.stubNotification(page, 'granted');

        const message =
            "*I'm* [hungry](http://example.com) :taco: ![Mattermost](https://mattermost.com/wp-content/uploads/2022/02/logoHorizontal.png)";

        // # Post a message containing an apostrophe, markdown, emoji text, a link, and an image
        await senderClient.createPost({channel_id: channel.id, message});

        // * Verify the notification body contains plain text without markdown syntax or URLs
        await expectSingleNotification(pw, page, {
            title: channel.display_name,
            body: `@${sender.username}: I'm hungry :taco: Mattermost`,
        });
    },
);

/**
 * @objective Verify username display preference formats the sender name in desktop notifications.
 */
test(
    'MM-T488 Desktop Notifications with teammate name display set to username',
    {tag: '@notifications'},
    async ({pw}) => {
        // # Configure username display and post a mention from another user
        // * Verify the desktop notification displays the sender's username and exact message body
        await runDisplayNameCase(pw, displayNameCases.username);
    },
);

/**
 * @objective Verify nickname display preference uses a nickname when present in desktop notifications.
 */
test(
    'MM-T489_1 Desktop Notifications display teammate nickname when nickname exists',
    {tag: '@notifications'},
    async ({pw}) => {
        // # Configure nickname display and post a mention from a sender with a nickname
        // * Verify the desktop notification displays the sender's nickname and exact message body
        await runDisplayNameCase(pw, displayNameCases.nickname);
    },
);

/**
 * @objective Verify nickname display preference falls back to first and last name when no nickname exists.
 */
test(
    'MM-T489_2 Desktop Notifications display teammate full name when nickname does not exist',
    {tag: '@notifications'},
    async ({pw}) => {
        // # Configure nickname display and post a mention from a sender without a nickname
        // * Verify the desktop notification falls back to the sender's first and last name
        await runDisplayNameCase(pw, displayNameCases.nicknameFallback);
    },
);

/**
 * @objective Verify full-name display preference formats the sender name in desktop notifications.
 */
test(
    'MM-T490 Desktop Notifications with teammate name display set to first and last name',
    {tag: '@notifications'},
    async ({pw}) => {
        // # Configure full-name display and post a mention from another user
        // * Verify the desktop notification displays the sender's first and last name
        await runDisplayNameCase(pw, displayNameCases.fullName);
    },
);

/**
 * @objective Verify a channel message does not trigger a desktop notification while that channel is in focus.
 *
 * @precondition
 * - Browser notification permission is granted
 * - The receiver's desktop notification setting is All new messages
 */
test(
    'MM-T491 Channel notifications do not send a desktop notification when in focus',
    {tag: '@notifications'},
    async ({pw}) => {
        const {adminClient, team, userClient: senderClient} = await pw.initSetup();
        const receiver = await pw.createNewUserProfile(adminClient, {prefix: 'notification-receiver'});
        await adminClient.addToTeam(team.id, receiver.id);
        await setDesktopNotificationLevel(adminClient, receiver, 'all');

        const channel = await adminClient.getChannelByName(team.id, 'off-topic');
        const {page, channelsPage} = await pw.testBrowser.login(receiver);
        await channelsPage.goto(team.name, channel.name);
        await channelsPage.toBeVisible();
        await pw.stubNotification(page, 'granted');

        const message = '/echo test 3';

        // # Post a message from another user to the channel currently in focus
        await senderClient.createPost({channel_id: channel.id, message});

        // * Verify the post is rendered in the focused channel without a desktop notification
        const lastPost = await channelsPage.getLastPost();
        await lastPost.toContainText(message);
        await expectNoNotification(pw, page);
    },
);

/**
 * @objective Verify Mentions, direct messages, and group messages notifies for mentions and DMs but not ordinary posts.
 *
 * @precondition
 * - Browser notification permission is granted
 * - The receiver's desktop notification setting is Mentions, direct messages, and group messages
 */
test(
    'MM-T494 Channel notifications send desktop notifications only for mentions and direct messages',
    {tag: '@notifications'},
    async ({pw}) => {
        // # Configure mention-only notifications and send an ordinary post, a mention, and a direct message
        // * Verify only the mention and direct message produce desktop notifications
        await runNotificationSettingCase(pw, notificationSettingCases.mentions);
    },
);

/**
 * @objective Verify the Nothing desktop notification setting suppresses channel mentions and direct messages.
 *
 * @precondition
 * - Browser notification permission is granted
 * - The receiver's desktop notification setting is Nothing
 */
test('MM-T496 Channel notifications never send desktop notifications', {tag: '@notifications'}, async ({pw}) => {
    // # Disable desktop notifications and send a channel mention and direct message
    // * Verify neither message produces a desktop notification
    await runNotificationSettingCase(pw, notificationSettingCases.never);
});
