// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {AppBinding} from '@hanzoteam/types/apps';

import {AppBindingLocations} from '@hanzoteam/redux/constants/apps';
import {createSelector} from '@hanzoteam/redux/selectors/create_selector';
import {makeAppBindingsSelector, makeRHSAppBindingSelector} from '@hanzoteam/redux/selectors/entities/apps';

import {Locations} from 'utils/constants';

import type {GlobalState} from 'types/store';

export function makeGetPostOptionBinding(): (state: GlobalState, location?: string) => AppBinding[] | null {
    const centerBindingsSelector = makeAppBindingsSelector(AppBindingLocations.POST_MENU_ITEM);
    const rhsBindingsSelector = makeRHSAppBindingSelector(AppBindingLocations.POST_MENU_ITEM);
    return createSelector(
        'postOptionsBindings',
        centerBindingsSelector,
        rhsBindingsSelector,
        (state: GlobalState, location?: string) => location,
        (centerBindings: AppBinding[], rhsBindings: AppBinding[], location?: string) => {
            switch (location) {
            case Locations.RHS_ROOT:
            case Locations.RHS_COMMENT:
                return rhsBindings;
            case Locations.SEARCH:
                return null;
            case Locations.CENTER:
            default:
                return centerBindings;
            }
        },
    );
}
