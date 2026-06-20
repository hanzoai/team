//
// Copyright @ 2024 Hanzo AI Inc.
//

import questions, { type Answer, type Question } from '@hanzoteam/questions'
import { type Doc, SortingOrder } from '@hanzoteam/core'
import { getClient } from '@hanzoteam/presentation'

export async function findAnswers<Parent extends Doc, Collection extends Extract<keyof Parent, string> | string> (
  from: Parent,
  collection: Collection
): Promise<Array<Answer<Question<unknown>, unknown>>> {
  return await getClient().findAll(
    questions.class.Answer,
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
