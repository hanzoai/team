//
// Copyright © 2023 Hardcore Engineering Inc.
//

import { findQuestions, focusActionWithAvailability, releaseQuestion } from '@hanzo/questions-resources'
import { type Training, TrainingState } from '@hanzo/training'
import { getClient } from '@hanzo/presentation'
import { canDeleteTraining } from '../utils'

export const trainingDeleteAction = focusActionWithAvailability<Training>(
  async (object: Training) => {
    return canDeleteTraining(object)
  },
  async (object: Training) => {
    const tx = getClient().apply()

    await tx.update(object, { state: TrainingState.Deleted })

    const questions = await findQuestions(object, 'questions')
    await Promise.all(
      questions.map(async (question) => {
        await releaseQuestion(tx, question)
      })
    )

    await tx.commit()
  }
)
