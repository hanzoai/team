/**
 * WHICH product this is, decided by the host.
 *
 * One image serves every host it is published on, so none of this may be
 * compiled in. A build-time variable pins the deployment to whichever brand
 * happened to build it, and a second host then sends its visitors to the first
 * one's issuer carrying a `redirect_uri` that issuer has never heard of — an
 * error page in front of a perfectly healthy server.
 *
 * Deriving the org from the hostname is not enough either: the label left of the
 * suffix is `team2`, the organization is `hanzo`, and the issuer is neither. So
 * each brand states its own facts and the hosts it answers on, and a new brand
 * is a new record and nothing else.
 */
export type Brand = {
  /** IAM organization, lowercase. The OAuth client is `<org>-<app>`. */
  org: string
  /** This app's name within the org. The other half of the client id. */
  app: string
  /** IAM origin. */
  issuer: string
  /** The product's name: the tab, the rail. */
  title: string
  /** The hosts this brand answers on. */
  hosts: readonly string[]
}

const BRANDS: readonly Brand[] = [
  {
    org: 'hanzo',
    app: 'team-native',
    issuer: 'https://hanzo.id',
    title: 'Team',
    hosts: ['hanzo.team', 'www.hanzo.team', 'hanzo.app', 'localhost', '127.0.0.1'],
  },
  {
    org: 'hanzo',
    app: 'team2',
    issuer: 'https://hanzo.id',
    title: 'Team',
    hosts: ['team2.hanzo.ai', 'team2.hanzo.app', 'hanzo-team.hanzo.app'],
  },
]

const host = (): string => (typeof window === 'undefined' ? '' : window.location.hostname)

export const brand: Brand = BRANDS.find((b) => b.hosts.includes(host())) ?? BRANDS[0]

/**
 * The OAuth client. `<org>-<app>`, which is the estate's naming rule and the
 * key IAM's provisioner upserts on, so the id a client sends and the id the
 * universe declaration creates are the same string by construction.
 */
export const clientId = `${brand.org}-${brand.app}`
