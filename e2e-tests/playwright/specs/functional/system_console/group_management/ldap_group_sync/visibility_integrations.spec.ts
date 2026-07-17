// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelsPage, OutgoingWebhookForm, test} from '@mattermost/playwright-lib';

import {initializeLdapGroupSync, setupLdapGroupSync} from './support';

test.describe('LDAP group-synchronized channel visibility and integrations', () => {
    test.describe.configure({mode: 'serial'});

    test.beforeEach(async ({pw}) => {
        await initializeLdapGroupSync(pw);
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
            const {adminClient, user, team, channel} = await setupLdapGroupSync(pw);
            const publicChannel = await adminClient.createPublicChannel(team.id, 'Switcher Candidate');
            const {page} = await pw.testBrowser.login(user);
            const channelsPage = new ChannelsPage(page);
            await page.goto(`/${team.name}/channels/${channel.name}`);

            // # Search for the public channel in the channel switcher
            const findChannelsModal = await channelsPage.openFindChannelsModal();
            await findChannelsModal.search(publicChannel.display_name);

            // * Verify the public channel is suggested
            await findChannelsModal.expectResultVisible(publicChannel.display_name);

            // # Convert the candidate to private and search again
            await adminClient.updateChannelPrivacy(publicChannel.id, 'P');
            await findChannelsModal.search('');
            await findChannelsModal.search(publicChannel.display_name);

            // * Verify there are no results
            await findChannelsModal.expectNoResults();
        },
    );

    /**
     * @objective Verify Browse Channels lists a public channel but not after conversion to private
     */
    test(
        'MM-T2641 - Channel appears in More... under Public Channels before conversion but not after',
        {tag: '@ldap'},
        async ({pw}) => {
            const {adminClient, user, team} = await setupLdapGroupSync(pw);
            const publicChannel = await adminClient.createPublicChannel(team.id, 'Browse Candidate');
            const {channelsPage} = await pw.testBrowser.login(user);
            await channelsPage.goto(team.name, 'off-topic');
            let modal = await channelsPage.openBrowseChannelsModal();

            // # Search Browse Channels for the public channel
            await modal.searchInput.fill(publicChannel.display_name);

            // * Verify the public channel is listed
            await modal.expectChannelVisible(publicChannel.display_name);

            // # Convert it to private and search again
            await modal.close();
            await adminClient.updateChannelPrivacy(publicChannel.id, 'P');
            modal = await channelsPage.openBrowseChannelsModal();
            await modal.searchInput.fill(publicChannel.display_name);

            // * Verify the private channel is absent
            await modal.expectNoResults();
        },
    );

    /**
     * @objective Verify outgoing webhook channel options omit channels after conversion to private
     */
    test(
        'MM-T2642 - Channel appears in Integrations options before conversion but not after',
        {tag: '@ldap'},
        async ({pw}) => {
            const {adminClient, adminUser, team, channel} = await setupLdapGroupSync(pw);
            const {page} = await pw.testBrowser.login(adminUser);
            const webhookForm = new OutgoingWebhookForm(page);

            // # Open the outgoing webhook creation page
            await webhookForm.goto(team.name);

            // * Verify the public channel appears in the channel options
            await webhookForm.expectChannelOptionCount(channel.display_name, 1);

            // # Convert the channel to private and reload the integration page
            await adminClient.updateChannelPrivacy(channel.id, 'P');
            await page.reload();

            // * Verify the private channel is omitted
            await webhookForm.expectChannelOptionCount(channel.display_name, 0);
        },
    );
});
