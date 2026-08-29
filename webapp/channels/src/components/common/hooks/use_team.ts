// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Team} from '@hanzoteam/types/teams';

import {getTeam as getTeamAction, getTeamByName as getTeamByNameAction} from '@hanzoteam/redux/actions/teams';
import {getTeam as getTeamSelector, getTeamByName as getTeamByNameSelector} from '@hanzoteam/redux/selectors/entities/teams';

import {makeUseEntity} from 'components/common/hooks/useEntity';

export const useTeam = makeUseEntity<Team>({
    name: 'useTeam',
    fetch: getTeamAction,
    selector: getTeamSelector,
});

export const useTeamByName = makeUseEntity<Team>({
    name: 'useTeamByName',
    fetch: getTeamByNameAction,
    selector: getTeamByNameSelector,
});
