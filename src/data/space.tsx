/**
 * Which org a person is acting in, and which space they are looking at.
 *
 * The org is NEVER something this app decides on its own. The tenant is read on
 * the server from the token's signed membership set: the gateway honours an
 * `X-Org-Id` only when it names an org the caller belongs to, and the Bots
 * surface sends the open space's org that way (src/bots). What the client
 * holds is the org that came BACK with a space — `SpaceRow.org` —
 * so choosing a space is how a person changes org, and there is no second way
 * to do it. Somebody in two orgs sees both orgs' spaces in one list, and the
 * one they open decides who they are acting as.
 *
 * The plane belongs here for the same reason: one space, one socket, and a
 * space change tears the old one down before the new one opens.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { Denied, spaces as listSpaces, type SpaceRow } from './account.ts'
import { team } from './api.ts'
import { invalidate } from './query.ts'
import { useSession } from './session.tsx'
import { Socket, type Plane, type Standing as Plane_ } from './socket.ts'

/**
 * Where this browser stands with the team plane.
 *
 *   unknown    still asking
 *   stranger   signed in to Hanzo, but this deployment has no account for the
 *              token — the account row and the person's first space are created
 *              by team's own OAuth callback, and nothing else creates them, so
 *              a session that has never walked it is a stranger here
 *   homeless   enrolled, and a member of no space
 *   settled    a space is open
 *   refused    the plane answered, and said no
 */
export type Standing = 'unknown' | 'stranger' | 'homeless' | 'settled' | 'refused'

export type Space = {
  standing: Standing
  /** Every space this person belongs to, in every org. */
  all: SpaceRow[]
  /** The one they are looking at. */
  current: SpaceRow | null
  /** The tenant they are acting in. Server-stated, never chosen here. */
  org: string | null
  /** Open a space by slug. Tears down the previous plane. */
  choose: (slug: string) => void
  /** Create a new organization workspace and add it to the tenant list. */
  /** The data plane for `current`, or null when none is open. */
  plane: Plane | null
  /** Whether that plane is live, for a screen that has to say so. */
  connection: Plane_
  /** Why the plane refused, when it did. */
  refusal: Error | null
  /** Where to go to be enrolled. A full-page trip through the issuer. */
  enrolment: string
}

const Held = createContext<Space | null>(null)

export const useSpace = (): Space => {
  const held = useContext(Held)
  if (!held) throw new Error('useSpace outside <Space>')
  return held
}

/** The last space someone opened, so a reload lands where they were. */
const LAST = 'team.space'

/**
 * The team subsystem's own way in.
 *
 * This is not a second sign-in. It is the same issuer: the server starts its
 * own OIDC round trip, and because IAM already holds this browser's session it
 * completes without asking anything. What it produces is what only it can — the
 * account row this deployment resolves a token's subject against, and a default
 * space in every org the person belongs to.
 */
const ENROLMENT = `${team.account}/auth/openid`

export const Space = ({ children }: { children: ReactNode }) => {
  const { standing: session } = useSession()
  const [standing, setStanding] = useState<Standing>('unknown')
  const [all, setAll] = useState<SpaceRow[]>([])
  const [slug, setSlug] = useState<string | null>(() => localStorage.getItem(LAST))
  const [plane, setPlane] = useState<Plane | null>(null)
  const [connection, setConnection] = useState<Plane_>('idle')
  const [refusal, setRefusal] = useState<Error | null>(null)

  const asked = useRef(false)
  const prevSession = useRef(session)
  useEffect(() => {
    if (prevSession.current !== session) {
      asked.current = false
      invalidate()
    }
    prevSession.current = session
    if (session === 'unknown' || asked.current) return
    asked.current = true
    void (async () => {
      // Signed out has no spaces. Nothing stands in for them: a failed read is a refusal.
      const rows = await (session === 'in' ? listSpaces() : Promise.resolve([] as SpaceRow[])).catch(
        (e: unknown) => e as Error,
      )
      if (rows instanceof Error) {
        setRefusal(rows)
        setStanding(rows instanceof Denied && rows.unauthorized ? 'stranger' : 'refused')
        return
      }
      setAll(rows)
      if (rows.length === 0) {
        setStanding('homeless')
        return
      }
      setSlug((held) => (held && rows.some((r) => r.url === held) ? held : rows[0].url))
    })()
  }, [session])

  useEffect(() => {
    if (!slug) return
    localStorage.setItem(LAST, slug)
    const next = new Socket(slug)
    setPlane(next)
    const stop = next.observe(setConnection)
    next
      .open()
      .then(() => setStanding('settled'))
      .catch((e: unknown) => {
        setRefusal(e as Error)
        setStanding('refused')
      })
    // A plane holds a socket and a timer, so a space change has to close the old
    // one — a second live socket on the same space doubles every broadcast.
    return () => {
      stop()
      next.close()
    }
  }, [slug])

  /**
   * Somebody else's change, arriving.
   *
   * Every read is keyed by the CLASS it reads, so forgetting a class is the
   * whole update: a card another person moved drops the issue family and the
   * board re-reads it. That is why this needs no domain knowledge and why
   * there is one of it rather than one per screen — and it is the same line
   * that answers this browser's own writes, because the server broadcasts a
   * write back to the session that made it.
   */
  useEffect(() => {
    if (!plane) return
    return plane.watch((txes) => {
      for (const tx of new Set(txes.map((t) => String(t.objectClass ?? '')))) if (tx) invalidate(tx)
    })
  }, [plane])

  // A new space is a new world. Nothing read under the old one is true here.
  const choose = useCallback((next: string) => {
    invalidate()
    setSlug(next)
  }, [])

  const current = useMemo(() => all.find((s) => s.url === slug) ?? null, [all, slug])

  const value = useMemo<Space>(
    () => ({
      standing,
      all,
      current,
      org: current?.org ?? null,
      choose,
      plane,
      connection,
      refusal,
      enrolment: ENROLMENT,
    }),
    [standing, all, current, choose, plane, connection, refusal],
  )

  return <Held.Provider value={value}>{children}</Held.Provider>
}

/**
 * The open plane, for a read that cannot run without one.
 *
 * Throwing rather than answering null is deliberate: every caller is inside a
 * read that already reports a phase, so a missing plane becomes that read's
 * failure and gets said out loud, instead of becoming an empty list that looks
 * like a space with nothing in it.
 */
export const usePlane = (): Plane => {
  const { plane } = useSpace()
  if (!plane) throw new Error('no space is open')
  return plane
}
