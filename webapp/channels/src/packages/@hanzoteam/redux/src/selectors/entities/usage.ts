// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {CloudUsage} from '@hanzoteam/types/cloud';
import type {GlobalState} from '@hanzoteam/types/store';

export function getUsage(state: GlobalState): CloudUsage {
    return state.entities.usage;
}
