// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import type {GlobalState} from '@hanzoteam/types/store';

import {getConfig} from '@hanzoteam/redux/selectors/entities/general';

import LatexBlock from './latex_block';

function mapStateToProps(state: GlobalState) {
    const config = getConfig(state);
    return {
        enableLatex: config.EnableLatex === 'true',
    };
}

export default connect(mapStateToProps)(LatexBlock);
