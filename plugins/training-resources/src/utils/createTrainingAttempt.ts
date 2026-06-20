//
// Copyright @ 2024 Hanzo AI Inc.
//

import {
  type Training,
  type TrainingAttempt,
  TrainingAttemptState,
  type TrainingRequest
} from '@hanzoteam/training'
import { type Ref } from '@hanzoteam/core'
import { getClient } from '@hanzoteam/presentation'
import { navigate } from '@hanzoteam/ui'
import training from '../plugin'
import { trainingAttemptRoute } from '../routing/routes/trainingAttemptRoute'
import { canCreateTrainingAttempt } from './canCreateTrainingAttempt'
import { getCurrentEmployeeRef } from './getCurrentEmployeeRef'

export async function createTrainingAttempt (
  trainingObject: Training,
  request: TrainingRequest,
  latestOwnAttempt: TrainingAttempt | null
): Promise<Ref<TrainingAttempt> | undefined> {
  const client = getClient()

  if (!canCreateTrainingAttempt(trainingObject, request, latestOwnAttempt)) {
    return
  }

  const id = await client.addCollection<TrainingRequest, TrainingAttempt>(
    training.class.TrainingAttempt,
    request.space,
    request._id,
    request._class,
    'attempts',
    {
      owner: getCurrentEmployeeRef(),
      seqNumber: (latestOwnAttempt?.seqNumber ?? 0) + 1,
      submittedOn: null,
      submittedBy: null,
      state: TrainingAttemptState.Draft,
      answers: 0,
      score: null,
      assessmentsTotal: null,
      assessmentsPassed: null
    }
  )

  navigate(trainingAttemptRoute.build({ id, tab: null }))

  return id
}
