// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import type {PreferencesType} from '@hanzoteam/types/preferences';

import {savePreferences} from '@hanzoteam/redux/actions/preferences';
import {
    shouldShowUnreadsCategory,
} from '@hanzoteam/redux/selectors/entities/preferences';
import {getCurrentUserId} from '@hanzoteam/redux/selectors/entities/users';

import type {GlobalState} from 'types/store';

import ShowUnreadsCategory from './show_unreads_category';

export type OwnProps = {
    adminMode?: boolean;
    userId: string;
    userPreferences?: PreferencesType;
};

function mapStateToProps(state: GlobalState, props: OwnProps) {
    const userPreferences = props.adminMode && props.userPreferences ? props.userPreferences : undefined;
    return {
        userId: props.adminMode ? props.userId : getCurrentUserId(state),
        showUnreadsCategory: shouldShowUnreadsCategory(state, userPreferences),
    };
}

const mapDispatchToProps = {
    savePreferences,
};

export default connect(mapStateToProps, mapDispatchToProps)(ShowUnreadsCategory);
