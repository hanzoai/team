// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import type {GlobalState} from '@hanzoteam/types/store';

import {savePreferences} from '@hanzoteam/redux/actions/preferences';
import {Preferences} from '@hanzoteam/redux/constants';
import {getCurrentUserId} from '@hanzoteam/redux/selectors/entities/common';
import {getConfig} from '@hanzoteam/redux/selectors/entities/general';
import {get as getPreference} from '@hanzoteam/redux/selectors/entities/preferences';

import EmailNotificationSetting from './email_notification_setting';

function mapStateToProps(state: GlobalState) {
    const config = getConfig(state);
    const emailInterval = parseInt(getPreference(
        state,
        Preferences.CATEGORY_NOTIFICATIONS,
        Preferences.EMAIL_INTERVAL,
        Preferences.INTERVAL_NOT_SET.toString(),
    ), 10);

    return {
        currentUserId: getCurrentUserId(state),
        emailInterval,
        enableEmailBatching: config.EnableEmailBatching === 'true',
        sendEmailNotifications: config.SendEmailNotifications === 'true',
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            savePreferences,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(EmailNotificationSetting);
