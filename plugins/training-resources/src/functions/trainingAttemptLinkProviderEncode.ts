//
// Copyright @ 2024 Hanzo AI Inc.
//

import type { TrainingAttempt } from '@hanzoteam/training'
import type { Location } from '@hanzoteam/ui'
import { trainingAttemptRoute } from '../routing/routes/trainingAttemptRoute'

export async function trainingAttemptLinkProviderEncode (
  object: TrainingAttempt,
  _props: Record<string, any>
): Promise<Location> {
  return trainingAttemptRoute.build({ id: object._id, tab: null })
}
