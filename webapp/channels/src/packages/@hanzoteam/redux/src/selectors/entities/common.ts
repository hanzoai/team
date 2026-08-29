// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {ChannelMembership, Channel} from '@hanzoteam/types/channels';
import type {GlobalState} from '@hanzoteam/types/store';
import type {TeamMembership} from '@hanzoteam/types/teams';
import type {UserProfile} from '@hanzoteam/types/users';
import type {RelationOneToOne, IDMappedObjects} from '@hanzoteam/types/utilities';

import {createSelector} from '@hanzoteam/redux/selectors/create_selector';

// Channels

export function getCurrentChannelId(state: GlobalState): string {
    return state.entities.channels.currentChannelId;
}

export function getMyChannelMemberships(state: GlobalState): RelationOneToOne<Channel, ChannelMembership> {
    return state.entities.channels.myMembers;
}

export const getMyCurrentChannelMembership: (a: GlobalState) => ChannelMembership | undefined = createSelector(
    'getMyCurrentChannelMembership',
    getCurrentChannelId,
    getMyChannelMemberships,
    (currentChannelId, channelMemberships) => {
        return channelMemberships[currentChannelId];
    },
);

export function getMembersInChannel(state: GlobalState, channelId: string): Record<string, ChannelMembership> {
    return state.entities.channels?.membersInChannel?.[channelId] || {};
}

// Teams

export function getMembersInTeam(state: GlobalState, teamId: string): RelationOneToOne<UserProfile, TeamMembership> {
    return state.entities.teams?.membersInTeam?.[teamId] || {};
}

// Users

export function getCurrentUser(state: GlobalState): UserProfile {
    return state.entities.users.profiles[getCurrentUserId(state)];
}

export function getCurrentUserEmail(state: GlobalState): UserProfile['email'] {
    return getCurrentUser(state)?.email;
}

export function getCurrentUserId(state: GlobalState): string {
    return state.entities.users.currentUserId;
}

export function getUsers(state: GlobalState): IDMappedObjects<UserProfile> {
    return state.entities.users.profiles;
}

// Config
export const getIsUserStatusesConfigEnabled: (a: GlobalState) => boolean = createSelector(
    'getIsUserStatusesConfigEnabled',
    (state: GlobalState) => state.entities.general.config.EnableUserStatuses,
    (EnableUserStatuses) => EnableUserStatuses !== 'false',
);
