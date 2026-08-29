// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import {getSchemeTeams as loadSchemeTeams, getSchemes as loadSchemes} from '@hanzoteam/redux/actions/schemes';
import {getConfig} from '@hanzoteam/redux/selectors/entities/general';
import {getSchemes} from '@hanzoteam/redux/selectors/entities/schemes';

import type {GlobalState} from 'types/store';

import PermissionSchemesSettings from './permission_schemes_settings';

function mapStateToProps(state: GlobalState) {
    const schemes = getSchemes(state);
    const config = getConfig(state);

    return {
        schemes,
        jobsAreEnabled: config.RunJobs === 'true',
        clusterIsEnabled: config.EnableCluster === 'true',
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            loadSchemes,
            loadSchemeTeams,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(PermissionSchemesSettings);
