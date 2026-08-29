// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {GlobalState} from '@hanzoteam/types/store';

import {createSelector} from '@hanzoteam/redux/selectors/create_selector';
import {getMyGroupMentionKeys} from '@hanzoteam/redux/selectors/entities/groups';
import {getCurrentTeamId} from '@hanzoteam/redux/selectors/entities/teams';
import {getCurrentUserMentionKeys} from '@hanzoteam/redux/selectors/entities/users';
import type {UserMentionKey} from '@hanzoteam/redux/selectors/entities/users';

export const getCurrentSearchForCurrentTeam: (state: GlobalState) => string = createSelector(
    'getCurrentSearchForCurrentTeam',
    (state: GlobalState) => state.entities.search.current,
    getCurrentTeamId,
    (current, teamId) => {
        return current[teamId];
    },
);

export const getAllUserMentionKeys: (state: GlobalState) => UserMentionKey[] = createSelector(
    'getAllUserMentionKeys',
    getCurrentUserMentionKeys,
    (state: GlobalState) => getMyGroupMentionKeys(state, false),
    (userMentionKeys, groupMentionKeys) => {
        return userMentionKeys.concat(groupMentionKeys);
    },
);

export const getSearchTruncationInfo = (state: GlobalState) => {
    return state.entities.search.truncationInfo;
};

export const isSearchTruncated = (state: GlobalState, searchType: 'posts' | 'files'): boolean => {
    const truncationInfo = getSearchTruncationInfo(state);
    return Boolean(truncationInfo && truncationInfo[searchType] > 0);
};
