// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import type {PreferencesType} from '@hanzoteam/types/preferences';

import {savePreferences} from '@hanzoteam/redux/actions/preferences';
import {getVisibleDmGmLimit} from '@hanzoteam/redux/selectors/entities/preferences';
import {getCurrentUserId} from '@hanzoteam/redux/selectors/entities/users';

import type {GlobalState} from 'types/store';

import LimitVisibleGMsDMs from './limit_visible_gms_dms';

export type OwnProps = {
    adminMode?: boolean;
    userId: string;
    userPreferences?: PreferencesType;
};

function mapStateToProps(state: GlobalState, ownProps: OwnProps) {
    const userPreferences = ownProps.adminMode && ownProps.userPreferences ? ownProps.userPreferences : undefined;
    return {
        userId: ownProps.adminMode ? ownProps.userId : getCurrentUserId(state),
        dmGmLimit: getVisibleDmGmLimit(state, userPreferences),
    };
}

const mapDispatchToProps = {
    savePreferences,
};

export default connect(mapStateToProps, mapDispatchToProps)(LimitVisibleGMsDMs);
