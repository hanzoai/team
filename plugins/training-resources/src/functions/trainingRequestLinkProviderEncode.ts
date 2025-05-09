//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { TrainingRequest } from '@hanzo/training'
import type { Location } from '@hanzo/ui'
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
