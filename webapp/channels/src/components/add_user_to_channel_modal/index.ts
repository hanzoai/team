// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import type {GlobalState} from '@hanzoteam/types/store';

import {addChannelMember, getChannelMember, autocompleteChannelsForSearch} from '@hanzoteam/redux/actions/channels';
import {getChannelMembersInChannels} from '@hanzoteam/redux/selectors/entities/channels';

import AddUserToChannelModal from './add_user_to_channel_modal';

function mapStateToProps(state: GlobalState) {
    const channelMembers = getChannelMembersInChannels(state) || {};
    return {
        channelMembers,
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            addChannelMember,
            getChannelMember,
            autocompleteChannelsForSearch,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(AddUserToChannelModal);
