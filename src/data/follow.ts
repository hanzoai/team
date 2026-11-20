/**
 * What another tab's change to the stored session means for this tab.
 *
 * The SDK keeps the tokens in this origin's localStorage, and the browser tells
 * every other tab of the origin when a key there changes (a `storage` event). So
 * a sign-out in one hanzo.team tab signs every other one out at once, and a
 * sign-in in one signs the others in, with nothing asked of IAM. hanzo.ai's tabs
 * follow each other the same way (@hanzo/app lib/session `follow`).
 *
 * Pure, so every case is tested without a browser (./follow.test.ts).
 */

/** The SDK's stored access token: the key a sign-in, a refresh and a sign-out write. */
export const ACCESS = 'hanzo_iam_access_token'

/** The subject a stored access token names, or null when it names none. */
export const subjectOf = (token: string | null | undefined): string | null => {
  if (!token) return null
  try {
    const part = token.split('.')[1] ?? ''
    const claims = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: unknown }
    return typeof claims.sub === 'string' && claims.sub ? claims.sub : null
  } catch {
    return null
  }
}

/**
 * Where a tab goes when its session ends somewhere else: the front page, where
 * a sign-out on hanzo.team itself lands (./away.ts `logout`). null when the tab
 * is already there, which only has to be drawn signed out.
 */
export const home = (pathname: string, search: string): string | null =>
  pathname === '/' && !search ? null : '/'

/** How this tab stands: `unknown` until its first answer (session.tsx `Standing`). */
type Standing = 'unknown' | 'out' | 'in'

/**
 * `drop` when another tab left the store with no token and this one is drawn
 * signed in; `adopt` when the store now names a person this tab is not drawn as
 * (it is signed out, or signed in as someone else); null otherwise. A refresh in
 * another tab, a new token for the same person, is not a move. `key` null is the
 * whole store cleared. `was` is the event's old value, and `now` the stored
 * token after the change, read from the store. A tab still settling its first
 * answer (`unknown`) is left to settle it.
 */
export function follow(standing: Standing, key: string | null, was: string | null, now: string | null): 'drop' | 'adopt' | null {
  if (standing === 'unknown') return null
  if (key !== null && key !== ACCESS) return null
  if (!now) return standing === 'in' ? 'drop' : null
  if (standing === 'out') return 'adopt'
  return subjectOf(now) === subjectOf(was) ? null : 'adopt'
}
