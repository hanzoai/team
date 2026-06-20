//
// Copyright @ 2024 Hanzo AI Inc.
//

import { focusActionWithAvailability } from '@hanzoteam/questions-resources'
import type { Training } from '@hanzoteam/training'
import { showPopup } from '@hanzoteam/ui'
import TrainingRequestCreator from '../components/TrainingRequestCreator.svelte'
import { canCreateTrainingRequest, type CreateTrainingRequestData } from '../utils'

export const trainingRequestCreateAction = focusActionWithAvailability<Training>(
  async (parent: Training) => {
    return canCreateTrainingRequest(parent)
  },
  async (parent: Training): Promise<void> => {
    const object: CreateTrainingRequestData = {
      roles: [],
      trainees: [],
      maxAttempts: null,
      dueDate: null
    }

    await new Promise((resolve) => {
      showPopup(
        TrainingRequestCreator,
        {
          parent,
          object
        },
        'top',
        resolve
      )
    })
  }
)
