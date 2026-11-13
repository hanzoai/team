/**
 * How a request leaves this app, and there is one way.
 *
 * The bearer is the IAM access token and nothing else. No cookie is asked for
 * and none is sent: the team subsystem accepts an IAM access token on every
 * surface this app touches, so a second credential would be a second thing to
 * expire, refresh and get wrong. The org is NOT carried — `X-Org-Id` is
 * stripped on ingress and the tenant is read from the token's signed
 * membership set, which is the only reason a client cannot name someone else's
 * space.
 *
 * Addresses are relative. The dev server proxies `/v1`, a published build is
 * served from a host the gateway already fronts, and so no module here learns
 * an API host.
 */
import { iam } from './iam.ts'

/** A refusal that carries the status, so a caller can tell 401 from 500. */
export class Refused extends Error {
  readonly status: number
  readonly detail: string

  constructor(status: number, detail: string) {
    super(detail || `HTTP ${status}`)
    this.status = status
    this.detail = detail
    this.name = 'Refused'
  }
}

const bearer = async (): Promise<Record<string, string>> => {
  const token = await iam()
    .getValidAccessToken()
    .catch(() => null)
  return token ? { authorization: `Bearer ${token}` } : {}
}

/**
 * One call. JSON in, JSON out, a `Refused` on anything else.
 *
 * The body is read as text before it is parsed, because the estate's hosts
 * answer some misses with an HTML document at status 200 — a `res.json()`
 * against that reports a syntax error at a character offset, which says
 * nothing about the address that was wrong.
 */
export const call = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(path, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...(await bearer()),
      ...init?.headers,
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Refused(res.status, detailOf(text) || res.statusText)
  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Refused(res.status, `expected JSON, read ${text.length} bytes of ${res.headers.get('content-type') ?? 'nothing'}`)
  }
}

export const post = <T>(path: string, body: unknown): Promise<T> =>
  call<T>(path, { method: 'POST', body: JSON.stringify(body) })

/** The estate answers a refusal as `{code, detail}`; anything else is its own text. */
const detailOf = (text: string): string => {
  try {
    const body = JSON.parse(text) as { detail?: string; message?: string }
    return body.detail ?? body.message ?? ''
  } catch {
    return text.slice(0, 200)
  }
}
