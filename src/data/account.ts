/**
 * The account plane: which spaces this person has, and the credential for one.
 *
 * `POST /v1/team/account` is a JSON-RPC of its own — one address, a method
 * name, and an answer that is `{result}` or `{error}` at HTTP 200 either way.
 * A caller reading `res.ok` therefore reads success on every refusal, which is
 * why `ask()` exists and why nothing else in this app posts to that address.
 */
import { team } from './api.ts'
import { post } from './http.ts'

/** The refusal shape the account plane answers with, at status 200. */
export class Denied extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'Denied'
  }
  /** True when the credential was not accepted, as against any other refusal. */
  get unauthorized() {
    return this.code.endsWith(':Unauthorized')
  }
}

type Reply<T> = { result?: T; error?: { code: string; params?: { message?: string } } }

const ask = async <T>(method: string, params: Record<string, unknown> = {}): Promise<T> => {
  const reply = await post<Reply<T>>(team.account, { method, params })
  if (reply.error) throw new Denied(reply.error.code, reply.error.params?.message ?? reply.error.code)
  return reply.result as T
}

/** One space this person belongs to, in one org. */
export type SpaceRow = {
  uuid: string
  name: string
  /** The slug. `select` takes this, never the uuid. */
  url: string
  /** The owning tenant. A person in two orgs sees both orgs' spaces here. */
  org?: string
  isDisabled: boolean
  lastVisit?: number
}

/** The credential for one space, and where to spend it. */
export type Entry = {
  account: string
  /** The space token. Twelve hours, and it rides in the socket's URL path. */
  token: string
  /** The transactor base, e.g. `wss://api.hanzo.ai/v1/team/transactor`. */
  endpoint: string
  workspace: string
  workspaceUrl: string
  role: string
}

/** Every space this person belongs to, across every org they are in. */
export const spaces = () => ask<SpaceRow[]>('getUserWorkspaces')

/**
 * Take a credential for one space.
 *
 * The slug is explicit even when there is one space: the server never defaults
 * to a first, and a slug that resolves in two of the caller's orgs is an
 * ambiguity it refuses rather than guesses at.
 */
export const enter = (slug: string) => ask<Entry>('selectWorkspace', { workspaceUrl: slug })

/** Who the account plane thinks is calling. Its refusal is the enrolment test. */
export const introduce = () => ask<{ account: string; token?: string }>('getLoginInfoByToken')

/** Provision this IAM session's account row, default spaces, and core personas in place. */
export const enrol = () => ask<SpaceRow[]>('enrol')
