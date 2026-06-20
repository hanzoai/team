//
// Copyright @ 2024 Hanzo AI Inc.
//

import type { TrainingRequest } from '@hanzoteam/training'
import type { Location } from '@hanzoteam/ui'
import { trainingRequestRoute } from '../routing/routes/trainingRequestRoute'

export async function trainingRequestLinkProviderEncode (
  object: TrainingRequest,
  _props: Record<string, any>
): Promise<Location> {
  return trainingRequestRoute.build({
    id: object._id,
    tab: null
  })
}
