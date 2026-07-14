// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect, test, verifyUserInChannel} from '@mattermost/playwright-lib';

import type {CustomProfileAttribute} from '../../../channels/custom_profile_attributes/helpers';
import {setupCustomProfileAttributeFields} from '../../../channels/custom_profile_attributes/helpers';
import {createPrivateChannelForABAC, createUserForABAC, enableUserManagedAttributes} from '../support';

import {createChannelTextField, createParentPolicyViaAPI, setChannelAttributeValue} from './helpers';

/**
 * All-channels scope for a resource.attributes.* parent (materialized children).
 *
 * An active parent policy marked applies_to_all_channels governs every eligible
 * private channel by materializing a real per-channel child policy that imports
 * the parent — a `channel`-type row with id == channelId — instead of a
 * read-time merge. There is no rowless governed channel: the channel's
 * PolicyEnforced flag is flipped on, and every downstream reader (join gate,
 * membership sync, visibility) sees a normal per-channel policy.
 *
 * We assert the distinctive seam: creating a private channel while the parent is
 * active synchronously materializes its child, flips PolicyEnforced on, and the
 * join gate (which reads PolicyEnforced) then admits a matching user and rejects
 * a non-matching one.
 *
 * NOTE: an active all-channels parent governs EVERY eligible private channel in
 * the install. Saving one enqueues a backfill that materializes children across
 * the install and syncs their membership, so this spec is destructive to sibling
 * ABAC specs if run concurrently — it must run serially / isolated
 * (@abac_all_channels) and deletes the policy in finally, which cascades removal
 * of the materialized children. The webapp toggle, blast-radius confirmation,
 * and dry-run preview are deferred (Phase 8 webapp chunk) and are not exercised
 * here.
 */
test.describe('ABAC resource.attributes - all-channels scope', {tag: ['@abac', '@abac_all_channels']}, () => {
    test('an active all-channels parent materializes a child that enforces on a new private channel', async ({pw}) => {
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

        let policyId = '';
        try {
            // Activate the all-channels parent FIRST, then create the channel: the
            // synchronous channel-create hook materializes the child under the
            // active parent, so the test doesn't depend on the async backfill
            // sweep to govern its own channel.
            policyId = await createParentPolicyViaAPI(adminClient, {
                name: `AllChannels ${pw.random.id()}`,
                expression: `user.attributes.${attr} == resource.attributes.${attr}`,
                appliesToAllChannels: true,
            });

            const channel = await createPrivateChannelForABAC(adminClient, team.id);
            await setChannelAttributeValue(adminClient, channel.id, channelFieldId, 'us');

            // Materialization signal: a real per-channel child policy now governs
            // the channel and its PolicyEnforced flag is flipped on — this is what
            // the join gate reads (no virtual merge, no rowless private channel).
            await expect(async () => {
                const enforcedChannel = await adminClient.getChannel(channel.id);
                expect(enforcedChannel.policy_enforced).toBe(true);
            }).toPass({timeout: 30000, intervals: [1000]});

            // The materialized child is a `channel`-type row (id == channelId) that
            // imports the parent — exactly like an explicitly-assigned channel.
            const child = await adminClient.getAccessControlPolicy(channel.id);
            expect(child.type).toBe('channel');
            expect(child.imports).toContain(policyId);

            // Enforcement gate, driven by PolicyEnforced: the matching user is
            // admitted; the non-matching user is rejected.
            //
            // The runtime PDP reads channel/user values from a materialized view
            // refreshed on a throttled (~30s) cadence, so the values set just
            // above may not be visible immediately — the join would then hit
            // deny-on-miss. Retry the matching-user join until the view catches up.
            await expect(async () => {
                try {
                    await adminClient.addToChannel(matchingUser.id, channel.id);
                } catch {
                    // matview not yet refreshed; retry
                }
                expect(await verifyUserInChannel(adminClient, matchingUser.id, channel.id)).toBe(true);
            }).toPass({timeout: 90000, intervals: [3000]});

            try {
                await adminClient.addToChannel(nonMatchingUser.id, channel.id);
            } catch {
                // expected: the materialized child denies the non-matching user
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
