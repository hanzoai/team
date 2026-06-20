//
// Copyright @ 2024 Hanzo AI Inc.
//

import { checkMyPermission, permissionsStore } from '@hanzoteam/contact-resources'
import type { TrainingRequest } from '@hanzoteam/training'
import { get } from 'svelte/store'
import training from '../plugin'
import { getCurrentEmployeeRef } from './getCurrentEmployeeRef'

export function canChangeTrainingRequestOwner (request: TrainingRequest): boolean {
  return (
    request.owner === getCurrentEmployeeRef() ||
    checkMyPermission(training.permission.ChangeSomeoneElsesSentRequestOwner, request.space, get(permissionsStore))
  )
}
