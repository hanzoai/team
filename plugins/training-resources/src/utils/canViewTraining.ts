//
// Copyright @ 2024 Hanzo AI Inc.
//

import { checkMyPermission, permissionsStore } from '@hanzoteam/contact-resources'
import type { Training } from '@hanzoteam/training'
import { get } from 'svelte/store'
import { getCurrentEmployeeRef } from './getCurrentEmployeeRef'
import training from '../plugin'

export function canViewTraining (object: Training): boolean {
  return (
    object.owner === getCurrentEmployeeRef() ||
    checkMyPermission(training.permission.ViewSomeoneElsesTrainingOverview, object.space, get(permissionsStore))
  )
}
