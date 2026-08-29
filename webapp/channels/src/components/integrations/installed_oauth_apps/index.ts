// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import type {GlobalState} from '@hanzoteam/types/store';

import {regenOAuthAppSecret, deleteOAuthApp} from '@hanzoteam/redux/actions/integrations';
import {Permissions} from '@hanzoteam/redux/constants';
import {getConfig} from '@hanzoteam/redux/selectors/entities/general';
import {getAppsOAuthAppIDs, getOAuthApps} from '@hanzoteam/redux/selectors/entities/integrations';
import {haveISystemPermission} from '@hanzoteam/redux/selectors/entities/roles';
import {getCurrentTeam} from '@hanzoteam/redux/selectors/entities/teams';

import {loadOAuthAppsAndProfiles} from 'actions/integration_actions';

import InstalledOAuthApps from './installed_oauth_apps';

function mapStateToProps(state: GlobalState) {
    const config = getConfig(state);
    const enableOAuthServiceProvider = config.EnableOAuthServiceProvider === 'true';

    return {
        canManageOauth: haveISystemPermission(state, {permission: Permissions.MANAGE_OAUTH}),
        oauthApps: getOAuthApps(state),
        appsOAuthAppIDs: getAppsOAuthAppIDs(state),
        enableOAuthServiceProvider,
        team: getCurrentTeam(state),
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            loadOAuthAppsAndProfiles,
            regenOAuthAppSecret,
            deleteOAuthApp,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(InstalledOAuthApps);
