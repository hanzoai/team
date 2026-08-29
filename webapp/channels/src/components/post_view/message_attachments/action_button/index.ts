// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import type {GlobalState} from '@hanzoteam/types/store';

import {getTheme} from '@hanzoteam/redux/selectors/entities/preferences';

import ActionButton from './action_button';

function mapStateToProps(state: GlobalState) {
    return {
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(ActionButton);
