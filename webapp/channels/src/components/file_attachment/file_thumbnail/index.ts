// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import type {FileInfo} from '@hanzoteam/types/files';

import {isFileRejected} from '@hanzoteam/redux/selectors/entities/files';
import {getConfig} from '@hanzoteam/redux/selectors/entities/general';

import type {GlobalState} from 'types/store';

import FileThumbnail from './file_thumbnail';

type OwnProps = {
    fileInfo: FileInfo | {id?: string};
};

function mapStateToProps(state: GlobalState, ownProps: OwnProps) {
    const fileId = (ownProps.fileInfo as FileInfo)?.id;
    return {
        enableSVGs: getConfig(state).EnableSVGs === 'true',
        isRejected: fileId ? isFileRejected(state, fileId) : false,
    };
}

export default connect(mapStateToProps)(FileThumbnail);
