// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {UserProfile} from '@hanzoteam/types/users';

import {getMissingProfilesByIds} from '@hanzoteam/redux/actions/users';
import {getUser} from '@hanzoteam/redux/selectors/entities/users';

import {makeUseEntity} from './useEntity';

export const useUser = makeUseEntity<UserProfile>({
    name: 'useUser',
    fetch: (userId) => getMissingProfilesByIds([userId]),
    selector: (state, userId) => getUser(state, userId),
});
