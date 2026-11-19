/**
 * The CRM's requests, signed the way this app signs every request.
 *
 * The CRM is @hanzo/crm, the same one crm.hanzo.ai and the console draw: the
 * org's people, companies, pipeline, fundraising, tasks, lists, candidates and
 * sequences, kept in the org's own Base (module `crm`). It builds its own
 * addresses and reads its own answers; what it asks of this app is how a request
 * leaves (`http.call`: the IAM bearer, no cookie, the org the token's), and who
 * the signed-in person is allowed to be in the org. Both are here, so no screen
 * makes a request of its own.
 */
import { baseClient, type BaseClient } from '@hanzo/crm/base'
import { claimsOf, membershipsFromToken, superAdmin } from '@hanzo/iam/identity'

import { v1 } from './api.ts'
import { call } from './http.ts'
import { iam } from './iam.ts'

type Send = <T>(path: string, init?: RequestInit) => Promise<T>

/** An init carrying `body` as JSON, or none when there is no body. */
const withBody = (method: string, body?: unknown): RequestInit =>
  body === undefined ? { method } : { method, body: JSON.stringify(body) }

/** Plain-JSON REST on a full URL: what the CRM asks for mail, the drip and the beta. */
export const rest = (send: Send = call) => ({
  get: <T>(url: string): Promise<T> => send<T>(url),
  post: <T>(url: string, body?: unknown): Promise<T> => send<T>(url, withBody('POST', body)),
  del: <T>(url: string): Promise<T> => send<T>(url, { method: 'DELETE' }),
})

/** The org's Base, `/v1/base`, as the CRM reads and writes it. */
export const base = (send: Send = call): BaseClient =>
  baseClient({ baseUrl: v1('base'), send: (method, url, body) => send<unknown>(url, withBody(method, body)) })

/**
 * Who the signed-in person is in the orgs: the org the token acts in (its first
 * membership, the one IAM signs first), whether they are a SuperAdmin, and the
 * orgs they administer.
 */
export type Member = { org: string; superAdmin: boolean; adminOrgs: string[] }

/**
 * Read from the access token's claims exactly as the console reads them: a
 * SuperAdmin is @hanzo/iam's one reading, and an org is theirs to administer
 * when its membership names them admin or owner. It decides what the CRM offers
 * (growing the CRM, the suppression list); the server decides what it allows.
 */
export const memberOf = (token: string | null | undefined): Member => {
  const { organizations, roles } = membershipsFromToken(token)
  return {
    org: organizations[0] ?? '',
    superAdmin: superAdmin(claimsOf(token)),
    adminOrgs: Object.entries(roles)
      .filter(([, role]) => role === 'admin' || role === 'owner')
      .map(([org]) => org),
  }
}

/** The signed-in person now, from a fresh token; no org and no rank when there is no session. */
export const member = async (): Promise<Member> =>
  memberOf(
    await iam()
      .getValidAccessToken()
      .catch(() => null),
  )
