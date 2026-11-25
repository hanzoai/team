/**
 * The chat reads, as the screens ask for them.
 *
 * Every one answers a PHASE, because a screen that renders rows from an empty
 * array looks identical whether the room has nothing in it, the socket has not
 * answered yet, or the read failed — and a screen scored from whichever of
 * those happened to render is a screen scored from nothing. `data/query.ts`
 * carries the phase; this layer only decides the keys and re-reads on a push.
 *
 * The keys are namespaced by room so a broadcast can drop one room's messages
 * without dropping the roster or the sidebar.
 */
import { useEffect } from 'react'

import { bareAccount, isUuid } from '~/data/model.ts'
import { useSpace } from '~/data/space.tsx'
import { invalidate, useRead, type Read } from '~/data/query.ts'
import { messages, people, reactions, replies, rooms, touches, type Message, type Person, type Reaction, type Room } from './chat.ts'

/** Every room in the open space. */
export const useRooms = (): Read<Room[]> => {
  const { plane, current } = useSpace()
  return useRead(`chat:rooms:${current?.uuid ?? '-'}`, () => (plane ? rooms(plane) : Promise.resolve([])), {
    enabled: Boolean(plane),
  })
}

/** One room's messages, oldest first. */
export const useMessages = (room: string | null): Read<Message[]> => {
  const { plane } = useSpace()
  return useRead(`chat:messages:${room ?? '-'}`, () => (plane && room ? messages(plane, room) : Promise.resolve([])), {
    enabled: Boolean(plane && room),
  })
}

/** Every reaction on those messages, in one read rather than one per message. */
export const useReactions = (ids: string[]): Read<Reaction[]> => {
  const { plane } = useSpace()
  // The key is the SET, so a new message re-reads and a re-render does not.
  const key = ids.join(',')
  return useRead(`chat:reactions:${key.slice(0, 200)}:${ids.length}`, () => (plane ? reactions(plane, ids) : Promise.resolve([])), {
    enabled: Boolean(plane) && ids.length > 0,
  })
}

/** The replies hanging off one message. */
export const useReplies = (message: string | null): Read<Message[]> => {
  const { plane } = useSpace()
  return useRead(`chat:replies:${message ?? '-'}`, () => (plane && message ? replies(plane, message) : Promise.resolve([])), {
    enabled: Boolean(plane && message),
  })
}

/** The roster, so a message is drawn with a name rather than a uuid. */
export const usePeople = (): Read<Person[]> => {
  const { plane, current } = useSpace()
  return useRead(`chat:people:${current?.uuid ?? '-'}`, () => (plane ? people(plane) : Promise.resolve([])), {
    enabled: Boolean(plane),
  })
}

/**
 * Re-read a room when the space says something happened in it.
 *
 * The plane broadcasts every applied transaction, this browser's own included,
 * so a message somebody else sent and a message this person just sent arrive
 * through the same line — which is the point. Nothing is patched in locally;
 * the screen re-reads, and there is no optimistic copy to disagree with the
 * server the first time a write is refused.
 */
export const useLive = (room: string | null) => {
  const { plane } = useSpace()
  useEffect(() => {
    if (!plane || !room) return
    return plane.watch((txes) => {
      if (!touches(txes, room)) return
      invalidate(`chat:messages:${room}`)
      invalidate('chat:reactions:')
      invalidate('chat:replies:')
    })
  }, [plane, room])
}

/** What to call somebody. Never exposes a raw 36-char UUID (#393). */
export const nameOf = (people: Person[], id: string): string => {
  const bare = bareAccount(id)
  const hit = people.find((p) => p.id === id || p.id === bare || bareAccount(p.id) === bare)
  if (hit?.name && !isUuid(hit.name)) return hit.name
  return short(bare)
}

/** A uuid nobody has a name for, shortened cleanly so raw UUIDs never appear. */
const short = (id: string): string => {
  if (!id) return 'Team member'
  if (isUuid(id)) return `Member · ${id.slice(0, 6)}`
  return id.length > 12 ? `${id.slice(0, 8)}…` : id
}

/** The two letters a fallback avatar draws. */
export const initials = (name: string): string =>
  name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?'
