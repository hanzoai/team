//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { focusActionWithAvailability } from '@hanzo/questions-resources'
import type { Training } from '@hanzo/training'
import { showPopup } from '@hanzo/ui'
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
