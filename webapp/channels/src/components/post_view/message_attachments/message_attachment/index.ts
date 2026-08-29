// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import type {GlobalState} from '@hanzoteam/types/store';

import {doPostActionWithCookie} from '@hanzoteam/redux/actions/posts';
import {getCurrentRelativeTeamUrl} from '@hanzoteam/redux/selectors/entities/teams';

import {openModal} from 'actions/views/modals';

import MessageAttachment from './message_attachment';

function mapStateToProps(state: GlobalState) {
    return {
        currentRelativeTeamUrl: getCurrentRelativeTeamUrl(state),
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: {
            ...bindActionCreators({
                doPostActionWithCookie, openModal,
            }, dispatch),
        },
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(MessageAttachment);
