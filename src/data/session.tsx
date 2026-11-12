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
 * One way in, and it is not on this origin. `depart()` sends the browser to
 * hanzo.ai/login, the page everybody signs in on, carrying this app's own
 * authorize request (./away.ts). hanzo.ai signs the person in, or answers from
 * the session it already holds, and IAM returns the code to this app's
 * /auth/callback, where `land()` performs the ordinary RFC 7636 exchange. No
 * credential is typed here, so a session is only ever started on hanzo.ai and
 * every Hanzo site on the web is answered by that one.
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

import { away, hinted, logout, loopback, silent, type How, type Way } from './away.ts'
import { brand, clientId } from './brand.ts'
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
  /**
   * Leave for hanzo.ai to sign in (or make an account, or choose another one)
   * with this app's own request. Rejects only when the request cannot be made,
   * such as a browser that keeps no storage for the PKCE verifier.
   */
  depart: (way?: Way, how?: How) => Promise<void>
  /**
   * This app's own authorize request, for the shared sign-in panel
   * (@hanzo/ui/auth `SignInPanel` `request`): the page to come back to is kept
   * first, as `depart` keeps it, and the SDK keeps the PKCE verifier and state.
   */
  request: (params?: { additionalParams?: Record<string, string> }) => Promise<string>
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

/**
 * ONE ASK OF hanzo.ai PER TAB. A tab with no tokens asks hanzo.ai whether the
 * person is signed in there (./away.ts `silent`), once, and never from a
 * crawler or an automated browser, which hold no session to find. Written down
 * before it is made, so it is made once; a browser that keeps no storage cannot
 * remember asking, so it never asks.
 */
const ASKED = 'team.silent'
const AUTOMATED = /bot|crawl|spider|slurp|preview|lighthouse|headless/i

const unasked = (): boolean => {
  if (navigator.webdriver || AUTOMATED.test(navigator.userAgent) || loopback(window.location.hostname)) return false
  try {
    return !sessionStorage.getItem(ASKED)
  } catch {
    return false
  }
}

const asked = () => {
  try {
    sessionStorage.setItem(ASKED, '1')
  } catch {
    /* unasked() already answered no for a browser with no store */
  }
}

/**
 * IAM's answers to a request that allowed no page (`prompt=none`, OIDC Core
 * §3.1.2.6): the silent ask found nobody it could sign in without them. Nothing
 * failed; the visitor goes back to the page they were on, signed out as before.
 */
const SILENT = new Set(['login_required', 'interaction_required', 'consent_required', 'account_selection_required'])

/** How long a tab is looked away from before its session is asked about again. */
const RECHECK = 60_000

