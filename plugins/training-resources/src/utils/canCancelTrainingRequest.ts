//
// Copyright @ 2024 Hanzo AI Inc.
//

import type { TrainingRequest } from '@hanzoteam/training'
import { getCurrentEmployeeRef } from './getCurrentEmployeeRef'

export function canCancelTrainingRequest (object: TrainingRequest): boolean {
  return object.canceledOn === null && object.owner === getCurrentEmployeeRef()
}
