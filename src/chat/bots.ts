/**
 * A bot is a member of the space, and a conversation with it is a real one.
 *
 * Bots come from the roster the server projects (a Person whose position is
 * `Agent`) and from nowhere else. The server answers a direct message whose
 * members include the agent's member account, and an @-mention of it in a
 * channel (cloud apps/team chat.go), so the way into a bot here is
 * `POST /v1/team/dms` (`dm.ts`), reached through the address `/chat/with-<uuid>`.
 *
 * Working with one bot up close — its own thread, its computer, its schedule,
 * making one — is hanzo.bot's, and `hanzoBot` is the way there.
 */
import type { Person, Room } from './chat.ts'

const WITH = 'with-'

/** Where one bot is worked with up close: its own app. */
const BOT_APP = 'https://hanzo.bot/bots'

/** The address of a conversation with somebody on the roster. */
export const withPath = (person: Pick<Person, 'id'>): string => `/chat/${WITH}${person.id}`

/**
 * hanzo.bot, open on a bot when one is named, in the org this space works in.
 *
 * The org rides as `?org=`: hanzo.bot's gate opens it when the person belongs
 * to it and ignores it otherwise, so a link never lands somebody in another
 * org's bots and never gives them one they are not in.
 */
export const hanzoBot = (bot?: string | null, org?: string | null): string => {
  const url = new URL(BOT_APP)
  if (bot) url.searchParams.set('bot', bot)
  if (org) url.searchParams.set('org', org)
  return url.toString()
}

/** The person a `with-<uuid>` address names, if it names one. */
export const withId = (id: string | undefined): string | undefined =>
  id?.startsWith(WITH) ? id.slice(WITH.length) : undefined

/** Every agent on the roster that is still one, by name. A deleted agent stays a Person, marked gone. */
export const botsOf = (roster: readonly Person[]): Person[] =>
  roster.filter((p) => p.bot && !p.gone).sort((a, b) => a.name.localeCompare(b.name))

/** The agent in a direct message, if one of its members is an agent. */
export const botIn = (room: Pick<Room, 'kind' | 'members'>, roster: readonly Person[]): Person | undefined =>
  room.kind === 'direct' ? roster.find((p) => p.bot && room.members.includes(p.id)) : undefined

/**
 * The bot a one-to-one direct message is with: just the reader and one agent.
 * A direct message among several people that includes a bot is theirs, and is
 * listed with the other conversations.
 */
export const botDm = (room: Pick<Room, 'kind' | 'members'>, roster: readonly Person[]): Person | undefined =>
  room.members.length <= 2 ? botIn(room, roster) : undefined

/** The bots a channel could still be given: every live one not already in it. */
export const addable = (room: Pick<Room, 'kind' | 'members'>, roster: readonly Person[]): Person[] =>
  room.kind === 'channel' ? botsOf(roster).filter((p) => !room.members.includes(p.id)) : []
