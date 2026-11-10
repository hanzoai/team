/**
 * Who this browser is, decided once, in one place.
 *
 * This is the only module besides `iam.ts` that touches identity, and `iam.ts`
 * is the only one that imports @hanzo/iam. Everything else asks `useSession`
 * who the visitor is, or asks `http.call` to carry them — so there is exactly
 * one place a credential is obtained, refreshed or thrown away, and a second
 * one cannot appear without moving that import.
 *
 * Nothing here is custom auth. Every verb below is a call into @hanzo/iam,
 * which owns the PKCE round trip, the token store and the refresh. There is no
 * password check, no session of our own, no cookie we mint, and no second gate.
 *
 * Two ways in, and both end at the same exchange:
 *
 *   in place   `enter(name, secret)` posts the credential to IAM's login
 *              endpoint, which answers with a PKCE-BOUND authorization code on
 *              this app's own callback URL. `handleCallback(url)` then performs
 *              the ordinary RFC 7636 exchange against it. The password never
 *              reaches the token endpoint and the window never leaves.
 *   redirect   `depart()` hands the whole browser to the issuer. This is what
 *              runs when somebody would rather sign in at hanzo.id, and it is
 *              the fallback if the embedded endpoint is ever unavailable.
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

import { iam } from './iam.ts'
import { invalidate } from './query.ts'

/** Whether this browser holds a session. `unknown` until the first answer. */
export type Standing = 'unknown' | 'out' | 'in'

export type Person = {
  /** The IAM subject. */
  id: string
  /** The login name. */
  name: string
  /** What a screen prints. */
  label: string
  email?: string
  avatar?: string
}

export type Session = {
  standing: Standing
  who: Person | null
  /** Sign in where the browser already is. Rejects with the issuer's reason. */
  enter: (name: string, secret: string) => Promise<void>
  /** Send a one-time code to an email or phone, for the passwordless way in. */
  post: (destination: string) => Promise<void>
  /** Finish the passwordless way in. */
  confirm: (destination: string, code: string) => Promise<void>
  /** Hand the browser to the issuer instead. */
  depart: () => void
  /** End the session where it lives. */
  leave: () => void
  /** Complete a redirect sign-in on the callback route; answers where to go. */
  land: () => Promise<string>
}

const Held = createContext<Session | null>(null)

export const useSession = (): Session => {
  const held = useContext(Held)
  if (!held) throw new Error('useSession outside <Session>')
  return held
}

/** Where a person was before they were asked to sign in. */
const BACK = 'team.back'

const keepHere = () => {
  const here = window.location.pathname + window.location.search
  if (!here.startsWith('/login') && !here.startsWith('/auth/')) sessionStorage.setItem(BACK, here)
}

const take = (): string => {
  const where = sessionStorage.getItem(BACK)
  sessionStorage.removeItem(BACK)
  return where ?? '/'
}

