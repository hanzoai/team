//
// Copyright @ 2024 Hanzo AI Inc.
//

import { type TrainingAttemptState, trainingAttemptStateOrder } from '@hanzoteam/training'
import { type TxOperations } from '@hanzoteam/core'

export async function trainingAttemptStateSort (
  _: TxOperations,
  states: TrainingAttemptState[]
): Promise<TrainingAttemptState[]> {
  return states
    .slice()
    .sort((state1, state2) => trainingAttemptStateOrder.indexOf(state2) - trainingAttemptStateOrder.indexOf(state1))
}
