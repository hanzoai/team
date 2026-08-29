// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import type {GlobalState} from '@hanzoteam/types/store';

import {deleteCommand, regenCommandToken} from '@hanzoteam/redux/actions/integrations';
import {Permissions} from '@hanzoteam/redux/constants';
import {haveITeamPermission} from '@hanzoteam/redux/selectors/entities/roles';

import InstalledCommands from './installed_commands';

type Props = {
    team: {
        id: string;
    };
};

function mapStateToProps(state: GlobalState, ownProps: Props) {
    const canManageOthersSlashCommands = haveITeamPermission(state, ownProps.team.id, Permissions.MANAGE_OTHERS_SLASH_COMMANDS);

    return {
        canManageOthersSlashCommands,
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            regenCommandToken,
            deleteCommand,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(InstalledCommands);
