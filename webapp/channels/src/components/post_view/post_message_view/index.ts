// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {Preferences} from '@hanzoteam/redux/constants';
import {getTheme, getBool} from '@hanzoteam/redux/selectors/entities/preferences';
import {getCurrentRelativeTeamUrl} from '@hanzoteam/redux/selectors/entities/teams';

import type {GlobalState} from 'types/store';

import PostMessageView from './post_message_view';

function mapStateToProps(state: GlobalState) {
    return {
        enableFormatting: getBool(state, Preferences.CATEGORY_ADVANCED_SETTINGS, 'formatting', true),
        pluginPostTypes: state.plugins.postTypes,
        theme: getTheme(state),
        currentRelativeTeamUrl: getCurrentRelativeTeamUrl(state),
    };
}

export default connect(mapStateToProps)(PostMessageView);
