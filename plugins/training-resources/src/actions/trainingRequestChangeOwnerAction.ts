//
// Copyright @ 2024 Hanzo AI Inc.
//

import { focusActionWithAvailability } from '@hanzoteam/questions-resources'
import type { TrainingRequest } from '@hanzoteam/training'
import { showPopup } from '@hanzoteam/ui'
import TrainingRequestChangeOwnerPopup from '../components/TrainingRequestChangeOwnerPopup.svelte'
import { canChangeTrainingRequestOwner } from '../utils'

export const trainingRequestChangeOwnerAction = focusActionWithAvailability<TrainingRequest>(
  async (object: TrainingRequest) => {
    return canChangeTrainingRequestOwner(object)
  },
  async (object: TrainingRequest) => {
    await new Promise((resolve) => {
      showPopup(
        TrainingRequestChangeOwnerPopup,
        {
          object
        },
        'top',
        resolve
      )
    })
  }
)