export const Session = ({ children }: { children: ReactNode }) => {
  const [standing, setStanding] = useState<Standing>('unknown')
  const [who, setWho] = useState<Person | null>(null)

  /**
   * Adopt a session.
   *
   * `invalidate()` is not housekeeping. Every read that fired before this
   * browser knew who it was was read as somebody else, and a read that failed
   * for want of an identity has settled into an error nothing re-runs — so the
   * screen would simply stay empty. Adopting a principal re-reads the world.
   */
  const adopt = useCallback(async () => {
    const user = await iam()
      .getUser()
      .catch(() => null)
    setWho(user ? person(user) : null)
    setStanding('in')
    invalidate()
  }, [])

  const drop = useCallback(() => {
    setWho(null)
    setStanding('out')
    invalidate()
  }, [])

  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    void (async () => {
      // The callback route renders inside this provider, so the signed-out path
      // would run on top of a code that is being redeemed. Stand down and let
      // `land` own that outcome.
      if (window.location.pathname.startsWith('/auth/')) return
      const token = await iam()
        .getValidAccessToken()
        .catch(() => null)
      if (token) await adopt()
      else drop()
    })()
  }, [adopt, drop])

  const enter = useCallback(
    async (name: string, secret: string) => {
      try {
        const url = await iam().loginWithPassword(name, secret)
        await iam().handleCallback(url)
        await adopt()
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        if (
          msg.includes('Failed to fetch') ||
          msg.includes('NetworkError') ||
          msg.includes('(404)') ||
          msg.includes('(405)')
        ) {
          keepHere()
          await iam().signinRedirect({ additionalParams: { login_hint: name } })
          return
        }
        throw e
      }
    },
    [adopt],
  )

  const post = useCallback((destination: string) => iam().sendLoginCode(destination), [])

  const confirm = useCallback(
    async (destination: string, code: string) => {
      const url = await iam().loginWithCode(destination, code)
      await iam().handleCallback(url)
      await adopt()
    },
    [adopt],
  )

  const depart = useCallback(() => {
    keepHere()
    void iam().signinRedirect()
  }, [])

  /**
   * Sign out where the session actually lives.
   *
   * The issuer holds it — its own cookie, plus the refresh token this browser
   * stores — so ending it means handing the whole browser back. The navigation
   * is the point: the issuer's cookie is `SameSite=Lax` and rides a document
   * navigation while being withheld from a cross-site fetch, so clearing only
   * the local copy leaves the issuer still recognising this browser and the
   * next sign-in is silent.
   */
  const leave = useCallback(() => {
    const client = iam()
    const access = client.getAccessToken()
    const refresh = client.getRefreshToken()
    const idToken = client.getIdToken()
    client.clearTokens()
    drop()
    void (async () => {
      try {
        const revoke = async (token: string | null, hint: string) => {
          if (!token) return
          await fetch('/v1/iam/oauth/revoke', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              ...(access ? { Authorization: `Bearer ${access}` } : {}),
            },
            body: new URLSearchParams({ token, token_type_hint: hint, client_id: 'hanzo-team' }).toString(),
          }).catch(() => undefined)
        }
        await revoke(refresh, 'refresh_token')
        await revoke(access, 'access_token')
        await fetch('/v1/iam/oauth/logout', {
          method: 'POST',
          credentials: 'include',
          redirect: 'manual',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: 'hanzo-team',
            everywhere: 'true',
            ...(idToken ? { id_token_hint: idToken } : {}),
          }).toString(),
        }).catch(() => undefined)
      } finally {
        const back = `${window.location.origin}/login?from=logout`
        if (window.location.hostname === 'hanzo.team' || window.location.hostname.endsWith('.hanzo.team')) {
          window.location.assign(`https://hanzo.ai/auth/logout?${new URLSearchParams({ to: back })}`)
        } else {
          window.location.assign('/login?from=logout')
        }
      }
    })()
  }, [drop])

  const land = useCallback(async () => {
    const where = take()
    const token = await iam().handleCallback()
    if (!token.accessToken) throw new Error('the issuer returned no access token')
    await adopt()
    return where
  }, [adopt])

  const value = useMemo<Session>(
    () => ({ standing, who, enter, post, confirm, depart, leave, land }),
    [standing, who, enter, post, confirm, depart, leave, land],
  )

  return <Held.Provider value={value}>{children}</Held.Provider>
}

/** The issuer's userinfo, in this app's shape. */
const person = (user: Record<string, unknown>): Person => {
  const name = String(user.preferred_username ?? user.name ?? user.sub ?? '')
  return {
    id: String(user.sub ?? name),
    name,
    label: String(user.name ?? user.preferred_username ?? name),
    email: typeof user.email === 'string' ? user.email : undefined,
    avatar: typeof user.picture === 'string' ? user.picture : undefined,
  }
}

/** Where a refusal sends somebody, remembering where they were. */
export const askToSignIn = () => {
  keepHere()
  window.location.assign('/login')
}
