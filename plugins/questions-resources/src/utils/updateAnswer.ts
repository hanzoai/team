//
// Copyright @ 2024 Hanzo AI Inc.
//

import type { Answer, Question } from '@hanzoteam/questions'
import type { DocumentUpdate, TxOperations } from '@hanzoteam/core'

export async function updateAnswer<A extends Answer<Question<unknown>, unknown>> (
  client: TxOperations,
  answer: A,
  update: DocumentUpdate<A>
): Promise<void> {
  // TODO: Add check?
  await client.updateCollection(
    answer._class,
    answer.space,
    answer._id,
    answer.attachedTo,
    answer.attachedToClass,
    answer.collection,
    update
  )
}
