//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import questions, { type Answer, type Question } from '@hanzo/questions'
import { type Doc, SortingOrder } from '@hanzo/core'
import { getClient } from '@hanzo/presentation'

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
