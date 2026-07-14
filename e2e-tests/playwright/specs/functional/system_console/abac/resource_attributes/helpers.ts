// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Client4} from '@mattermost/client';

/**
 * Helpers for exercising resource.attributes.* (channel custom profile
 * attributes) end to end. The subject of a policy stays the user; these helpers
 * provision the *resource* side — channel-object-type CPA fields in the
 * access_control group and per-channel values — plus API-driven policy authoring
 * so the tests never depend on the (deferred) all-channels editor UI.
 */

const PROPERTY_GROUP = 'access_control';
const CHANNEL_OBJECT_TYPE = 'channel';

/**
 * Create a channel-object-type text CPA field in the access_control group. The
 * ABAC materialized view surfaces it as resource.attributes.<name>. Marked
 * admin-managed so SavePolicy's name normalization accepts a reference to it
 * (channel fields have no user-managed-attributes toggle). Returns the field id.
 */
export async function createChannelTextField(adminClient: Client4, name: string): Promise<string> {
    const field = await adminClient.createPropertyField(PROPERTY_GROUP, CHANNEL_OBJECT_TYPE, {
        name,
        type: 'text',
        target_type: 'system',
        target_id: '',
        attrs: {managed: 'admin'},
    } as Parameters<Client4['createPropertyField']>[2]);
    return field.id;
}

/**
 * Set a single channel's value for a channel CPA field. Call
 * refresh-before-read is not needed for the sync lane (the sync job reads a
 * freshly refreshed matview), but note the matview is refreshed on a timer, so
 * set values before triggering the sync job.
 */
export async function setChannelAttributeValue(
    adminClient: Client4,
    channelId: string,
    fieldId: string,
    value: string,
): Promise<void> {
    await adminClient.patchPropertyValues(PROPERTY_GROUP, CHANNEL_OBJECT_TYPE, channelId, [{field_id: fieldId, value}]);
}

type ParentPolicyOptions = {
    name: string;
    expression: string;
    appliesToAllChannels?: boolean;
    version?: string;
};

/**
 * Create a parent membership policy via the REST API. A parent is the reusable
 * rule-carrier: assign channels to it (assignChannelsToPolicy) or mark it
 * applies_to_all_channels. `applies_to_all_channels` is sent raw because the
 * webapp policy type does not yet carry it (the editor toggle is deferred).
 * Returns the created policy id.
 */
export async function createParentPolicyViaAPI(adminClient: Client4, opts: ParentPolicyOptions): Promise<string> {
    const body: Record<string, unknown> = {
        id: '',
        name: opts.name,
        type: 'parent',
        version: opts.version ?? 'v0.3',
        revision: 0,
        active: true,
        rules: [{expression: opts.expression, actions: ['membership']}],
    };
    if (opts.appliesToAllChannels) {
        body.applies_to_all_channels = true;
    }
    const policy = await (adminClient as any).doFetch(`${adminClient.getBaseRoute()}/access_control_policies`, {
        method: 'put',
        body: JSON.stringify(body),
    });
    return policy.id as string;
}

/**
 * Assign channels to a parent policy (creates the per-channel child policy that
 * imports the parent and flips enforcement on). Mirrors the System Console
 * "Add channels" flow.
 */
export async function assignChannelsToPolicy(
    adminClient: Client4,
    policyId: string,
    channelIds: string[],
): Promise<void> {
    // The /assign endpoint returns 200 with an empty body but a JSON content
    // type, which Client4.doFetch chokes on ("Unexpected end of JSON input").
    // Use a raw request and check status, matching the pattern the rest of the
    // ABAC e2e helpers use for these no-body endpoints.
    const res = await fetch(`${adminClient.getBaseRoute()}/access_control_policies/${policyId}/assign`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Authorization: `Bearer ${adminClient.getToken()}`},
        body: JSON.stringify({channel_ids: channelIds}),
    });
    if (!res.ok) {
        throw new Error(`assign channels failed: ${res.status} ${await res.text()}`);
    }
}

/**
 * Trigger an access_control_sync job. Pass a policyId to target the channels
 * governed by that policy (for an all-channels parent this backfills and syncs
 * its materialized children); omit it for a global sweep. Returns the job id.
 */
export async function triggerSyncJob(adminClient: Client4, policyId?: string): Promise<string> {
    const job = await adminClient.createAccessControlSyncJob(policyId ? {policy_id: policyId} : {});
    return job.id;
}
