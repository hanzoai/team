//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { type TrainingAttemptState, trainingAttemptStateOrder } from '@hanzo/training'

export async function trainingAttemptStateAllValues (): Promise<TrainingAttemptState[]> {
  return [...trainingAttemptStateOrder]
}
