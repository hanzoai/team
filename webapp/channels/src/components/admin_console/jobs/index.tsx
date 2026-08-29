// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import {getJobsByType, createJob, cancelJob} from '@hanzoteam/redux/actions/jobs';
import {getConfig} from '@hanzoteam/redux/selectors/entities/admin';
import {makeGetJobsByType} from '@hanzoteam/redux/selectors/entities/jobs';
import {isCurrentUserSystemAdmin} from '@hanzoteam/redux/selectors/entities/users';

import type {GlobalState} from 'types/store';

import Table from './table';
import type {Props} from './table';

type OwnProps = Omit<Props, 'actions' | 'jobs' | 'downloadExportRresults' | 'isSystemAdmin'>;

function mapStateToProps(state: GlobalState, ownProps: OwnProps) {
    return {
        jobs: makeGetJobsByType(ownProps.jobType)(state),
        downloadExportResults: getConfig(state).MessageExportSettings?.DownloadExportResults,
        isSystemAdmin: isCurrentUserSystemAdmin(state),
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            getJobsByType,
            createJob,
            cancelJob,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Table);
