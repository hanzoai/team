//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { TrainingAttempt } from '@hanzo/training'
import type { Location } from '@hanzo/ui'
import { trainingAttemptRoute } from '../routing/routes/trainingAttemptRoute'

export async function trainingAttemptLinkProviderEncode (
  object: TrainingAttempt,
  _props: Record<string, any>
): Promise<Location> {
  return trainingAttemptRoute.build({ id: object._id, tab: null })
}
