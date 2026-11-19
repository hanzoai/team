/**
 * Where this app sends somebody to sign in: hanzo.ai's page, never its own.
 *
 * One IAM, and one page everybody signs in on, so the session that answers
 * every Hanzo site on the web lives on hanzo.ai and a person signed in there is
 * not asked again here. This app is still its own OAuth client. It mints its
 * own authorize request (its client, its /auth/callback, a fresh state, and a
 * PKCE challenge whose verifier stays in THIS origin's storage) and hands
 * hanzo.ai only the query. hanzo.ai's /login reads that query as another app's
 * sign-in, finishes it from its session or its panel, and IAM returns the code
 * to this host's callback, where `land` redeems it on this domain. The issuer's
 * own authorize address is dropped: the request is the query, and the page is
 * hanzo.ai's. This is hanzo.ai's own `useLeave` (hanzo-inc/app
 * lib/auth/signin.ts), which its guest hosts leave through the same way.
 *
 * The way out is here too (`logout`), and it comes back: a sign-out ends on
 * this app's own front page, not on hanzo.ai's.
 *
 * Pure, so both addresses are tested without a browser (./away.test.ts).
 */

/** The one site Hanzo signs in on. */
export const SIGNIN = 'https://hanzo.ai'

/**
 * Why somebody leaves: to sign in, to make an account, or to sign in as an
 * account other than the one hanzo.ai remembers. The last is OIDC's
 * `prompt=select_account`, which hanzo.ai answers with its account chooser
 * instead of finishing from its session on arrival.
 */
export type Way = 'login' | 'signup' | 'another'

/** The providers the sign-in panel names. hanzo.ai starts that one's hop for this request on arrival. */
export type Provider = 'google' | 'github'

/** What a press already chose, beyond its way: a provider, or the address typed into the panel. */
export type How = { provider?: Provider; hint?: string }

/**
 * The address typed into the panel, trimmed, or null while it is not one. Only
 * its shape is judged here; whether an account answers to it is hanzo.ai's to say.
 */
export const address = (typed: string): string | null => {
  const at = typed.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(at) ? at : null
}

/**
 * What the SDK is asked to add to this app's authorize request: the typed
 * address as OIDC's `login_hint`, the standard place a sign-in page reads which
 * account to start from. It travels inside the request, so it reaches hanzo.ai
 * with the rest of the query.
 */
export const hinted = (hint?: string): { additionalParams: { login_hint: string } } | undefined =>
  hint ? { additionalParams: { login_hint: hint } } : undefined

export const away =(authorize: string, way: Way = 'login', provider?: string | null): string => {
  const own = new URL(authorize)
  if (way === 'another') own.searchParams.set('prompt', 'select_account')
  // A provider already chosen rides along, so hanzo.ai starts that provider's
  // hop for this request instead of asking again.
  if (provider) own.searchParams.set('provider', provider)
  return `${SIGNIN}${way === 'signup' ? '/signup' : '/login'}${own.search}`
}

/** A dev server on this machine, which IAM will not return a sign-out to. */
/**
 * The silent ask: this app's own authorize request with `prompt=none`, at IAM's
 * authorize on hanzo.ai, where the session cookie lives. Signed in on any Hanzo
 * site, the person comes back to /auth/callback with a code and no page shown;
 * nobody signed in comes back with `login_required` (session.tsx `SILENT`). IAM
 * answers it for the platform's own apps (hanzoai/iam `silentAtSigninOrigin`, D6).
 */
export const silent = (authorize: string): string => {
  const own = new URL(authorize)
  own.searchParams.set('prompt', 'none')
  return `${SIGNIN}/v1/iam/oauth/authorize${own.search}`
}

const SILENT_ERRORS = new Set([
  'login_required',
  'interaction_required',
  'consent_required',
  'account_selection_required',
])

/**
 * Whether IAM's callback error is the normal "no existing session" answer to a
 * silent (`prompt=none`) ask — including IAM's `access_denied` with
 * `no interaction was permitted` description.
 */
export const silentRefusal = (code?: string | null, description?: string | null): boolean => {
  if (!code) return false
  if (SILENT_ERRORS.has(code)) return true
  return (
    code === 'access_denied' &&
    Boolean(description && description.toLowerCase().includes('no interaction was permitted'))
  )
}

export const loopback = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'

/**
 * Where a sign-out goes, once this browser's tokens are handed back.
 *
 * The session that answers this app is IAM's, kept on each origin it signs
 * in on (hanzo.id, hanzo.ai), so ending it is a top-level visit to the
 * issuer's logout: a navigation carries IAM's `SameSite=Lax` cookie where a
 * cross-site fetch would not. `everywhere` ends it on every sign-in origin,
 * not only the issuer's, and IAM then returns the browser to this app's own
 * front page, the marketing page a signed-out visitor sees, which is
 * registered for this client so IAM honours it. No `id_token_hint`: the tokens
 * are already gone, and the client names the app.
 *
 * A dev server stays on its own page: IAM has no address on the loopback to
 * return to.
 */
export const logout = (issuer: string, clientId: string, origin: string): string => {
  if (loopback(new URL(origin).hostname)) return '/login?from=logout'
  const ask = new URLSearchParams({
    client_id: clientId,
    everywhere: 'true',
    post_logout_redirect_uri: new URL('/', origin).href,
  })
  return `${issuer.replace(/\/+$/, '')}/v1/iam/oauth/logout?${ask}`
}
