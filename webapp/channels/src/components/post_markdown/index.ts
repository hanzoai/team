// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type ConnectedProps, connect} from 'react-redux';

import type {Channel} from '@hanzoteam/types/channels';
import type {Post} from '@hanzoteam/types/posts';

import {createSelector} from '@hanzoteam/redux/selectors/create_selector';
import {getChannel} from '@hanzoteam/redux/selectors/entities/channels';
import {getSubscriptionProduct} from '@hanzoteam/redux/selectors/entities/cloud';
import {getConfig, getLicense} from '@hanzoteam/redux/selectors/entities/general';
import {
    getMyGroupMentionKeysForChannel,
    getMyGroupMentionKeys,
} from '@hanzoteam/redux/selectors/entities/groups';
import {getBool} from '@hanzoteam/redux/selectors/entities/preferences';
import {getCurrentTeam} from '@hanzoteam/redux/selectors/entities/teams';
import {getCurrentTimezone} from '@hanzoteam/redux/selectors/entities/timezone';
import {getCurrentUserMentionKeys, getHighlightWithoutNotificationKeys} from '@hanzoteam/redux/selectors/entities/users';

import {canManageMembers} from 'utils/channel_utils';
import {Preferences} from 'utils/constants';
import {isEnterpriseOrCloudOrSKUStarterFree} from 'utils/license_utils';
import type {MentionKey} from 'utils/text_formatting';

import type {GlobalState} from 'types/store';

import PostMarkdown, {type OwnProps} from './post_markdown';

export function makeGetMentionKeysForPost(): (
    state: GlobalState,
    post?: Post,
    channel?: Channel,
) => MentionKey[] {
    return createSelector(
        'makeGetMentionKeysForPost',
        getCurrentUserMentionKeys,
        (state: GlobalState, post?: Post) => post,
        (state: GlobalState, post?: Post, channel?: Channel) =>
            (channel ? getMyGroupMentionKeysForChannel(state, channel.team_id, channel.id) : getMyGroupMentionKeys(state, false)),
        (mentionKeysWithoutGroups, post, groupMentionKeys) => {
            let mentionKeys = mentionKeysWithoutGroups;
            if (!post?.props?.disable_group_highlight) {
                mentionKeys = mentionKeys.concat(groupMentionKeys);
            }

            if (post?.props?.mentionHighlightDisabled) {
                mentionKeys = mentionKeys.filter(
                    (value) => !['@all', '@channel', '@here'].includes(value.key),
                );
            }

            return mentionKeys;
        },
    );
}

export function hasPluginTooltips(linkTooltip?: unknown[]): boolean {
    return Boolean(linkTooltip?.length);
}

function makeMapStateToProps() {
    const getMentionKeysForPost = makeGetMentionKeysForPost();

    return (state: GlobalState, ownProps: OwnProps) => {
        const channel = getChannel(state, ownProps.channelId);
        const currentTeam = getCurrentTeam(state);

        const license = getLicense(state);
        const subscriptionProduct = getSubscriptionProduct(state);

        const config = getConfig(state);
        const isEnterpriseReady = config.BuildEnterpriseReady === 'true';

        return {
            channel,
            currentTeam,
            pluginHooks: state.plugins.components.MessageWillFormat,
            hasPluginTooltips: hasPluginTooltips(state.plugins.components.LinkTooltip),
            isUserCanManageMembers: channel && canManageMembers(state, channel),
            mentionKeys: getMentionKeysForPost(state, ownProps.post, channel),
            highlightKeys: getHighlightWithoutNotificationKeys(state),
            isMilitaryTime: getBool(state, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.USE_MILITARY_TIME, false),
            timezone: getCurrentTimezone(state),
            hideGuestTags: getConfig(state).HideGuestTags === 'true',
            isEnterpriseOrCloudOrSKUStarterFree: isEnterpriseOrCloudOrSKUStarterFree(license, subscriptionProduct, isEnterpriseReady),
            isEnterpriseReady,
            renderEmoticonsAsEmoji: getBool(state, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.RENDER_EMOTICONS_AS_EMOJI, Preferences.RENDER_EMOTICONS_AS_EMOJI_DEFAULT === 'true'),
        };
    };
}

const connector = connect(makeMapStateToProps);

export type PropsFromRedux = ConnectedProps<typeof connector>;

export default connector(PostMarkdown);
