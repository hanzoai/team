// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import type {UserProfile} from '@hanzoteam/types/users';

import {fetchRemoteClusterInfo} from '@hanzoteam/redux/actions/shared_channels';
import {getCurrentUserId, getStatusForUserId} from '@hanzoteam/redux/selectors/entities/users';

import type {GlobalState} from 'types/store';

import UserDetails from './user_details';

type OwnProps = {
    option: UserProfile;
};

function mapStateToProps(state: GlobalState, ownProps: OwnProps) {
    return {
        currentUserId: getCurrentUserId(state),
        status: getStatusForUserId(state, ownProps.option.id),
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            fetchRemoteClusterInfo,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(UserDetails);
