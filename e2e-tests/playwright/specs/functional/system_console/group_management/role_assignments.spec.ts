// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    duration,
    EnterpriseSystemConsolePage,
    expect,
    getOrLinkLdapGroup,
    initializeOpenLdap,
    resetLdapGroup,
    test,
} from '@mattermost/playwright-lib';

test.describe('LDAP group role assignments', () => {
    async function setup(pw: any, groupName = 'board') {
        await pw.ensureLicense();
        await pw.skipIfNoLicense();
        const {adminClient, adminUser} = await pw.getAdminClient();
        await initializeOpenLdap(adminClient);
        const group = await getOrLinkLdapGroup(adminClient, groupName);
        await resetLdapGroup(adminClient, group.id);
        const team = await adminClient.createTeam(await pw.random.team());
        await adminClient.addToTeam(team.id, adminUser.id);
        const channel = await adminClient.createPublicChannel(team.id, 'Role Assignment Channel');
        const {page} = await pw.testBrowser.login(adminUser);
        return {adminClient, channel, consolePage: new EnterpriseSystemConsolePage(page), group, team};
    }

    /**
     * @objective Verify a system administrator can persist, revert, and remove a group role from Team Configuration
     * @precondition MM-21789 is consolidated here because its Team Admin persistence assertion is already an intermediate verification in MM-20059.
     */
    test('MM-20059 MM-21789 maps and persists group roles from Team Configuration', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, consolePage, group, team} = await setup(pw);

        // # Find the team and add the linked LDAP group
        await consolePage.gotoTeamsList();
        await consolePage.searchManagementList(team.display_name);
        await consolePage.openOnlyManagementResult();
        await consolePage.addGroup(group.display_name);

        // # Promote the group to Team Admin and save
        await consolePage.changeGroupRole('Member', 'Team Admin');
        await consolePage.saveConfiguration();
        await expect
            .poll(
                async () =>
                    (await adminClient.getGroupSyncableIncludingDeleted(group.id, team.id, 'team')).scheme_admin,
                {timeout: duration.half_min},
            )
            .toBe(true);
        await consolePage.gotoTeamsList();
        await consolePage.searchManagementList(team.display_name);
        await consolePage.openOnlyManagementResult();

        // * Verify the Team Admin role persisted
        await consolePage.assertGroupRole('Team Admin');

        // # Revert the role to Member and save
        await consolePage.changeGroupRole('Team Admin', 'Member');
        await consolePage.saveConfiguration();
        await expect
            .poll(
                async () =>
                    (await adminClient.getGroupSyncableIncludingDeleted(group.id, team.id, 'team')).scheme_admin,
                {timeout: duration.half_min},
            )
            .toBe(false);
        await consolePage.gotoTeamsList();
        await consolePage.searchManagementList(team.display_name);
        await consolePage.openOnlyManagementResult();

        // * Verify the Member role persisted
        await consolePage.assertGroupRole('Member');

        // # Remove the group and save
        await consolePage.removeGroup(group.display_name);
        await consolePage.saveConfiguration();
        await expect
            .poll(
                async () => (await adminClient.getGroupSyncableIncludingDeleted(group.id, team.id, 'team')).delete_at,
                {timeout: duration.half_min},
            )
            .not.toBe(0);
        await consolePage.gotoTeamsList();
        await consolePage.searchManagementList(team.display_name);
        await consolePage.openOnlyManagementResult();

        // * Verify the group remains removed
        await consolePage.assertNoGroups();
    });

    /**
     * @objective Verify a system administrator can persist and revert a group role from Channel Configuration
     * @precondition MM-21789 is consolidated here because its Channel Admin persistence assertion is already an intermediate verification in MM-20646.
     */
    test('MM-20646 MM-21789 maps and persists group roles from Channel Configuration', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, channel, consolePage, group} = await setup(pw);

        // # Find the channel and add the linked LDAP group
        await consolePage.gotoChannelsList();
        await consolePage.searchManagementList(channel.display_name);
        await consolePage.openOnlyManagementResult();
        await consolePage.addGroup(group.display_name);

        // # Promote the group to Channel Admin and save
        await consolePage.changeGroupRole('Member', 'Channel Admin');
        await consolePage.saveConfiguration();
        await expect
            .poll(
                async () =>
                    (await adminClient.getGroupSyncableIncludingDeleted(group.id, channel.id, 'channel')).scheme_admin,
                {timeout: duration.half_min},
            )
            .toBe(true);
        await consolePage.gotoChannelsList();
        await consolePage.searchManagementList(channel.display_name);
        await consolePage.openOnlyManagementResult();

        // * Verify the Channel Admin role persisted
        await consolePage.assertGroupRole('Channel Admin');

        // # Revert the role to Member and save
        await consolePage.changeGroupRole('Channel Admin', 'Member');
        await consolePage.saveConfiguration();
        await expect
            .poll(
                async () =>
                    (await adminClient.getGroupSyncableIncludingDeleted(group.id, channel.id, 'channel')).scheme_admin,
                {timeout: duration.half_min},
            )
            .toBe(false);
        await consolePage.gotoChannelsList();
        await consolePage.searchManagementList(channel.display_name);
        await consolePage.openOnlyManagementResult();

        // * Verify the Member role persisted
        await consolePage.assertGroupRole('Member');
    });

    /**
     * @objective Verify an administrator role assigned from an LDAP group configuration is saved
     */
    test('MM-T2668 saves an administrator role for a group membership', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, channel, consolePage, group, team} = await setup(pw, 'developers');

        // # Add and save the team before its channel so their implied team links are not created concurrently
        await consolePage.gotoGroupConfiguration(group.id);
        await consolePage.addTeamOrChannel('Team', team.display_name);
        await consolePage.saveConfiguration();
        await expect
            .poll(
                async () => (await adminClient.getGroupSyncableIncludingDeleted(group.id, team.id, 'team')).delete_at,
                {timeout: duration.half_min},
            )
            .toBe(0);
        await consolePage.addTeamOrChannel('Channel', channel.display_name);

        // * Verify each membership starts with the Member role
        await consolePage.assertGroupRole('Member');

        // # Promote the team membership and save
        await consolePage.changeMembershipRole(team.display_name, 'Member', 'Team Admin');
        await consolePage.saveConfiguration();
        await expect
            .poll(
                async () =>
                    (await adminClient.getGroupSyncableIncludingDeleted(group.id, team.id, 'team')).scheme_admin,
                {timeout: duration.half_min},
            )
            .toBe(true);
        await consolePage.gotoGroupConfiguration(group.id);

        // * Verify the administrator role persisted
        await consolePage.assertMembershipRole(team.display_name, 'Team Admin');
    });
});
