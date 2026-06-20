//
// Copyright @ 2024 Hanzo AI Inc.
//

import type { Question } from '@hanzoteam/questions'
import { type QuerySelector, SortingOrder } from '@hanzoteam/core'
import { getClient } from '@hanzoteam/presentation'
import questions from '../plugin'

export async function findPreviousQuestion (object: Question<unknown>): Promise<Question<unknown> | undefined> {
  return await getClient().findOne<Question<unknown>>(
    questions.class.Question,
    {
      attachedTo: object.attachedTo,
      attachedToClass: object.attachedToClass,
      collection: object.collection,
      // TODO: Ugly typings hack, because QuerySelector currently does not let use '$lt` on strings
      rank: { $lt: object.rank } as unknown as QuerySelector<Question<unknown>['rank']>
    },
    {
      sort: {
        rank: SortingOrder.Descending
      }
    }
  )
}
