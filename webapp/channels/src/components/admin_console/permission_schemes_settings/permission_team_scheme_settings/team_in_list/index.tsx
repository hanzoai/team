// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import type {GlobalState} from '@hanzoteam/types/store';

import {getTeamStats as loadTeamStats} from '@hanzoteam/redux/actions/teams';
import {getTeamStats} from '@hanzoteam/redux/selectors/entities/teams';

import TeamInList from './team_in_list';

function mapStateToProps(state: GlobalState) {
    return {
        stats: getTeamStats(state),
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            loadTeamStats,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(TeamInList);
