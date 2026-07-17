// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelsPage, test} from '@mattermost/playwright-lib';

import {initializeLdapGroupSync, setupLdapGroupSync} from './support';

test.describe('LDAP group-synchronized channel access and policy', () => {
    test.describe.configure({mode: 'serial'});

    test.beforeEach(async ({pw}) => {
        await initializeLdapGroupSync(pw);
    });

    /**
     * @objective Verify a non-member can follow a public permalink but not after the channel becomes private
     */
    test(
        'MM-T2638 - Permalink from when public does not auto-join (non-system-admin) after converting to private',
        {
            tag: '@ldap',
        },
        async ({pw}) => {
            const {adminClient, user, team, channel} = await setupLdapGroupSync(pw);
            const post = await adminClient.createPost({channel_id: channel.id, message: 'LDAP permalink visibility'});
            await adminClient.addToChannel(user.id, channel.id);
            await adminClient.removeFromChannel(user.id, channel.id);
            const {page} = await pw.testBrowser.login(user);
            const channelsPage = new ChannelsPage(page);

            // # Open the public channel permalink
            await page.goto(`/${team.name}/pl/${post.id}`);

            // * Verify the public message is visible
            await channelsPage.expectMessageVisible('LDAP permalink visibility');

            // # Leave the auto-joined public channel, convert it to private, and revisit
            await adminClient.removeFromChannel(user.id, channel.id);
            await adminClient.updateChannelPrivacy(channel.id, 'P');
            await page.reload();

            // * Verify the private message cannot be found
            await channelsPage.expectPermalinkNotFound();
        },
    );

    /**
     * @objective Verify private-channel membership policy removes ordinary users' ability to add members
     */
    test('MM-T2639 - Policy settings (in System Console tests, likely)', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, user, team, channel} = await setupLdapGroupSync(pw);
        await adminClient.addToChannel(user.id, channel.id);
        const {channelsPage, page} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, channel.name);
        const [channelUserRole] = await adminClient.getRolesByNames(['channel_user']);
        const originalPermissions = channelUserRole.permissions;

        try {
            // # Open the channel members panel
            await channelsPage.openChannelMembersPanel();

            // * Verify members can initially be added
            await channelsPage.expectCanAddChannelMembers(true);

            // # Convert the channel to private and remove the user's manage-private-channel permission
            await adminClient.updateChannelPrivacy(channel.id, 'P');
            await adminClient.patchRole(channelUserRole.id, {
                permissions: originalPermissions.filter(
                    (permission: string) => permission !== 'manage_private_channel_members',
                ),
            });
            await page.reload();
            await channelsPage.openChannelMembersPanel();

            // * Verify the user can no longer add members
            await channelsPage.expectCanAddChannelMembers(false);
        } finally {
            await adminClient.patchRole(channelUserRole.id, {permissions: originalPermissions});
        }
    });
});
