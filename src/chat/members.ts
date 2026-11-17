/**
 * Adding somebody to a channel, through the server's own rule.
 *
 * `POST /v1/team/channels/:id/members` (cloud apps/team channel_members.go):
 * somebody in the channel, or an admin of the space, may add a member of the
 * space or one of the org's agents. An agent in a private channel answers an
 * @-mention there; outside it, it reads nothing of what is said.
 */
import { team } from '~/data/api.ts'
import { post } from '~/data/http.ts'
import type { Person, Room } from './chat.ts'

export const addToChannel = async (space: string, room: Pick<Room, 'id'>, who: Pick<Person, 'id'>): Promise<void> => {
  await post<unknown>(`${team.channels}/${encodeURIComponent(room.id)}/members`, { space, members: [who.id] })
}
