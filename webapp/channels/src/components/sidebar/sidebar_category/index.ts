// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import type {ChannelCategory} from '@hanzoteam/types/channel_categories';

import {setCategoryCollapsed, setCategorySorting} from '@hanzoteam/redux/actions/channel_categories';
import {savePreferences} from '@hanzoteam/redux/actions/preferences';
import {getCurrentUser, getCurrentUserId} from '@hanzoteam/redux/selectors/entities/users';
import {isAdmin} from '@hanzoteam/redux/utils/user_utils';

import {getDraggingState, makeGetFilteredChannelIdsForCategory} from 'selectors/views/channel_sidebar';

import type {GlobalState} from 'types/store';

import SidebarCategory from './sidebar_category';

type OwnProps = {
    category: ChannelCategory;
};

function makeMapStateToProps() {
    const getChannelIdsForCategory = makeGetFilteredChannelIdsForCategory();

    return (state: GlobalState, ownProps: OwnProps) => {
        return {
            channelIds: getChannelIdsForCategory(state, ownProps.category),
            draggingState: getDraggingState(state),
            currentUserId: getCurrentUserId(state),
            isAdmin: isAdmin(getCurrentUser(state).roles),
        };
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            setCategoryCollapsed,
            setCategorySorting,
            savePreferences,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(SidebarCategory);
