// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers} from 'redux';

import type {Channel} from '@hanzoteam/types/channels';

import {ChannelTypes, UserTypes} from '@hanzoteam/redux/action_types';

import type {MMAction} from 'types/store';

function channels(state: string[] = [], action: MMAction) {
    switch (action.type) {
    case ChannelTypes.RECEIVED_ALL_CHANNELS:
        return action.data.map((v: Channel) => v.id);
    case UserTypes.LOGOUT_SUCCESS:
        return [];
    default:
        return state;
    }
}

export default combineReducers({
    channels,
});
