//
// Copyright @ 2024 Hanzo AI Inc.
//

import { trainingId } from '@hanzoteam/training'
import { type Location, type ResolvedLocation } from '@hanzoteam/ui'
import { trainingAttemptRoute } from './routes/trainingAttemptRoute'
import { trainingRequestRoute } from './routes/trainingRequestRoute'
import { trainingRoute } from './routes/trainingRoute'
import type { Route } from './utils/Route'

const routes: Array<Route<any>> = [trainingAttemptRoute, trainingRequestRoute, trainingRoute]

export async function resolveLocation (location: Location): Promise<ResolvedLocation | undefined> {
  if (location.path[2] !== trainingId) {
    return undefined
  }

  for (const route of routes) {
    const params = route.match(location)
    if (params !== null) {
      const resolved = await route.resolve(location, params)
      if (resolved !== null) {
        return resolved
      }
    }
  }

  return undefined
}
