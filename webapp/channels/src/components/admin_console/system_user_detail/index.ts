// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {ConnectedProps} from 'react-redux';
import {connect} from 'react-redux';

import type {GlobalState} from '@hanzoteam/types/store';

import {getCustomProfileAttributeFields} from '@hanzoteam/redux/actions/general';
import {getUserPreferences} from '@hanzoteam/redux/actions/preferences';
import {addUserToTeam} from '@hanzoteam/redux/actions/teams';
import {updateUserActive, updateUserAuth, getUser, patchUser, updateUserMfa, getCustomProfileAttributeValues, saveCustomProfileAttribute} from '@hanzoteam/redux/actions/users';
import {getConfig, getCustomProfileAttributes, getLicense} from '@hanzoteam/redux/selectors/entities/general';
import {getCurrentUserId} from '@hanzoteam/redux/selectors/entities/users';

import {setNavigationBlocked} from 'actions/admin_actions';
import {openModal} from 'actions/views/modals';
import {getShowLockedManageUserSettings, getShowManageUserSettings} from 'selectors/admin_console';

import {isEnterpriseLicense} from 'utils/license_utils';

import SystemUserDetail from './system_user_detail';

function mapStateToProps(state: GlobalState) {
    const license = getLicense(state);
    const config = getConfig(state);
    const customProfileAttributeEnabled = isEnterpriseLicense(license);
    const customProfileAttributeFields = customProfileAttributeEnabled ? getCustomProfileAttributes(state) : [];

    const showManageUserSettings = getShowManageUserSettings(state);
    const showLockedManageUserSettings = getShowLockedManageUserSettings(state);

    return {
        currentUserId: getCurrentUserId(state),
        mfaEnabled: config?.EnableMultifactorAuthentication === 'true' || false,
        customProfileAttributeEnabled,
        customProfileAttributeFields,
        showManageUserSettings,
        showLockedManageUserSettings,
    };
}

const mapDispatchToProps = {
    getUser,
    patchUser,
    updateUserAuth,
    updateUserActive,
    updateUserMfa,
    addUserToTeam,
    setNavigationBlocked,
    openModal,
    getUserPreferences,
    getCustomProfileAttributeFields,
    getCustomProfileAttributeValues,
    saveCustomProfileAttribute,
};
const connector = connect(mapStateToProps, mapDispatchToProps);

export type PropsFromRedux = ConnectedProps<typeof connector>;
export default connector(SystemUserDetail);
