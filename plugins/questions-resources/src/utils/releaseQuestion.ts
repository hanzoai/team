//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { Question } from '@hanzo/questions'
import { type TxOperations } from '@hanzo/core'
import { getCurrentEmployeeRef } from './getCurrentEmployeeRef'
import { updateQuestion } from './updateQuestion'

export async function releaseQuestion (client: TxOperations, question: Question<unknown>): Promise<void> {
  await updateQuestion(client, question, {
    releasedBy: question.releasedBy ?? getCurrentEmployeeRef(),
    releasedOn: question.releasedOn ?? Date.now()
  })
}
