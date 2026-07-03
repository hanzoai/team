// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {GlobalState} from '@mattermost/types/store';
import type {Post} from '@mattermost/types/posts';

import {isPostEphemeral} from 'mattermost-redux/utils/post_utils';

import {isAddMemberProps} from 'components/post_markdown/system_message_helpers';

import {ActionTypes} from 'utils/constants';

import type {ActionFunc} from 'types/store';

export const OUT_OF_CHANNEL_EPHEMERAL_SUPPRESS_TTL_MS = 10000;

export type SuppressOutOfChannelEphemeral = {
    channelId: string;
    rootId: string;
    expireAt: number;
};

export function suppressOutOfChannelEphemeralPost(channelId: string, rootId = ''): ActionFunc {
    return (dispatch) => {
        dispatch({
            type: ActionTypes.SUPPRESS_OUT_OF_CHANNEL_EPHEMERAL,
            data: {
                channelId,
                rootId,
                expireAt: Date.now() + OUT_OF_CHANNEL_EPHEMERAL_SUPPRESS_TTL_MS,
            },
        });
        return {data: true};
    };
}

export function getSuppressOutOfChannelEphemeral(state: GlobalState): SuppressOutOfChannelEphemeral | null {
    const suppress = state.views.posts.suppressOutOfChannelEphemeral;
    if (!suppress || Date.now() >= suppress.expireAt) {
        return null;
    }
    return suppress;
}

export function isOutOfChannelMentionEphemeralPost(post: Pick<Post, 'props'>): boolean {
    return isAddMemberProps(post.props?.add_channel_member);
}

export function shouldSuppressOutOfChannelEphemeralPost(state: GlobalState, post: {channel_id: string; root_id?: string; type?: string; props?: Post['props']}): boolean {
    if (!isPostEphemeral(post as Parameters<typeof isPostEphemeral>[0])) {
        return false;
    }

    if (!isOutOfChannelMentionEphemeralPost(post)) {
        return false;
    }

    const suppress = getSuppressOutOfChannelEphemeral(state);
    if (!suppress) {
        return false;
    }

    if (post.channel_id !== suppress.channelId) {
        return false;
    }

    return (post.root_id || '') === suppress.rootId;
}
