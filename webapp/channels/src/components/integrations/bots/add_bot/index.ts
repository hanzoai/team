// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import type {RouteComponentProps} from 'react-router-dom';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import {createBot, patchBot} from '@hanzoteam/redux/actions/bots';
import {updateUserRoles, uploadProfileImage, setDefaultProfileImage, createUserAccessToken} from '@hanzoteam/redux/actions/users';
import {Permissions} from '@hanzoteam/redux/constants';
import {getBotAccounts} from '@hanzoteam/redux/selectors/entities/bots';
import {getConfig} from '@hanzoteam/redux/selectors/entities/general';
import {haveISystemPermission} from '@hanzoteam/redux/selectors/entities/roles';
import {getUser} from '@hanzoteam/redux/selectors/entities/users';

import type {GlobalState} from 'types/store';

import AddBot from './add_bot';

type OwnProps = {

    /**
     * Search query for the bot
     */
    location: RouteComponentProps['location'];
};

function mapStateToProps(state: GlobalState, ownProps: OwnProps) {
    const config = getConfig(state);
    const botId = (new URLSearchParams(ownProps.location.search)).get('id');
    const bots = getBotAccounts(state);
    const bot = (bots && botId) ? bots[botId] : undefined;
    const user = bot ? getUser(state, bot.user_id) : undefined;
    const roles = user ? user.roles : undefined;
    return {
        maxFileSize: parseInt(config.MaxFileSize!, 10),
        bot,
        roles,
        editingUserHasManageSystem: haveISystemPermission(state, {permission: Permissions.MANAGE_SYSTEM}),
        user,
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            createBot,
            patchBot,
            uploadProfileImage,
            setDefaultProfileImage,
            createUserAccessToken,
            updateUserRoles,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(AddBot);
