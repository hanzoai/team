/**
 * The addresses this client states for itself, and the one place an API host
 * appears.
 *
 * In development the origin is EMPTY and every call is relative, because the
 * dev server proxies `/v1` — which is also what makes the issuer's credential
 * exchange same-origin on a loopback host the issuer will not answer to. A
 * published build is served from the site plane rather than from behind the
 * gateway, so it names the one endpoint. The credential is a bearer token, so
 * the call carries no cookie and needs no credentialed CORS.
 *
 * What can never be relative is the ISSUER's two full-page trips: the browser
 * leaves, so neither of them is a request.
 */
import { brand } from './brand.ts'

/** The one endpoint. Everything the estate publishes is under `/v1` on it. */
const origin = import.meta.env?.DEV ? '' : 'https://api.hanzo.ai'

/** The team subsystem, mounted at `/v1/team`. No `/api/` hop. */
export const team = {
  /** The account JSON-RPC: spaces, space selection, memberships, people. */
  account: `${origin}/v1/team/account`,
  /** Channels and their messages — the REST half of the chat surface. */
  channels: `${origin}/v1/team/channels`,
  /** Open, or find, a direct message. */
  dms: `${origin}/v1/team/dms`,
  /** Per-space file storage. */
  files: `${origin}/v1/team/files`,
  /** The plan, the seats and the guest cap. */
  plan: `${origin}/v1/team/billing/plan`,
} as const

/** The issuer, for the trips the IAM SDK does not make. */
export const issuer = {
  signup: `${brand.issuer}/signup/${brand.org}-${brand.app}`,
} as const

/** Where a refusal sends somebody who has to sign in. */
export const loginPath = '/login'

/** Where the issuer returns them. */
export const callbackPath = '/auth/callback'
