//
// Copyright @ 2024 Hanzo AI Inc.
//

import type { Training } from '@hanzoteam/training'
import type { Location } from '@hanzoteam/ui'
import { trainingRoute } from '../routing/routes/trainingRoute'

export async function trainingLinkProviderEncode (object: Training, _props: Record<string, any>): Promise<Location> {
  return trainingRoute.build({ id: object._id, tab: null })
}
