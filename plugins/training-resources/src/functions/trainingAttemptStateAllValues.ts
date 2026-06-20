//
// Copyright @ 2024 Hanzo AI Inc.
//

import { type TrainingAttemptState, trainingAttemptStateOrder } from '@hanzoteam/training'

export async function trainingAttemptStateAllValues (): Promise<TrainingAttemptState[]> {
  return [...trainingAttemptStateOrder]
}
