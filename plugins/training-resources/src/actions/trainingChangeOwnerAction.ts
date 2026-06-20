//
// Copyright @ 2024 Hanzo AI Inc.
//

import { focusActionWithAvailability } from '@hanzoteam/questions-resources'
import type { Training } from '@hanzoteam/training'
import { showPopup } from '@hanzoteam/ui'
import TrainingChangeOwnerPopup from '../components/TrainingChangeOwnerPopup.svelte'
import { canChangeTrainingOwner } from '../utils'

export const trainingChangeOwnerAction = focusActionWithAvailability<Training>(
  async (object: Training) => {
    return canChangeTrainingOwner(object)
  },
  async (object: Training) => {
    await new Promise((resolve) => {
      showPopup(
        TrainingChangeOwnerPopup,
        {
          object
        },
        'top',
        resolve
      )
    })
  }
)
