/**
 * The room's members, as faces.
 *
 * The stack itself is the board's — overlap, separating ring and `+N` are
 * already solved there and drawing them again here would be two components that
 * have to be changed together. This is the adapter: chat holds a member as an
 * id and the roster says what to call it, so the join happens once, here, and
 * `People` keeps taking the one shape it takes everywhere.
 *
 * It wants a shared home. Until it has one this is the single import to move.
 */
import { bareAccount } from '~/data/model.ts'
import { People as Faces } from '~/tracker/board/People.tsx'
import type { Person } from './chat.ts'
import { nameOf } from './read.ts'

export function People({ members, people }: { members: string[]; people: Person[] }) {
  if (members.length === 0) return null
  return (
    <Faces
      people={members.map((id) => ({ id, name: nameOf(people, id), face: faceOf(people, id) }))}
      size={28}
      show={4}
      ground="$panel"
    />
  )
}

const faceOf = (people: Person[], id: string): string | undefined => {
  const bare = bareAccount(id)
  return people.find((p) => p.id === id || p.id === bare || bareAccount(p.id) === bare)?.avatar
}
