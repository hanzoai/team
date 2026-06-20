//
// Copyright @ 2024 Hanzo AI Inc.
//

import { focusActionWithAvailability } from '@hanzoteam/questions-resources'
import type { TrainingRequest } from '@hanzoteam/training'
import { getClient } from '@hanzoteam/presentation'
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
