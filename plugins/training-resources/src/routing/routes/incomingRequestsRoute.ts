//
// Copyright @ 2024 Hanzo AI Inc.
//

import { trainingId, TrainingSpecialIds } from '@hanzoteam/training'
import { getCurrentLocation, type Location } from '@hanzoteam/ui'
import type { Route, RouteParams } from '../utils/Route'

export interface IncomingRequestsRouteParams extends RouteParams {}

export const incomingRequestRoute: Route<IncomingRequestsRouteParams> = {
  build (params: IncomingRequestsRouteParams): Location {
    const location = getCurrentLocation()
    return {
      ...location,
      path: [location.path[0], location.path[1], trainingId, TrainingSpecialIds.IncomingRequests]
    }
  },

  match: (location: Location) => {
    return location.path[2] === trainingId && location.path[3] === TrainingSpecialIds.IncomingRequests ? {} : null
  },

  resolve: async () => null
}