/** Whether IAM refused the token outright: the SDK's userinfo read names the status it got. */
const refused = (e: unknown): boolean => {
  const msg = e instanceof Error ? e.message : String(e)
  return msg.includes('(401)') || msg.includes('(403)')
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
    try {
      const user = await iam().getUser()
      setWho(user ? person(user) : null)
      setStanding('in')
      invalidate()
    } catch (e: unknown) {
      if (refused(e)) {
        iam().clearTokens()
        setWho(null)
        setStanding('out')
        invalidate()
        return
      }
      setWho(null)
      setStanding('in')
      invalidate()
    }
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
      if (new URLSearchParams(window.location.search).get('from') === 'logout') {
        asked()
        iam().clearTokens()
        drop()
        return
      }
      const token = await iam()
        .getValidAccessToken()
        .catch(() => null)
      if (token) return adopt()
      // No tokens here, and maybe a session on hanzo.ai from any Hanzo site: ask
      // it once, with no page (./away.ts `silent`). Signed in, `land` redeems the
      // code; not, the callback brings the visitor back here signed out.
      if (unasked()) {
        asked()
        keepHere()
        try {
          window.location.replace(silent(await iam().getSigninUrl({ additionalParams: { prompt: 'none' } })))
          return
        } catch {
          /* no request could be made (no storage for the verifier): signed out */
        }
      }
      drop()
    })()
  }, [adopt, drop])

  /**
   * A SIGN-OUT ON ANY HANZO SITE SIGNS THIS TAB OUT. Leaving any first-party
   * site deletes the person's grant to all of them (hanzoai/iam `revokeShared`),
   * and IAM's userinfo then refuses this app's token. A tab already open read it
   * only when it loaded, so it is read again when the tab is looked at after a
   * minute or more; a refusal drops the tokens and the tab is signed out. A
   * network fault or a 5xx signs nobody out.
   */
  useEffect(() => {
    if (standing !== 'in') return
    let last = Date.now()
    const seen = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < RECHECK) return
      last = Date.now()
      void iam()
        .getUserInfo()
        .catch((e: unknown) => {
          if (!refused(e)) return
          iam().clearTokens()
          drop()
        })
    }
    document.addEventListener('visibilitychange', seen)
    return () => document.removeEventListener('visibilitychange', seen)
  }, [standing, drop])

  /**
   * The SDK builds the authorize address and keeps the PKCE verifier and state
   * in this origin's storage, exactly as its own redirect would, so `land`
   * redeems the code hanzo.ai sends back like any other. Only the query leaves
   * (./away.ts). REPLACE, as the SDK's redirect does, so the trip occupies the
   * one history entry the page that started it had.
   *
   * An address typed on the panel goes INTO the request (`login_hint`), where
   * the SDK puts any parameter of its own; a provider pressed there rides beside
   * it for hanzo.ai's page, as one named in this page's own address does.
   */
  const depart = useCallback(async (way: Way = 'login', how: How = {}) => {
    keepHere()
    const own = await iam().getSigninUrl(hinted(how.hint))
    const provider = how.provider ?? new URLSearchParams(window.location.search).get('provider')
    window.location.replace(away(own, way, provider))
  }, [])

  const request = useCallback((params?: { additionalParams?: Record<string, string> }) => {
    keepHere()
    return iam().getSigninUrl(params)
  }, [])

  /**
   * Sign out where the session actually lives, and come back here.
   *
   * Not on this origin: this app signed in on hanzo.ai, so what answers it is
   * IAM's session there and on hanzo.id, plus the tokens this browser stores.
   * The tokens go back first, naming the client they were minted for (this
   * brand's, `clientId`), since a revocation is checked against the client
   * that asks (RFC 7009 §2.1). Then the whole browser visits the issuer's
   * logout (./away.ts `logout`), which ends the session on every origin IAM
   * signs in on and returns to this app's front page, signed out. The
   * navigation is the point: the session cookie is `SameSite=Lax` and rides a
   * document navigation while being withheld from a cross-site fetch, so
   * clearing only the local copy leaves IAM still recognising this browser and
   * the next sign-in is silent.
   */
  const leave = useCallback(() => {
    const client = iam()
    const access = client.getAccessToken()
    const refresh = client.getRefreshToken()
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
            body: new URLSearchParams({ token, token_type_hint: hint, client_id: clientId }).toString(),
          }).catch(() => undefined)
        }
        await revoke(refresh, 'refresh_token')
        await revoke(access, 'access_token')
      } finally {
        window.location.assign(logout(brand.issuer, clientId, window.location.origin))
      }
    })()
  }, [drop])

  const land = useCallback(async () => {
    const where = take()
    // The silent ask found nobody signed in on hanzo.ai: back to the page it left.
    if (SILENT.has(new URLSearchParams(window.location.search).get('error') ?? '')) return where
    const token = await iam().handleCallback()
    if (!token.accessToken) throw new Error('the issuer returned no access token')
    await adopt()
    return where
  }, [adopt])

  const value = useMemo<Session>(
    () => ({ standing, who, depart, request, leave, land }),
    [standing, who, depart, request, leave, land],
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
