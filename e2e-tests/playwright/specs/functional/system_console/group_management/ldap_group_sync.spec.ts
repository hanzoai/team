// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {configureOpenLdap, EnterpriseSystemConsolePage, expect, test} from '@mattermost/playwright-lib';

test.describe('LDAP group-synchronized team and channel management', () => {
    test.describe.configure({mode: 'serial'});

    test.beforeEach(async ({pw}) => {
        await pw.ensureLicense();
        await pw.skipIfNoLicense();
        const {adminClient} = await pw.getAdminClient();
        await configureOpenLdap(adminClient);
        await adminClient.testLdap();
        await adminClient.syncLdap();
    });

    async function setup(pw: any) {
        const {adminClient, adminUser} = await pw.getAdminClient();
        const team = await adminClient.createTeam(await pw.random.team());
        const randomUser = await pw.random.user();
        const user = {...(await adminClient.createUser(randomUser, '', '')), password: randomUser.password};
        await adminClient.addToTeam(team.id, adminUser!.id);
        await adminClient.addToTeam(team.id, user.id);
        const channel = await adminClient.createPublicChannel(team.id, 'LDAP Group Sync');
        const {groups} = await adminClient.getLdapGroups();

        const linkedGroups = [];
        for (const name of ['board', 'developers']) {
            const ldapGroup = groups.find((group: {name: string}) => group.name === name);
            expect(ldapGroup, `LDAP group ${name} should exist`).toBeTruthy();
            linkedGroups.push(
                ldapGroup.mattermost_group_id
                    ? await adminClient.getGroup(ldapGroup.mattermost_group_id)
                    : await adminClient.linkLdapGroup(ldapGroup.primary_key),
            );
        }

        const board = linkedGroups.find((group: {display_name: string}) => group.display_name === 'board');
        const developers = linkedGroups.find((group: {display_name: string}) => group.display_name === 'developers');
        expect(board).toBeTruthy();
        expect(developers).toBeTruthy();
        return {adminClient, adminUser, user, team, channel, board, developers};
    }

    /**
     * @objective Verify removing one synchronized LDAP group from a channel persists
     */
    test('MM-T1537 - Sync Group Removal from Channel Configuration Page', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, adminUser, channel, board, developers} = await setup(pw);
        await adminClient.linkGroupSyncable(board.id, channel.id, 'channel', {auto_add: true});
        await adminClient.linkGroupSyncable(developers.id, channel.id, 'channel', {auto_add: true});
        const {page} = await pw.testBrowser.login(adminUser);
        const consolePage = new EnterpriseSystemConsolePage(page);

        // # Open channel configuration and remove the board group
        await consolePage.gotoChannelConfiguration(channel.id);
        await expect(page.getByText('board', {exact: true})).toBeVisible();
        await page.getByRole('link', {name: 'Remove'}).first().click();
        await consolePage.saveConfiguration();
        await consolePage.gotoChannelConfiguration(channel.id);

        // * Verify only the developers group remains
        await expect(page.getByText('developers', {exact: true})).toBeVisible();
        await expect(page.getByText('board', {exact: true})).not.toBeVisible();
    });

    /**
     * @objective Verify removing a synchronized team membership from an LDAP group warns about future users
     */
    test(
        "MM-T2618 - Team Configuration Page: Group removal User removed from sync'ed team",
        {tag: '@ldap'},
        async ({pw}) => {
            const {adminClient, adminUser, team, board} = await setup(pw);
            await adminClient.linkGroupSyncable(board.id, team.id, 'team', {auto_add: true});
            const {page} = await pw.testBrowser.login(adminUser);
            const consolePage = new EnterpriseSystemConsolePage(page);

            // # Open the board group and remove its synchronized team
            await page.goto('/admin_console/user_management/groups');
            await expect(page.getByText('AD/LDAP Groups', {exact: true})).toBeVisible();
            await page.getByRole('link', {name: 'Edit', exact: true}).first().click();
            await expect(page.getByText(team.display_name, {exact: true})).toBeVisible();
            await consolePage.requestRemoveTeamOrChannel(team.display_name);

            // * Verify the removal warning identifies the team
            await expect(
                page.getByText(
                    `Removing this membership will prevent future users in this group from being added to the ${team.display_name} team.`,
                ),
            ).toBeVisible();

            // # Confirm and save
            await consolePage.confirmRemoveTeamOrChannel();
            await page.getByRole('button', {name: 'Save', exact: true}).click();
        },
    );

    /**
     * @objective Verify team management labels distinguish open and invite-only teams
     */
    test('MM-T2621 - Team List Management Column', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, adminUser, team} = await setup(pw);
        const inviteOnlyTeam = await adminClient.createTeam({...(await pw.random.team()), type: 'I'});
        await adminClient.updateTeam({...team, allow_open_invite: true});
        const {page} = await pw.testBrowser.login(adminUser);
        const consolePage = new EnterpriseSystemConsolePage(page);
        await page.goto('/admin_console/user_management/teams');

        // # Search for the open team
        await consolePage.searchManagementList(team.display_name);

        // * Verify it is labeled Anyone Can Join
        await consolePage.assertTeamManagementLabel(team.name, 'Anyone Can Join');

        // # Search for the invite-only team
        await consolePage.searchManagementList(inviteOnlyTeam.display_name);

        // * Verify it is labeled Invite Only
        await consolePage.assertTeamManagementLabel(inviteOnlyTeam.name, 'Invite Only');
    });

    /**
     * @objective Verify canceling a channel privacy change preserves public state and saving makes it private
     */
    test('MM-T2628 - List of Channels', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, adminUser, team, channel} = await setup(pw);
        const {page} = await pw.testBrowser.login(adminUser);
        const consolePage = new EnterpriseSystemConsolePage(page);

        // # Change the channel to private, cancel, and discard changes
        await consolePage.gotoChannelConfiguration(channel.id);
        await consolePage.setChannelPublic(false);
        await page.getByRole('link', {name: 'Cancel', exact: true}).click();
        await page.getByRole('button', {name: /Discard|Yes/}).click();
        await consolePage.gotoChannelConfiguration(channel.id);

        // * Verify the channel is still public
        await expect(page.getByRole('button', {name: 'Public', exact: true})).toBeVisible();

        // # Save the channel as private
        await consolePage.setChannelPublic(false);
        await consolePage.saveConfiguration(true);

        // * Verify the server persisted private channel state
        expect((await adminClient.getChannel(channel.id)).type).toBe('P');

        // # Browse channels from the team
        const {channelsPage} = await pw.testBrowser.login(adminUser);
        await channelsPage.goto(team.name, 'town-square');
        const modal = await channelsPage.openBrowseChannelsModal();
        await modal.searchInput.fill(channel.display_name);

        // * Verify the member can still find the private channel
        await expect(modal.container.getByText(channel.display_name, {exact: true})).toBeVisible();
    });

    /**
     * @objective Verify canceling and saving a private-to-public conversion behaves correctly and posts a system message
     */
    test('MM-T2629 - Private to public - More....', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, adminUser, team} = await setup(pw);
        const channel = await adminClient.createPrivateChannel(team.id, 'Private Channel');
        await adminClient.addToChannel(adminUser.id, channel.id);
        const {page} = await pw.testBrowser.login(adminUser);
        const consolePage = new EnterpriseSystemConsolePage(page);

        // # Change to public, cancel, and discard
        await consolePage.gotoChannelConfiguration(channel.id);
        await consolePage.setChannelPublic(true);
        await page.getByRole('link', {name: 'Cancel', exact: true}).click();
        await page.getByRole('button', {name: /Discard|Yes/}).click();
        expect((await adminClient.getChannel(channel.id)).type).toBe('P');

        // # Change to public and save
        await consolePage.gotoChannelConfiguration(channel.id);
        await consolePage.setChannelPublic(true);
        await consolePage.saveConfiguration(true);

        // * Verify public state persists
        expect((await adminClient.getChannel(channel.id)).type).toBe('O');

        // * Verify the conversion system message is posted
        const {channelsPage, page: channelsBrowserPage} = await pw.testBrowser.login(adminUser);
        await channelsPage.goto(team.name, channel.name);
        await expect(
            channelsBrowserPage
                .getByText('This channel has been converted to a Public Channel and can be joined by any team member')
                .last(),
        ).toBeVisible();
    });

    /**
     * @objective Verify Town Square disables both LDAP synchronization and privacy toggles. This consolidates MM-T4003_3 because it exercises the same immutable default-channel controls as MM-T2630.
     */
    test(
        'MM-T2630 MM-T4003_3 keeps default channel synchronization and privacy toggles disabled',
        {tag: '@ldap'},
        async ({pw}) => {
            const {adminClient, adminUser, team} = await setup(pw);
            const townSquare = await adminClient.getChannelByName(team.id, 'town-square');
            const {page} = await pw.testBrowser.login(adminUser);
            const consolePage = new EnterpriseSystemConsolePage(page);

            // # Open Town Square channel configuration
            await consolePage.gotoChannelConfiguration(townSquare.id);

            // * Verify its group synchronization and public/private controls are disabled
            await consolePage.assertDefaultChannelTogglesDisabled();
        },
    );

    /**
     * @objective Verify a non-member can follow a public permalink but not after the channel becomes private
     */
    test(
        'MM-T2638 - Permalink from when public does not auto-join (non-system-admin) after converting to private',
        {
            tag: '@ldap',
        },
        async ({pw}) => {
            const {adminClient, user, team, channel} = await setup(pw);
            const post = await adminClient.createPost({channel_id: channel.id, message: 'LDAP permalink visibility'});
            await adminClient.addToChannel(user.id, channel.id);
            await adminClient.removeFromChannel(user.id, channel.id);
            const {page} = await pw.testBrowser.login(user);

            // # Open the public channel permalink
            await page.goto(`/${team.name}/pl/${post.id}`);

            // * Verify the public message is visible
            await expect(page.getByText('LDAP permalink visibility')).toBeVisible();

            // # Leave the auto-joined public channel, convert it to private, and revisit
            await adminClient.removeFromChannel(user.id, channel.id);
            await adminClient.updateChannelPrivacy(channel.id, 'P');
            await page.reload();

            // * Verify the private message cannot be found
            await expect(page.getByRole('heading', {name: /(Message|Channel) Not Found/})).toBeVisible();
        },
    );

    /**
     * @objective Verify private-channel membership policy removes ordinary users' ability to add members
     */
    test('MM-T2639 - Policy settings (in System Console tests, likely)', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, user, team, channel} = await setup(pw);
        await adminClient.addToChannel(user.id, channel.id);
        const {channelsPage, page} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, channel.name);
        const [channelUserRole] = await adminClient.getRolesByNames(['channel_user']);
        const originalPermissions = channelUserRole.permissions;

        try {
            // # Open the channel members panel
            await page.getByRole('button', {name: 'Members', exact: true}).click();

            // * Verify members can initially be added
            await expect(page.getByRole('region', {name: 'Members'}).getByRole('button', {name: /Add$/})).toBeVisible();

            // # Convert the channel to private and remove the user's manage-private-channel permission
            await adminClient.updateChannelPrivacy(channel.id, 'P');
            await adminClient.patchRole(channelUserRole.id, {
                permissions: originalPermissions.filter(
                    (permission: string) => permission !== 'manage_private_channel_members',
                ),
            });
            await page.reload();
            await page.getByRole('button', {name: 'Members', exact: true}).click();

            // * Verify the user can no longer add members
            await expect(
                page.getByRole('region', {name: 'Members'}).getByRole('button', {name: /Add$/}),
            ).not.toBeVisible();
        } finally {
            await adminClient.patchRole(channelUserRole.id, {permissions: originalPermissions});
        }
    });

    /**
     * @objective Verify a non-member sees a public channel in the switcher but not after it becomes private
     */
    test(
        'MM-T2640 - Channel appears in channel switcher before conversion but not after (for non-members of the channel)',
        {
            tag: '@ldap',
        },
        async ({pw}) => {
            const {adminClient, user, team, channel} = await setup(pw);
            const publicChannel = await adminClient.createPublicChannel(team.id, 'Switcher Candidate');
            const {page} = await pw.testBrowser.login(user);
            await page.goto(`/${team.name}/channels/${channel.name}`);

            // # Search for the public channel in the channel switcher
            await page.getByRole('button', {name: /Find channel/i}).click();
            await page.getByRole('combobox', {name: 'quick switch input'}).fill(publicChannel.display_name);

            // * Verify the public channel is suggested
            await expect(page.getByText(publicChannel.display_name, {exact: true})).toBeVisible();

            // # Convert the candidate to private and search again
            await adminClient.updateChannelPrivacy(publicChannel.id, 'P');
            await page.getByRole('combobox', {name: 'quick switch input'}).fill('');
            await page.getByRole('combobox', {name: 'quick switch input'}).fill(publicChannel.display_name);

            // * Verify there are no results
            await expect(page.getByText(/No results for/)).toBeVisible();
        },
    );

    /**
     * @objective Verify Browse Channels lists a public channel but not after conversion to private
     */
    test(
        'MM-T2641 - Channel appears in More... under Public Channels before conversion but not after',
        {tag: '@ldap'},
        async ({pw}) => {
            const {adminClient, user, team} = await setup(pw);
            const publicChannel = await adminClient.createPublicChannel(team.id, 'Browse Candidate');
            const {channelsPage} = await pw.testBrowser.login(user);
            await channelsPage.goto(team.name, 'off-topic');
            let modal = await channelsPage.openBrowseChannelsModal();

            // # Search Browse Channels for the public channel
            await modal.searchInput.fill(publicChannel.display_name);

            // * Verify the public channel is listed
            await expect(modal.container.getByText(publicChannel.display_name, {exact: true})).toBeVisible();

            // # Convert it to private and search again
            await modal.close();
            await adminClient.updateChannelPrivacy(publicChannel.id, 'P');
            modal = await channelsPage.openBrowseChannelsModal();
            await modal.searchInput.fill(publicChannel.display_name);

            // * Verify the private channel is absent
            await expect(modal.container.getByText(/No results for/)).toBeVisible();
        },
    );

    /**
     * @objective Verify outgoing webhook channel options omit channels after conversion to private
     */
    test(
        'MM-T2642 - Channel appears in Integrations options before conversion but not after',
        {tag: '@ldap'},
        async ({pw}) => {
            const {adminClient, adminUser, team, channel} = await setup(pw);
            const {page} = await pw.testBrowser.login(adminUser);

            // # Open the outgoing webhook creation page
            await page.goto(`/${team.name}/integrations/outgoing_webhooks/add`);
            const channelSelect = page.getByRole('combobox').filter({
                has: page.getByRole('option', {name: '--- Select a channel ---', exact: true}),
            });

            // * Verify the public channel appears in the channel options
            await expect(channelSelect.getByRole('option', {name: channel.display_name})).toHaveCount(1);

            // # Convert the channel to private and reload the integration page
            await adminClient.updateChannelPrivacy(channel.id, 'P');
            await page.reload();

            // * Verify the private channel is omitted
            await expect(channelSelect.getByRole('option', {name: channel.display_name})).toHaveCount(0);
        },
    );
});
