//
// Copyright © 2023 Hanzo AI Inc.
//

import type { Question } from '@hanzoteam/questions'
import { getClient } from '@hanzoteam/presentation'
import { canUpdateQuestion } from '../utils'
import { eachItemActionWithAvailability } from './ActionWithAvailability'

export const questionDeleteAction = eachItemActionWithAvailability<Question<unknown>>(
  async (object: Question<unknown>) => {
    return canUpdateQuestion(object)
  },
  async (object: Question<unknown>) => {
    // TODO: Do we need a confirmation popup?
    await getClient().removeCollection(
      object._class,
      object.space,
      object._id,
      object.attachedTo,
      object.attachedToClass,
      object.collection
    )
  },
  true
)
