//
// Copyright @ 2024 Hanzo AI Inc.
//

import type { TrainingRequest } from '@hanzoteam/training'
import type { Employee } from '@hanzoteam/contact'
import type { Ref } from '@hanzoteam/core'
import { getClient } from '@hanzoteam/presentation'
import { canChangeTrainingRequestOwner } from './canChangeTrainingRequestOwner'

export async function changeTrainingRequestOwner (request: TrainingRequest, owner: Ref<Employee>): Promise<void> {
  if (canChangeTrainingRequestOwner(request)) {
    await getClient().update(request, { owner })
  }
}
