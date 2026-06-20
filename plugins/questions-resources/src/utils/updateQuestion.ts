//
// Copyright @ 2024 Hanzo AI Inc.
//

import type { Question } from '@hanzoteam/questions'
import { type DocumentUpdate, type TxOperations } from '@hanzoteam/core'
import { canUpdateQuestion } from './canUpdateQuestion'

export async function updateQuestion<Q extends Question<unknown>> (
  client: TxOperations,
  question: Q,
  update: DocumentUpdate<Q>
): Promise<void> {
  if (!canUpdateQuestion(question)) {
    return
  }
  await client.updateCollection(
    question._class,
    question.space,
    question._id,
    question.attachedTo,
    question.attachedToClass,
    question.collection,
    update
  )
}
