// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Channel} from '@hanzoteam/types/channels';

import {fetchMissingChannels} from '@hanzoteam/redux/actions/channels';
import {getChannel} from '@hanzoteam/redux/selectors/entities/channels';

import {makeUseEntity} from 'components/common/hooks/useEntity';

export const useChannel = makeUseEntity<Channel>({
    name: 'useChannel',
    fetch: (channelId: string) => fetchMissingChannels([channelId]),
    selector: getChannel,
});
