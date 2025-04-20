//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { copyQuestions } from '@hanzo/questions-resources'
import type { Training } from '@hanzo/training'
import { type Ref, type TxOperations } from '@hanzo/core'

export async function copyTrainingQuestions (ops: TxOperations, from: Training, to: Ref<Training>): Promise<void> {
  await copyQuestions(ops, from, 'questions', to)
}
