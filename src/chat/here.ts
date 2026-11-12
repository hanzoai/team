/** The agent the open conversation is with, if it is with one. */
import { useParams } from 'react-router'

import { botIn, withId } from './bots.ts'
import type { Person } from './chat.ts'
import { usePeople, useRooms } from './read.ts'

export const useAgentHere = (): Person | undefined => {
  const { id } = useParams()
  const roster = usePeople().data ?? []
  const rooms = useRooms().data ?? []
  const who = withId(id)
  if (who) return roster.find((p) => p.id === who && p.bot)
  const room = rooms.find((r) => r.id === id)
  return room ? botIn(room, roster) : undefined
}
