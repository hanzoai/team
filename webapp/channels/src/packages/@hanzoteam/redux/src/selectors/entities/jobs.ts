// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {JobType, Job, JobsByType} from '@hanzoteam/types/jobs';
import type {GlobalState} from '@hanzoteam/types/store';
import type {IDMappedObjects} from '@hanzoteam/types/utilities';

import {createSelector} from '@hanzoteam/redux/selectors/create_selector';

export function getAllJobs(state: GlobalState): IDMappedObjects<Job> {
    return state.entities.jobs.jobs;
}

export function getJobsByType(state: GlobalState): JobsByType {
    return state.entities.jobs.jobsByTypeList;
}

export function makeGetJobsByType(type: JobType): (state: GlobalState) => Job[] {
    return createSelector(
        'makeGetJobsByType',
        getJobsByType,
        (jobsByType) => {
            return jobsByType[type] || [];
        },
    );
}
