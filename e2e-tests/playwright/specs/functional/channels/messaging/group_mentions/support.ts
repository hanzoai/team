// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {UserProfile} from '@mattermost/types/users';

import {
    EnterpriseChannelsPage,
    EnterpriseSystemConsolePage,
    getOrLinkLdapGroup,
    initializeOpenLdap,
    resetLdapGroup,
} from '@mattermost/playwright-lib';

export const boardAccount = {
    username: 'board.one',
    password: 'Password1',
    email: 'success+boardone@simulator.amazonses.com',
};

export async function setup(pw: any) {
    await pw.ensureLicense();
    await pw.skipIfNoLicense();
    const {adminClient, adminUser} = await pw.getAdminClient();
    await initializeOpenLdap(adminClient);
    const boardGroup = await getOrLinkLdapGroup(adminClient, 'board');
    await resetLdapGroup(adminClient, boardGroup.id);
    await adminClient.patchConfig({GuestAccountsSettings: {Enable: true}});
    await resetMentionPermissions(pw, adminUser);

    const team = await adminClient.createTeam(await pw.random.team());
    await adminClient.addToTeam(team.id, adminUser.id);
    const offTopic = await adminClient.getChannelByName(team.id, 'off-topic');
    const randomUser = await pw.random.user();
    const regularUser = {
        ...(await adminClient.createUser(randomUser, '', '')),
        password: randomUser.password,
    } as UserProfile;
    await adminClient.addToTeam(team.id, regularUser.id);
    await adminClient.addToChannel(regularUser.id, offTopic.id);

    const existingBoardUser = await adminClient.getUserByUsername(boardAccount.username);
    await adminClient.updateUserRoles(existingBoardUser.id, 'system_user');
    await adminClient.revokeAllSessionsForUser(existingBoardUser.id);
    for (const existingTeam of await adminClient.getTeamsForUser(existingBoardUser.id)) {
        await adminClient.removeFromTeam(existingTeam.id, existingBoardUser.id);
    }
    const {user: authenticatedBoardUser} = await pw.makeClient(boardAccount, {useCache: false});
    if (!authenticatedBoardUser) {
        throw new Error(`Unable to authenticate LDAP user ${boardAccount.username}`);
    }
    const boardUser = {...authenticatedBoardUser, password: boardAccount.password} as UserProfile;
    await adminClient.addToTeam(team.id, boardUser.id);
    await adminClient.addToChannel(boardUser.id, offTopic.id);
    await adminClient.savePreferences(boardUser.id, [
        {user_id: boardUser.id, category: 'tutorial_step', name: boardUser.id, value: '999'},
    ]);

    return {adminClient, adminUser, boardGroup, boardUser, regularUser, team};
}

export async function assertMentionEnabled(
    pw: any,
    user: UserProfile,
    boardUser: UserProfile,
    teamName: string,
    groupName: string,
) {
    const {page} = await pw.testBrowser.login(user);
    const channelsPage = new EnterpriseChannelsPage(page);
    await channelsPage.goto(teamName);
    await channelsPage.typeGroupMentionPrefix(groupName.slice(0, -1));
    await channelsPage.assertGroupMentionSuggested(groupName);
    await channelsPage.postGroupMention(groupName);
    await channelsPage.assertMentionIsLinked(groupName);

    const {page: boardPage} = await pw.testBrowser.login(boardUser);
    const boardChannelsPage = new EnterpriseChannelsPage(boardPage);
    await boardChannelsPage.goto(teamName);
    await boardChannelsPage.assertMentionIsHighlighted(groupName);
}

export async function assertMentionDisabled(
    pw: any,
    user: UserProfile,
    boardUser: UserProfile,
    teamName: string,
    groupName: string,
) {
    const {page} = await pw.testBrowser.login(user);
    const channelsPage = new EnterpriseChannelsPage(page);
    await channelsPage.goto(teamName);
    await channelsPage.typeGroupMentionPrefix(groupName.slice(0, -1));
    await channelsPage.assertGroupMentionNotSuggested();
    await channelsPage.postGroupMention(groupName);
    await channelsPage.assertMentionIsPlainText(groupName);

    const {page: boardPage} = await pw.testBrowser.login(boardUser);
    const boardChannelsPage = new EnterpriseChannelsPage(boardPage);
    await boardChannelsPage.goto(teamName);
    await boardChannelsPage.assertMentionIsPlainText(groupName);
}

export async function enableMention(adminClient: any, groupId: string, groupName: string) {
    await adminClient.patchGroup(groupId, {allow_reference: true, name: groupName});
}

export async function openChannel(
    pw: any,
    user: UserProfile,
    teamName: string,
    channelName: string,
    messageRoute = false,
) {
    const {page} = await pw.testBrowser.login(user);
    const channelsPage = new EnterpriseChannelsPage(page);
    if (messageRoute) {
        await channelsPage.gotoMessage(teamName, channelName);
    } else {
        await channelsPage.goto(teamName, channelName);
    }
    return channelsPage;
}

export async function configureMentionPermissions(
    pw: any,
    adminUser: UserProfile,
    permissions: Parameters<EnterpriseSystemConsolePage['setGroupMentionPermissions']>[0],
) {
    const {page} = await pw.testBrowser.login(adminUser);
    const consolePage = new EnterpriseSystemConsolePage(page);
    await consolePage.gotoSystemScheme();
    await consolePage.setGroupMentionPermissions(permissions);
}

export async function resetMentionPermissions(pw: any, adminUser: UserProfile) {
    const {page} = await pw.testBrowser.login(adminUser);
    const consolePage = new EnterpriseSystemConsolePage(page);
    await consolePage.gotoSystemScheme();
    await consolePage.resetSystemScheme();
}
