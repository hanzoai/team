// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getCurrentUser} from '@hanzoteam/redux/selectors/entities/common';
import {getConfig} from '@hanzoteam/redux/selectors/entities/general';
import {isGuest} from '@hanzoteam/redux/utils/user_utils';

import type {GlobalState} from 'types/store';

import ErrorPage from './error_page';

function mapStateToProps(state: GlobalState) {
    const config = getConfig(state);
    const user = getCurrentUser(state);

    return {
        siteName: config.SiteName,
        asymmetricSigningPublicKey: config.AsymmetricSigningPublicKey,
        isGuest: Boolean(user && isGuest(user.roles)),
    };
}

export default connect(mapStateToProps)(ErrorPage);
