/**
 * The one IAM client.
 *
 * It lives apart from the session because two things need it and neither may
 * build its own: the session drives the sign-in, and `http.ts` asks it for the
 * bearer on every call. A second instance would hold a second PKCE verifier in
 * a second storage slot, and whichever one did not start the round trip could
 * not finish it.
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

export const iam = (): IAM => {
  if (engine) return engine

  // Where the browser already is. A redirect URI is a round trip back to THIS
  // document, so the origin serving it is the only correct answer — a literal
  // is right for one port and silently wrong for every other.
  const here = window.location.origin

  engine = new IAM({
    serverUrl: brand.issuer,
    clientId,
    // Required for the credential path, and the quiet failure when it is left
    // out: the redirect flow works and an embedded sign-in answers nothing.
    organization: brand.org,
    redirectUri: `${here}${callbackPath}`,
    postLogoutRedirectUri: `${here}${loginPath}`,
    scope,
    /**
     * Where the credential POST and the token exchange go.
     *
     * Signing in without leaving the page means a cross-origin POST to the
     * issuer carrying `credentials: include`, and a browser drops such a
     * response unless the issuer answers `Access-Control-Allow-Credentials`.
     * Measured at hanzo.id: `https://hanzo.team` is answered with it and
     * `https://team2.hanzo.ai` and `http://localhost` are answered without —
     * so on those two the embedded form fails and the redirect is the only way
     * in.
     *
     * The dev server proxies `/v1`, which makes the whole exchange same-origin
     * and takes CORS out of it entirely. In a published build there is nothing
     * to proxy through, so it addresses the issuer directly and the host has to
     * be one the issuer trusts with credentials.
     */
    proxyBaseUrl: import.meta.env.DEV ? here : undefined,
  })

  // On hanzo.team, `/v1/iam/login` and `/v1/iam/verification-codes` are served
  // same-origin (avoiding cross-origin CORS preflight refusal on sessionRoutes),
  // whereas `/v1/iam/oauth/token` and `/v1/iam/oauth/userinfo` live on the issuer
  // (`https://hanzo.id`) with CORS enabled. Route the credential POSTs through
  // `here` while keeping token and userinfo exchanges on `brand.issuer`.
  const cfg = (engine as unknown as { config: { proxyBaseUrl?: string } }).config
  const withSameOriginCredential = <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
    async (...args: A): Promise<R> => {
      const prev = cfg.proxyBaseUrl
      cfg.proxyBaseUrl = here
      try {
        return await fn(...args)
      } finally {
        cfg.proxyBaseUrl = prev
      }
    }

  engine.loginWithPassword = withSameOriginCredential(engine.loginWithPassword.bind(engine))
  engine.loginWithCode = withSameOriginCredential(engine.loginWithCode.bind(engine))
  engine.sendLoginCode = withSameOriginCredential(engine.sendLoginCode.bind(engine))

  return engine
}
