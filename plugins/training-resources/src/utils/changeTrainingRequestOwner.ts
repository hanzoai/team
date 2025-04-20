//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { TrainingRequest } from '@hanzo/training'
import type { Employee } from '@hanzo/contact'
import type { Ref } from '@hanzo/core'
import { getClient } from '@hanzo/presentation'
import { canChangeTrainingRequestOwner } from './canChangeTrainingRequestOwner'

export async function changeTrainingRequestOwner (request: TrainingRequest, owner: Ref<Employee>): Promise<void> {
  if (canChangeTrainingRequestOwner(request)) {
    await getClient().update(request, { owner })
  }
}
