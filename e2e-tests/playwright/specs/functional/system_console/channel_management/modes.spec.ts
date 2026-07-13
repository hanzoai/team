// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {EnterpriseSystemConsolePage, expect, initializeOpenLdap, test} from '@mattermost/playwright-lib';

test.describe('LDAP channel management modes', () => {
    async function setup(pw: any) {
        await pw.ensureLicense();
        await pw.skipIfNoLicense();
        const {adminClient, adminUser} = await pw.getAdminClient();
        await initializeOpenLdap(adminClient);
        const team = await adminClient.createTeam(await pw.random.team());
        await adminClient.addToTeam(team.id, adminUser.id);
        const channel = await adminClient.createPublicChannel(team.id, 'Test Channel');
        const {page} = await pw.testBrowser.login(adminUser);
        return {adminClient, channel, consolePage: new EnterpriseSystemConsolePage(page)};
    }

    /**
     * @objective Verify a system administrator can persist public and private channel modes
     */
    test(
        'MM-T4003_1 changes channel privacy in both directions using the mode toggle',
        {tag: '@ldap'},
        async ({pw}) => {
            const {adminClient, channel, consolePage} = await setup(pw);
            expect(channel.type).toBe('O');

            // # Change and save the public channel as private
            await consolePage.gotoChannelConfiguration(channel.id);
            await consolePage.setChannelPublic(false);
            await consolePage.saveConfiguration(true);

            // * Verify private mode is persisted
            expect((await adminClient.getChannel(channel.id)).type).toBe('P');

            // # Change and save the private channel as public
            await consolePage.gotoChannelConfiguration(channel.id);
            await consolePage.setChannelPublic(true);
            await consolePage.saveConfiguration(true);

            // * Verify public mode is persisted
            expect((await adminClient.getChannel(channel.id)).type).toBe('O');
        },
    );

    /**
     * @objective Verify resetting group synchronization does not change an unsaved channel privacy selection
     */
    test(
        'MM-T4003_2 preserves the channel privacy selection when group sync is toggled twice',
        {tag: '@ldap'},
        async ({pw}) => {
            const {channel, consolePage} = await setup(pw);
            await consolePage.gotoChannelConfiguration(channel.id);

            // # Enable and disable group synchronization
            await consolePage.toggleSyncGroupMembers();
            await consolePage.toggleSyncGroupMembers();

            // * Verify the channel remains public
            await consolePage.assertChannelMode('Public');

            // # Select private mode, then enable and disable group synchronization again
            await consolePage.setChannelPublic(false);
            await consolePage.toggleSyncGroupMembers();
            await consolePage.toggleSyncGroupMembers();

            // * Verify the unsaved private selection remains selected
            await consolePage.assertChannelMode('Private');
        },
    );
});
