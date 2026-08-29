// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import type {ConnectedProps} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import type {ClientConfig} from '@hanzoteam/types/config';

import {getInProductNotices, updateNoticesAsViewed} from '@hanzoteam/redux/actions/teams';
import {getConfig} from '@hanzoteam/redux/selectors/entities/general';
import {getCurrentTeamId} from '@hanzoteam/redux/selectors/entities/teams';

import {getSocketStatus} from 'selectors/views/websocket';

import type {GlobalState} from 'types/store';

import ProductNoticesModal from './product_notices_modal';

function mapStateToProps(state: GlobalState) {
    const config: Partial<ClientConfig> = getConfig(state);
    const version: string = config.Version || ''; //this should always exist but TS throws error
    const socketStatus = getSocketStatus(state);

    return {
        currentTeamId: getCurrentTeamId(state),
        version,
        socketStatus,
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            getInProductNotices,
            updateNoticesAsViewed,
        }, dispatch),
    };
}

const connector = connect(mapStateToProps, mapDispatchToProps);

export type PropsFromRedux = ConnectedProps<typeof connector>;

export default connector(ProductNoticesModal);
