// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect, test, verifyUserInChannel} from '@mattermost/playwright-lib';

import type {CustomProfileAttribute} from '../../../channels/custom_profile_attributes/helpers';
import {setupCustomProfileAttributeFields} from '../../../channels/custom_profile_attributes/helpers';
import {createPrivateChannelForABAC, createUserForABAC, enableUserManagedAttributes} from '../support';

import {createChannelTextField, createParentPolicyViaAPI, setChannelAttributeValue} from './helpers';

/**
 * All-channels virtual scope for a resource.attributes.* parent.
 *
 * An active parent policy marked applies_to_all_channels governs every eligible
 * private channel with no explicit assignment and no per-channel policy row. We
 * assert the distinctive seam: enforcement fires on a private channel that has
 * NO policy of its own — a matching user can be added, a non-matching one cannot.
 *
 * NOTE: an all-channels policy gates EVERY private channel in the install, so
 * this test is destructive to sibling tests if run concurrently. It deliberately
 * avoids triggering a global sync sweep (which would remove members from
 * unrelated private channels) and asserts only the runtime enforcement gate on
 * its own channel. It must run serially / isolated from other ABAC specs, and
 * deletes the policy in finally to bound the blast radius. The webapp toggle,
 * blast-radius confirmation, and dry-run preview are deferred (Phase 8 webapp
 * chunk) and are not exercised here.
 */
test.describe('ABAC resource.attributes - all-channels scope', {tag: ['@abac', '@abac_all_channels']}, () => {
    test('an active all-channels parent enforces on a channel with no own policy', async ({pw}) => {
        test.setTimeout(120000);
        await pw.skipIfNoLicense();

        const {adminClient, team} = await pw.initSetup();
        await enableUserManagedAttributes(adminClient);
        await adminClient.patchConfig({
            AccessControlSettings: {EnableAttributeBasedAccessControl: true},
        } as Parameters<typeof adminClient.patchConfig>[0]);

        const attr = `region${pw.random.id()}`;
        const userAttribute: CustomProfileAttribute[] = [{name: attr, type: 'text', value: ''}];
        const attributeFieldsMap = await setupCustomProfileAttributeFields(adminClient, userAttribute);
        const channelFieldId = await createChannelTextField(adminClient, attr);

        const matchingUser = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: attr, type: 'text', value: 'us'},
        ]);
        const nonMatchingUser = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: attr, type: 'text', value: 'eu'},
        ]);
        await adminClient.addToTeam(team.id, matchingUser.id);
        await adminClient.addToTeam(team.id, nonMatchingUser.id);

        // A private channel with NO policy row of its own — only the all-channels
        // parent should govern it.
        const channel = await createPrivateChannelForABAC(adminClient, team.id);
        await setChannelAttributeValue(adminClient, channel.id, channelFieldId, 'us');

        let policyId = '';
        try {
            policyId = await createParentPolicyViaAPI(adminClient, {
                name: `AllChannels ${pw.random.id()}`,
                expression: `user.attributes.${attr} == resource.attributes.${attr}`,
                appliesToAllChannels: true,
            });

            // Enforcement gate: the channel has no own policy, but the active
            // all-channels parent makes it access-controlled. The matching user
            // is admitted; the non-matching user is rejected.
            await adminClient.addToChannel(matchingUser.id, channel.id);
            expect(await verifyUserInChannel(adminClient, matchingUser.id, channel.id)).toBe(true);

            try {
                await adminClient.addToChannel(nonMatchingUser.id, channel.id);
            } catch {
                // expected: all-channels policy denies the non-matching user
            }
            expect(await verifyUserInChannel(adminClient, nonMatchingUser.id, channel.id)).toBe(false);
        } finally {
            if (policyId) {
                try {
                    await adminClient.deleteAccessControlPolicy(policyId);
                } catch {
                    // best-effort: bound the blast radius even if the test failed
                }
            }
        }
    });
});
