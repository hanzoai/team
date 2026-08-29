// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {channelBannerEnabled} from '@hanzoteam/types/channels';
import type {GlobalState} from '@hanzoteam/types/store';

import {General} from '@hanzoteam/redux/constants';
import {getChannel, getChannelBanner} from '@hanzoteam/redux/selectors/entities/channels';

export const selectShowChannelBanner = (state: GlobalState, channelId: string): boolean => {
    const channelBannerInfo = getChannelBanner(state, channelId);
    const channel = getChannel(state, channelId);
    const isValidChannelType = Boolean(channel && (channel.type === General.OPEN_CHANNEL || channel.type === General.PRIVATE_CHANNEL));
    return isValidChannelType && channelBannerEnabled(channelBannerInfo);
};
