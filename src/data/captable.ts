/**
 * The cap table module's requests, signed the way this app signs every request.
 *
 * The cap table lives in Hanzo Cloud and this app reaches it through Cloud's
 * APIs the same way CRM reaches @hanzo/crm: every request leaves through
 * `http.call` (the IAM bearer, no cookie), and who the signed-in person is
 * comes from the same token. No screen here makes a request of its own.
 *
 * Nothing real is kept in this repo: the module names the Cloud addresses and
 * Cloud answers them; cap table rows and the people on them never land here.
 */
import { v1 } from './api.ts'
import { call } from './http.ts'
import { iam } from './iam.ts'

type Send = <T>(path: string, init?: RequestInit) => Promise<T>

/** An init carrying `body` as JSON, or none when there is no body. */
const withBody = (method: string, body?: unknown): RequestInit =>
  body === undefined ? { method } : { method, body: JSON.stringify(body) }

/** Plain-JSON REST on Cloud's `/v1/team/captable` surface. */
export const captable = (send: Send = call) => ({
  get: <T>(url: string): Promise<T> => send<T>(url),
  post: <T>(url: string, body?: unknown): Promise<T> =>
    send<T>(url, withBody('POST', body)),
  put: <T>(url: string, body?: unknown): Promise<T> =>
    send<T>(url, withBody('PUT', body)),
  del: <T>(url: string): Promise<T> => send<T>(url, { method: 'DELETE' }),
})

/** Who the signed-in person is in the orgs, read from the same token CRM reads. */
export type Member = { org: string; superAdmin: boolean; adminOrgs: string[] }

/** Read from the access token's claims exactly as CRM reads them. */
export const memberOf = (token: string | null | undefined): Member => {
  throw new Error('use src/data/crm.ts memberOf')
}
