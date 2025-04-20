//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { checkMyPermission, permissionsStore } from '@hanzo/contact-resources'
import type { TrainingRequest } from '@hanzo/training'
import { get } from 'svelte/store'
import training from '../plugin'
import { getCurrentEmployeeRef } from './getCurrentEmployeeRef'

export function canChangeTrainingRequestOwner (request: TrainingRequest): boolean {
  return (
    request.owner === getCurrentEmployeeRef() ||
    checkMyPermission(training.permission.ChangeSomeoneElsesSentRequestOwner, request.space, get(permissionsStore))
  )
}
