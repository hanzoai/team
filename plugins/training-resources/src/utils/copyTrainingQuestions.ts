//
// Copyright @ 2024 Hanzo AI Inc.
//

import { copyQuestions } from '@hanzoteam/questions-resources'
import type { Training } from '@hanzoteam/training'
import { type Ref, type TxOperations } from '@hanzoteam/core'

export async function copyTrainingQuestions (ops: TxOperations, from: Training, to: Ref<Training>): Promise<void> {
  await copyQuestions(ops, from, 'questions', to)
}
