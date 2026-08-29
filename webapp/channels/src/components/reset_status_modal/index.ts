// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import {savePreferences} from '@hanzoteam/redux/actions/preferences';
import {setStatus} from '@hanzoteam/redux/actions/users';
import {Preferences} from '@hanzoteam/redux/constants';
import {get} from '@hanzoteam/redux/selectors/entities/preferences';
import {getStatusForUserId} from '@hanzoteam/redux/selectors/entities/users';

import {autoResetStatus} from 'actions/user_actions';

import type {GlobalState} from 'types/store/index.js';

import ResetStatusModal from './reset_status_modal';

function mapStateToProps(state: GlobalState) {
    const {currentUserId} = state.entities.users;
    return {
        autoResetPref: get(state, Preferences.CATEGORY_AUTO_RESET_MANUAL_STATUS, currentUserId, ''),
        currentUserStatus: getStatusForUserId(state, currentUserId),
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            autoResetStatus,
            setStatus,
            savePreferences,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ResetStatusModal);
