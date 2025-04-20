//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { focusActionWithAvailability } from '@hanzo/questions-resources'
import type { TrainingRequest } from '@hanzo/training'
import { getClient } from '@hanzo/presentation'
import { canCancelTrainingRequest, getCurrentEmployeeRef } from '../utils'

export const trainingRequestCancelAction = focusActionWithAvailability<TrainingRequest>(
  async (object: TrainingRequest) => {
    return canCancelTrainingRequest(object)
  },
  async (object: TrainingRequest) => {
    await getClient().update(object, {
      canceledOn: Date.now(),
      canceledBy: getCurrentEmployeeRef()
    })
  }
)
