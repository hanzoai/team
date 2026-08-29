// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getConfig} from '@hanzoteam/redux/selectors/entities/general';
import {getCurrentRelativeTeamUrl} from '@hanzoteam/redux/selectors/entities/teams';

import {getSelectedPostCard} from 'selectors/rhs';
import {getIsMobileView} from 'selectors/views/browser';

import type {GlobalState} from 'types/store';

import RhsCard from './rhs_card';

function mapStateToProps(state: GlobalState) {
    const selected = getSelectedPostCard(state);
    const config = getConfig(state);
    const enablePostUsernameOverride = config.EnablePostUsernameOverride === 'true';

    return {
        enablePostUsernameOverride,
        isMobileView: getIsMobileView(state),
        selected,
        pluginPostCardTypes: state.plugins.postCardTypes,
        teamUrl: getCurrentRelativeTeamUrl(state),
    };
}

export default connect(mapStateToProps)(RhsCard);
