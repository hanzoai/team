// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {MfaSecret} from '@hanzoteam/types/mfa';

import * as UserActions from '@hanzoteam/redux/actions/users';
import {getCurrentUserId} from '@hanzoteam/redux/selectors/entities/users';

import type {ActionFuncAsync} from 'types/store';

export function activateMfa(code: string): ActionFuncAsync {
    return (dispatch, getState) => {
        const currentUserId = getCurrentUserId(getState());

        return dispatch(UserActions.updateUserMfa(currentUserId, true, code));
    };
}

export function deactivateMfa(): ActionFuncAsync {
    return (dispatch, getState) => {
        const currentUserId = getCurrentUserId(getState());

        return dispatch(UserActions.updateUserMfa(currentUserId, false));
    };
}

export function generateMfaSecret(): ActionFuncAsync<MfaSecret> {
    return (dispatch, getState) => {
        const currentUserId = getCurrentUserId(getState());

        return dispatch(UserActions.generateMfaSecret(currentUserId));
    };
}

