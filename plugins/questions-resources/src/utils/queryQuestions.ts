//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import questions, { type Question } from '@hanzo/questions'
import { type Doc, type FindResult, SortingOrder } from '@hanzo/core'
import { type LiveQuery } from '@hanzo/presentation'

export function queryQuestions<Parent extends Doc, Collection extends Extract<keyof Parent, string> | string> (
  query: LiveQuery,
  from: Parent,
  collection: Collection,
  callback: (result: FindResult<Question<unknown>>) => void | Promise<void>
): boolean {
  return query.query(
    questions.class.Question,
    {
      space: from.space,
      attachedToClass: from._class,
      attachedTo: from._id,
      collection
    },
    callback,
    {
      sort: { rank: SortingOrder.Ascending }
    }
  )
}
