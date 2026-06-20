//
// Copyright @ 2024 Hanzo AI Inc.
//

import { findQuestions, updateQuestion } from '@hanzoteam/questions-resources'
import type { Training } from '@hanzoteam/training'
import type { Employee } from '@hanzoteam/contact'
import type { Ref } from '@hanzoteam/core'
import { getClient } from '@hanzoteam/presentation'
import { canChangeTrainingOwner } from './canChangeTrainingOwner'

export async function changeTrainingOwner (training: Training, owner: Ref<Employee>): Promise<void> {
  if (!canChangeTrainingOwner(training)) {
    return
  }
  const ops = getClient().apply()

  await ops.updateDoc(training._class, training.space, training._id, {
    owner
  })

  const trainingQuestions = await findQuestions(training, 'questions')
  await Promise.all(
    trainingQuestions.map(async (question) => {
      await updateQuestion(ops, question, { owner })
    })
  )

  await ops.commit()
}
