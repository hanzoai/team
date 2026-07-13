// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    EnterpriseSystemConsolePage,
    getOrLinkLdapGroup,
    getRandomId,
    initializeOpenLdap,
    resetLdapGroup,
} from '@mattermost/playwright-lib';

export async function setup(pw: any, teamDisplayName = `AAA Test ${getRandomId()}`) {
    await pw.ensureLicense();
    await pw.skipIfNoLicense();
    const {adminClient, adminUser} = await pw.getAdminClient();
    await initializeOpenLdap(adminClient);
    const group = await getOrLinkLdapGroup(adminClient, 'board');
    const team = await adminClient.createTeam({
        ...(await pw.random.team()),
        display_name: teamDisplayName,
    });
    await adminClient.addToTeam(team.id, adminUser.id);
    const channel = await adminClient.createPublicChannel(team.id, `Group Config ${getRandomId()}`);

    await resetLdapGroup(adminClient, group.id);

    const {page} = await pw.testBrowser.login(adminUser);
    const consolePage = new EnterpriseSystemConsolePage(page);
    await consolePage.gotoGroupConfiguration(group.id);
    await consolePage.assertNoTeamOrChannelMemberships();
    return {adminClient, channel, consolePage, group, team};
}

export async function saveAndReload(consolePage: EnterpriseSystemConsolePage, groupId: string) {
    await consolePage.saveConfiguration();
    await consolePage.gotoGroupConfiguration(groupId);
}

export async function discardAndReload(consolePage: EnterpriseSystemConsolePage, groupId: string) {
    await consolePage.attemptToLeaveGroupConfiguration();
    await consolePage.gotoGroupConfiguration(groupId);
}
