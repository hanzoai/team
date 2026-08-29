// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {GlobalState} from '@hanzoteam/types/store';
import type {Typing} from '@hanzoteam/types/typing';
import type {UserProfile} from '@hanzoteam/types/users';
import type {IDMappedObjects} from '@hanzoteam/types/utilities';

import {createSelector} from '@hanzoteam/redux/selectors/create_selector';
import {getUsers} from '@hanzoteam/redux/selectors/entities/common';
import {getTeammateNameDisplaySetting} from '@hanzoteam/redux/selectors/entities/preferences';
import {displayUsername} from '@hanzoteam/redux/utils/user_utils';

const getUsersTypingImpl = (profiles: IDMappedObjects<UserProfile>, teammateNameDisplay: string, channelId: string, parentPostId: string, typing: Typing): string[] => {
    const id = channelId + parentPostId;

    if (typing[id]) {
        const users = Object.keys(typing[id]);

        if (users.length) {
            return users.map((userId) => {
                return displayUsername(profiles[userId], teammateNameDisplay);
            });
        }
    }

    return [];
};

export function makeGetUsersTypingByChannelAndPost(): (state: GlobalState, props: {channelId: string; postId: string}) => string[] {
    return createSelector(
        'makeGetUsersTypingByChannelAndPost',
        getUsers,
        getTeammateNameDisplaySetting,
        (state: GlobalState, options: {channelId: string; postId: string}) => options.channelId,
        (state: GlobalState, options: {channelId: string; postId: string}) => options.postId,
        (state: GlobalState) => state.entities.typing,
        getUsersTypingImpl,
    );
}
