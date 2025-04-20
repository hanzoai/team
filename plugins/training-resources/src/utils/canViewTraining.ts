//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { checkMyPermission, permissionsStore } from '@hanzo/contact-resources'
import type { Training } from '@hanzo/training'
import { get } from 'svelte/store'
import { getCurrentEmployeeRef } from './getCurrentEmployeeRef'
import training from '../plugin'

export function canViewTraining (object: Training): boolean {
  return (
    object.owner === getCurrentEmployeeRef() ||
    checkMyPermission(training.permission.ViewSomeoneElsesTrainingOverview, object.space, get(permissionsStore))
  )
}
