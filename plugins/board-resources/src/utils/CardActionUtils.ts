import type { Action } from '@hanzo/view'
import view from '@hanzo/view'
import { type Client, type DocumentQuery } from '@hanzo/core'

export const getCardActions = async (client: Client, query?: DocumentQuery<Action>): Promise<Action[]> => {
  return await client.findAll(view.class.Action, query ?? {})
}
