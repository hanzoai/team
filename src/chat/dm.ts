/** Opening the real direct message with somebody on the roster. */
import { post } from '~/data/http.ts'
import type { Person, Room } from './chat.ts'

/** What `POST /v1/team/dms` answers. */
type Opened = { channel: { id: string; members?: string[]; archived?: boolean }; created: boolean }

/** Open, or find, the DM with a person; the server answers 201 or 200. */
export const openDm = async (space: string, who: Person): Promise<Room> => {
  const out = await post<Opened>('/v1/team/dms', { space, members: [who.id] })
  return {
    id: out.channel.id,
    kind: 'direct',
    name: who.name,
    private: true,
    archived: out.channel.archived === true,
    members: out.channel.members ?? [],
  }
}
