// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import type {GlobalState} from '@hanzoteam/types/store';

import {removeIncomingHook} from '@hanzoteam/redux/actions/integrations';
import {Permissions} from '@hanzoteam/redux/constants';
import {getAllChannels} from '@hanzoteam/redux/selectors/entities/channels';
import {getConfig} from '@hanzoteam/redux/selectors/entities/general';
import {getFilteredIncomingHooks, getIncomingHooksTotalCount} from '@hanzoteam/redux/selectors/entities/integrations';
import {haveITeamPermission} from '@hanzoteam/redux/selectors/entities/roles';
import {getCurrentTeamId} from '@hanzoteam/redux/selectors/entities/teams';
import {getUsers} from '@hanzoteam/redux/selectors/entities/users';

import {loadIncomingHooksAndProfilesForTeam} from 'actions/integration_actions';

import InstalledIncomingWebhooks from './installed_incoming_webhooks';

function mapStateToProps(state: GlobalState) {
    const teamId = getCurrentTeamId(state);
    const incomingHooks = getFilteredIncomingHooks(state);
    const incomingHooksTotalCount = getIncomingHooksTotalCount(state);
    const config = getConfig(state);
    const canManageOthersWebhooks = haveITeamPermission(state, teamId, Permissions.MANAGE_OTHERS_INCOMING_WEBHOOKS);
    const enableIncomingWebhooks = config.EnableIncomingWebhooks === 'true';

    return {
        incomingHooks,
        incomingHooksTotalCount,
        channels: getAllChannels(state),
        users: getUsers(state),
        canManageOthersWebhooks,
        enableIncomingWebhooks,
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            loadIncomingHooksAndProfilesForTeam,
            removeIncomingHook,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(InstalledIncomingWebhooks);
