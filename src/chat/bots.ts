/**
 * A bot is a member of the space, and a conversation with it is a real one.
 *
 * Bots come from the roster the server projects (a Person whose position is
 * `Agent`) and from nowhere else. The server answers only a direct message
 * whose members include the agent's member account, so the way into a bot is
 * `POST /v1/team/dms` (`dm.ts`), reached through the address `/chat/with-<uuid>`.
 */
import type { Person, Room } from './chat.ts'

const WITH = 'with-'

/** The address of a conversation with somebody on the roster. */
export const withPath = (person: Pick<Person, 'id'>): string => `/chat/${WITH}${person.id}`

/**
 * Where a bot is talked to: the Bots app, the same one hanzo.bot draws, open on
 * it. A bot on the roster is a cloud agent under the same name (the server
 * folds `/v1/agents` into the roster), so its conversation is that agent's.
 */
export const botPath = (bot: Pick<Person, 'name'>): string => `/bots?bot=${encodeURIComponent(bot.name)}`

/** The person a `with-<uuid>` address names, if it names one. */
export const withId = (id: string | undefined): string | undefined =>
  id?.startsWith(WITH) ? id.slice(WITH.length) : undefined

/** Every agent on the roster that is still one, by name. A deleted agent stays a Person, marked gone. */
export const botsOf = (roster: readonly Person[]): Person[] =>
  roster.filter((p) => p.bot && !p.gone).sort((a, b) => a.name.localeCompare(b.name))

/** The agent in a direct message, if one of its members is an agent. */
export const botIn = (room: Pick<Room, 'kind' | 'members'>, roster: readonly Person[]): Person | undefined =>
  room.kind === 'direct' ? roster.find((p) => p.bot && room.members.includes(p.id)) : undefined
