// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import {getAccessControlPolicy, deleteAccessControlPolicy, assignChannelsToAccessControlPolicy, searchAccessControlPolicies, unassignChannelsFromAccessControlPolicy, createAccessControlPolicy, getAccessControlFields, getVisualAST, validateExpressionAgainstRequester, updateAccessControlPoliciesActive, searchUsersForExpression} from '@hanzoteam/redux/actions/access_control';
import {
    addChannelMember,
    deleteChannel,
    getChannel as fetchChannel,
    getChannelModerations as fetchChannelModerations,
    getChannelMembers,
    membersMinusGroupMembers,
    patchChannel,
    patchChannelModerations,
    removeChannelMember,
    unarchiveChannel,
    updateChannelMemberSchemeRoles,
    updateChannelPrivacy,
} from '@hanzoteam/redux/actions/channels';
import {
    getGroupsAssociatedToChannel as fetchAssociatedGroups,
    linkGroupSyncable,
    patchGroupSyncable,
    unlinkGroupSyncable,
} from '@hanzoteam/redux/actions/groups';
import {createJob} from '@hanzoteam/redux/actions/jobs';
import {getScheme as loadScheme} from '@hanzoteam/redux/actions/schemes';
import {getTeam as fetchTeam} from '@hanzoteam/redux/actions/teams';
import {getProfilesByIds} from '@hanzoteam/redux/actions/users';
import {getChannel, getChannelModerations} from '@hanzoteam/redux/selectors/entities/channels';
import {getConfig, getLicense} from '@hanzoteam/redux/selectors/entities/general';
import {getAllGroups, getGroupsAssociatedToChannel} from '@hanzoteam/redux/selectors/entities/groups';
import {getScheme} from '@hanzoteam/redux/selectors/entities/schemes';
import {getTeam} from '@hanzoteam/redux/selectors/entities/teams';

import {setNavigationBlocked} from 'actions/admin_actions';
import {isChannelAccessControlEnabled} from 'selectors/general';

import {isMinimumEnterpriseAdvancedLicense, isMinimumEnterpriseLicense, isMinimumProfessionalLicense} from 'utils/license_utils';

import type {GlobalState} from 'types/store';

import ChannelDetails from './channel_details';

type OwnProps = {
    match: {
        params: {
            channel_id: string;
        };
    };
};

function mapStateToProps(state: GlobalState, ownProps: OwnProps) {
    const config = getConfig(state);
    const license = getLicense(state);

    const isLicensed = license?.IsLicensed === 'true';

    // Channel Moderation is only available for Professional and above
    const channelModerationEnabled = isLicensed && isMinimumProfessionalLicense(license);

    // Channel Groups is only available for Enterprise and above
    const channelGroupsEnabled = isLicensed && isMinimumEnterpriseLicense(license);

    // ABAC must be licensed (Enterprise Advanced) and enabled via the
    // AccessControlSettings.EnableAttributeBasedAccessControl config setting,
    // which is now the sole switch for the feature.
    const abacSupported = isLicensed && isMinimumEnterpriseAdvancedLicense(license) && isChannelAccessControlEnabled(state);

    const guestAccountsEnabled = config.EnableGuestAccounts === 'true';
    const channelID = ownProps.match.params.channel_id;
    const channel = getChannel(state, channelID);
    const team = channel ? getTeam(state, channel.team_id) : undefined;
    const groups = getGroupsAssociatedToChannel(state, channelID);
    const totalGroups = groups.length;
    const allGroups = getAllGroups(state);
    const channelPermissions = getChannelModerations(state, channelID);
    const teamScheme = team ? getScheme(state, team.scheme_id) : undefined;
    return {
        channelID,
        channel,
        team,
        groups,
        totalGroups,
        allGroups,
        channelPermissions,
        teamScheme,
        guestAccountsEnabled,
        channelModerationEnabled,
        channelGroupsEnabled,
        abacSupported,
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    const assignChannelToAccessControlPolicy = (policyId: string, channelId: string) => {
        return assignChannelsToAccessControlPolicy(policyId, [channelId]);
    };
    return {
        actions: bindActionCreators({
            getGroups: fetchAssociatedGroups,
            linkGroupSyncable,
            unlinkGroupSyncable,
            membersMinusGroupMembers,
            setNavigationBlocked: setNavigationBlocked as any,
            getChannel: fetchChannel,
            getTeam: fetchTeam,
            getChannelModerations: fetchChannelModerations,
            patchChannel,
            updateChannelPrivacy,
            patchGroupSyncable,
            patchChannelModerations,
            loadScheme,
            addChannelMember,
            removeChannelMember,
            updateChannelMemberSchemeRoles,
            deleteChannel,
            unarchiveChannel,
            getAccessControlPolicy,
            assignChannelToAccessControlPolicy,
            unassignChannelsFromAccessControlPolicy,
            deleteAccessControlPolicy,
            searchPolicies: searchAccessControlPolicies,

            // Channel-level access rules actions
            getAccessControlFields,
            getVisualAST,
            saveChannelAccessPolicy: createAccessControlPolicy,
            validateChannelExpression: validateExpressionAgainstRequester,
            createAccessControlSyncJob: createJob,
            updateAccessControlPoliciesActive,
            searchUsersForExpression,
            getChannelMembers,
            getProfilesByIds,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelDetails);
