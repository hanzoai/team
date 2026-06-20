//
// Copyright @ 2024 Hanzo AI Inc.
//

import questions, { type Question } from '@hanzoteam/questions'
import { type Doc, SortingOrder } from '@hanzoteam/core'
import { getClient } from '@hanzoteam/presentation'

export async function findQuestions<Parent extends Doc, Collection extends Extract<keyof Parent, string> | string> (
  from: Parent,
  collection: Collection
): Promise<Array<Question<unknown>>> {
  return await getClient().findAll(
    questions.class.Question,
    {
      space: from.space,
      attachedToClass: from._class,
      attachedTo: from._id,
      collection
    },
    {
      sort: { rank: SortingOrder.Ascending }
    }
  )
}
