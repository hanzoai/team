import type { Action } from '@hanzoteam/view'
import view from '@hanzoteam/view'
import { type Client, type DocumentQuery } from '@hanzoteam/core'

export const getCardActions = async (client: Client, query?: DocumentQuery<Action>): Promise<Action[]> => {
  return await client.findAll(view.class.Action, query ?? {})
}
