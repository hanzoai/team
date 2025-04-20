//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { type Training, trainingPrefix, TrainingState } from '@hanzo/training'
import { type Doc, type Ref } from '@hanzo/core'
import { getClient } from '@hanzo/presentation'
import { navigate } from '@hanzo/ui'
import training from '../plugin'
import { trainingRoute } from '../routing/routes/trainingRoute'
import { canCreateTraining } from './canCreateTraining'
import { getCurrentEmployeeRef } from './getCurrentEmployeeRef'
import { getNextTrainingSeqNumber } from './getNextTrainingSeqNumber'

export type CreateTrainingData = Required<
Omit<Training, keyof Doc | 'code' | 'state' | 'revision' | 'owner' | 'author'>
>

export async function createTraining (data: CreateTrainingData): Promise<Ref<Training>> {
  if (!canCreateTraining()) {
    throw new Error('Current user is not allowed to create trainings')
  }

  const client = getClient()
  const currentEmployeeRef = getCurrentEmployeeRef()
  const seqNumber = await getNextTrainingSeqNumber()

  const id = await client.createDoc(training.class.Training, training.space.Trainings, {
    ...data,
    code: `${trainingPrefix}-${seqNumber}`,
    state: TrainingState.Draft,
    revision: 1,
    owner: currentEmployeeRef,
    author: currentEmployeeRef
  })

  navigate(trainingRoute.build({ id, tab: null }))

  return id
}
