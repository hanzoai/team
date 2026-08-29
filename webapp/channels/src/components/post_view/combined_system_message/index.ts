// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import type {GlobalState} from '@hanzoteam/types/store';

import {getMissingProfilesByIds, getMissingProfilesByUsernames} from '@hanzoteam/redux/actions/users';
import {shouldShowJoinLeaveMessages} from '@hanzoteam/redux/selectors/entities/preferences';
import {getCurrentUser, makeGetProfilesByIdsAndUsernames} from '@hanzoteam/redux/selectors/entities/users';

import CombinedSystemMessage from './combined_system_message';

type OwnProps = {
    allUserIds: string[];
    allUsernames: string[];
};

function makeMapStateToProps() {
    const getProfilesByIdsAndUsernames = makeGetProfilesByIdsAndUsernames();

    return (state: GlobalState, ownProps: OwnProps) => {
        const currentUser = getCurrentUser(state);
        const {allUserIds, allUsernames} = ownProps;

        return {
            currentUserId: currentUser.id,
            currentUsername: currentUser.username,
            showJoinLeave: shouldShowJoinLeaveMessages(state),
            userProfiles: getProfilesByIdsAndUsernames(state, {allUserIds, allUsernames}),
        };
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            getMissingProfilesByIds,
            getMissingProfilesByUsernames,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(CombinedSystemMessage);
