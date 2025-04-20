//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { TrainingRequest } from '@hanzo/training'
import { getCurrentEmployeeRef } from './getCurrentEmployeeRef'

export function canUpdateTrainingRequest (request: TrainingRequest): boolean {
  return request.owner === getCurrentEmployeeRef()
}
