//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { type TrainingAttemptState, trainingAttemptStateOrder } from '@hanzo/training'
import { type TxOperations } from '@hanzo/core'

export async function trainingAttemptStateSort (
  _: TxOperations,
  states: TrainingAttemptState[]
): Promise<TrainingAttemptState[]> {
  return states
    .slice()
    .sort((state1, state2) => trainingAttemptStateOrder.indexOf(state2) - trainingAttemptStateOrder.indexOf(state1))
}
