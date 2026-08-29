// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import {
    searchTeamAccessControlPolicies,
    getAccessControlPolicy as fetchPolicy,
    createAccessControlPolicy as createPolicy,
    deleteAccessControlPolicy as deletePolicy,
    searchAccessControlPolicyChannels as searchChannels,
    assignChannelsToAccessControlPolicy,
    unassignChannelsFromAccessControlPolicy,
    updateAccessControlPoliciesActive,
} from '@hanzoteam/redux/actions/access_control';
import {createJob} from '@hanzoteam/redux/actions/jobs';
import {getAccessControlSettings} from '@hanzoteam/redux/selectors/entities/access_control';

import type {GlobalState} from 'types/store';

import TeamAccessPoliciesTab from './team_access_policies_tab';

function mapStateToProps(state: GlobalState) {
    return {
        accessControlSettings: getAccessControlSettings(state),
    };
}

const mapDispatchToProps = (dispatch: Dispatch) => ({
    actions: bindActionCreators({
        searchTeamPolicies: searchTeamAccessControlPolicies,
        fetchPolicy,
        createPolicy,
        deletePolicy,
        searchChannels,
        assignChannelsToAccessControlPolicy,
        unassignChannelsFromAccessControlPolicy,
        createJob,
        updateAccessControlPoliciesActive,
    }, dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(TeamAccessPoliciesTab);
