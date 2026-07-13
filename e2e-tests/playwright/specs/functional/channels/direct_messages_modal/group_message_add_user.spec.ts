// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect, test} from '@mattermost/playwright-lib';

import {getChannelSlugFromUrl} from './helpers';

/**
 * @objective Verify that a group message lists its members and that adding another member creates a new group message.
 */
test(
    'MM-T467 adds a user to a group message to create a new group message',
    {tag: '@direct_messages'},
    async ({pw}) => {
        // # Create the test user plus three more users on the team
        const {user, team, adminClient} = await pw.initSetup();
        const [member1, member2, member3] = await adminClient.createUsers(team.id, 3, 'gm');

        const {channelsPage, page} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, 'town-square');
        await channelsPage.toBeVisible();

        // # Create a group message with two members
        const dmModal = await channelsPage.openDirectChannelsModal();
        await dmModal.selectUser(member1);
        await dmModal.selectUser(member2);
        await dmModal.goToChannel();
        const firstSlug = getChannelSlugFromUrl(page);

        // * Verify the group message lists both members in the header
        await channelsPage.centerView.header.toHaveTitle(member1.username);
        await channelsPage.centerView.header.toHaveTitle(member2.username);

        // # Create a group message that adds a third member
        const dmModal2 = await channelsPage.openDirectChannelsModal();
        await dmModal2.selectUser(member1);
        await dmModal2.selectUser(member2);
        await dmModal2.selectUser(member3);
        await dmModal2.goToChannel();

        // * Verify a new, different group message channel is created that includes the added member
        const secondSlug = getChannelSlugFromUrl(page);
        expect(secondSlug).not.toBe(firstSlug);
        await channelsPage.centerView.header.toHaveTitle(member3.username);
    },
);

/**
 * @objective Verify adding a member to an existing group message starts a new conversation with every selected member and no message history.
 */
test('MM-T468 Group Messaging: Add member to existing GM', {tag: '@direct_messages'}, async ({pw}) => {
    const {adminClient, team, user} = await pw.initSetup();
    const members = await adminClient.createUsers(team.id, 3, 'gm-member');
    const [newMember] = await adminClient.createUsers(team.id, 1, 'gm-new-member');
    const groupChannel = await adminClient.createGroupChannel([user.id, ...members.map((member) => member.id)]);

    // # Open the existing group message and add historical messages
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.gotoMessage(team.name, groupChannel.name);
    await channelsPage.toBeVisible();
    await channelsPage.postMessage('some');
    await channelsPage.postMessage('historical');
    await channelsPage.postMessage('messages');

    // # Open the channel member list and choose to add a member
    await channelsPage.centerView.header.openChannelMenu();
    await page.getByRole('menuitem', {name: 'Members'}).click();
    await channelsPage.sidebarRight.toBeVisible();
    await channelsPage.sidebarRight.container.getByRole('button', {name: 'Add'}).click();
    const modal = channelsPage.directChannelsModal;
    await modal.toBeVisible();

    // * Verify the new-conversation warning and all existing members are selected
    await expect(modal.container).toContainText(
        "This will start a new conversation. If you're adding a lot of people, consider creating a private channel instead.",
    );
    for (const member of members) {
        await expect(modal.getRemoveButton(member.username)).toBeVisible();
    }

    // # Select another member and create the new group message
    await modal.selectUser(newMember);
    await modal.goToChannel();

    // * Verify the historical messages are absent and the new group message intro is shown
    await expect(channelsPage.centerView.container.getByText('historical', {exact: true})).toHaveCount(0);
    await expect(channelsPage.centerView.channelIntro).toContainText(
        'This is the start of your group message history with',
    );
    await channelsPage.centerView.header.toHaveTitle(newMember.username);

    // # Open the group message member list
    await channelsPage.centerView.header.openChannelMenu();
    await page.getByRole('menuitem', {name: 'Members'}).click();
    await channelsPage.sidebarRight.toBeVisible();

    // * Verify the new member and every original member remain in the conversation
    for (const member of members) {
        await expect(channelsPage.sidebarRight.container).toContainText(member.username);
    }
});
