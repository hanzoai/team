/**
 * The one IAM client.
 *
 * It lives apart from the session because two things need it and neither may
 * build its own: the session drives the sign-in, and `http.ts` asks it for the
 * bearer on every call. A second instance would hold a second PKCE verifier in
 * a second storage slot, and whichever one did not start the round trip could
 * not finish it.
 *
 * One exception, and why it is safe: the Bots surface hands @hanzo/app a
 * provider built from the same `config()`. It reads the stored session and
 * never starts a sign-in, so it holds no verifier, and the SDK leases a refresh
 * across instances, so the two never rotate the same token at once.
 *
 * Built on first use rather than at import, because it reads `window`.
 */
import { IAM } from '@hanzo/iam'

import { brand, clientId } from './brand.ts'
import { callbackPath, loginPath } from './api.ts'

/**
 * What a session asks for.
 *
 * `offline_access` is what makes a session outlive its access token. IAM issues
 * a refresh token only when asked, and without one the only way past an expiry
 * is a full redirect to the issuer — a page navigation in the middle of
 * whatever somebody was typing.
 */
const scope = 'openid profile email offline_access'

let engine: IAM | null = null

/**
 * The client's settings, stated once: this client is built from them, and so
 * is the provider the Bots app (@hanzo/app) reads its session through, so the
 * two speak to IAM as one app.
 */
export const config = () => {
  // Where the browser already is. A redirect URI is a round trip back to THIS
  // document, so the origin serving it is the only correct answer — a literal
  // is right for one port and silently wrong for every other.
  const here = window.location.origin
  return {
    serverUrl: brand.issuer,
    clientId,
    redirectUri: `${here}${callbackPath}`,
    postLogoutRedirectUri: `${here}${loginPath}`,
    scope,
    /**
     * Where the token exchange and userinfo go.
     *
     * The dev server proxies `/v1`, which makes the exchange same-origin and
     * takes CORS out of it on a loopback host. In a published build there is
     * nothing to proxy through, so it addresses the issuer directly. Neither
     * call carries a cookie, so the issuer needs only to answer this origin,
     * not to trust it with credentials.
     */
    proxyBaseUrl: import.meta.env.DEV ? here : undefined,
  }
}

export const iam = (): IAM => {
  if (engine) return engine

  // No `organization`: the SDK reads it only for a credential posted from this
  // page, and nobody signs in on this page. The way in is hanzo.ai's
  // (./away.ts), and this client only mints the request it carries and
  // redeems the code that comes back.
  engine = new IAM(config())


  return engine
}
