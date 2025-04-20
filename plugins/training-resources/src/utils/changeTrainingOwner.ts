//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { findQuestions, updateQuestion } from '@hanzo/questions-resources'
import type { Training } from '@hanzo/training'
import type { Employee } from '@hanzo/contact'
import type { Ref } from '@hanzo/core'
import { getClient } from '@hanzo/presentation'
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
