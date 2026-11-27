/**
 * The addresses this client states for itself, and the unified API origin
 * selector supporting shared Hanzo Cloud (`https://api.hanzo.ai`) alongside
 * local `hanzod` (`http://127.0.0.1:3690` — native `/v1/team`, local engine,
 * bots, `hanzoai/tasks` worker status, and `k3s` cluster orchestration).
 *
 * In development the default origin is EMPTY and every call is relative, because
 * the dev server proxies `/v1` — unless `VITE_HANZO_API_ORIGIN` or
 * `localStorage.getItem('hanzo.team.backend') === 'hanzod'` explicitly points
 * `/v1/team/*` and `v1(...)` at local `hanzod`.
 *
 * What can never be relative is the ISSUER's two full-page trips: the browser
 * leaves, so neither of them is a request.
 */
import { brand } from './brand.ts'

/** Shared multiplayer Hanzo Cloud API origin. */
export const cloudOrigin = 'https://api.hanzo.ai'

/** Unified local `hanzod` daemon origin (`127.0.0.1:3690`). */
export const hanzodOrigin = 'http://127.0.0.1:3690'

/** LocalStorage key toggling `'hanzod'` vs `'cloud'` team backend routing. */
export const TEAM_BACKEND_STORAGE_KEY = 'hanzo.team.backend'

export type TeamBackendMode = 'cloud' | 'hanzod'

function readConfiguredBackend(): string | null {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      return localStorage.getItem(TEAM_BACKEND_STORAGE_KEY)
    }
  } catch {
    // Ignore restricted/unavailable storage (SSR, Node test runner without storage file).
  }
  return null
}

export function getTeamBackend(): TeamBackendMode {
  return readConfiguredBackend()?.trim() === 'hanzod' ? 'hanzod' : 'cloud'
}

export function setTeamBackend(mode: TeamBackendMode): void {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem(TEAM_BACKEND_STORAGE_KEY, mode)
    }
  } catch {
    // Ignore storage write errors in restricted contexts.
  }
}

/**
 * Resolves the active `/v1` API origin:
 * 1. `import.meta.env?.VITE_HANZO_API_ORIGIN` override when set
 * 2. `localStorage.getItem('hanzo.team.backend') === 'hanzod'` -> `http://127.0.0.1:3690`
 * 3. `localStorage.getItem('hanzo.team.backend') === 'cloud'` -> `https://api.hanzo.ai`
 * 4. Empty string in Vite `DEV` proxy mode, otherwise `https://api.hanzo.ai`
 */
export function resolveApiOrigin(opts?: {
  envOrigin?: string
  backend?: string | null
  isDev?: boolean
}): string {
  const rawEnv =
    opts?.envOrigin !== undefined
      ? opts.envOrigin
      : (import.meta.env?.VITE_HANZO_API_ORIGIN as string | undefined)
  const envOrigin = rawEnv?.trim()
  if (envOrigin) {
    return envOrigin.replace(/\/+$/, '')
  }

  const backend = (opts?.backend !== undefined ? opts.backend : readConfiguredBackend())?.trim()
  if (backend === 'hanzod') {
    return hanzodOrigin
  }
  if (backend === 'cloud') {
    return cloudOrigin
  }

  const isDev = opts?.isDev !== undefined ? opts.isDev : Boolean(import.meta.env?.DEV)
  return isDev ? '' : cloudOrigin
}

/** The team subsystem, mounted at `/v1/team`. No `/api/` hop. */
export const team = {
  /** Native/cloud team subsystem health check. */
  get health(): string {
    return `${resolveApiOrigin()}/v1/team/health`
  },
  /** The account JSON-RPC: spaces, space selection, memberships, people. */
  get account(): string {
    return `${resolveApiOrigin()}/v1/team/account`
  },
  /** Channels and their messages — the REST half of the chat surface. */
  get channels(): string {
    return `${resolveApiOrigin()}/v1/team/channels`
  },
  /** Open, or find, a direct message. */
  get dms(): string {
    return `${resolveApiOrigin()}/v1/team/dms`
  },
  /** Space roster: humans and agents. */
  get members(): string {
    return `${resolveApiOrigin()}/v1/team/members`
  },
  /** Caller's inbox notifications (mentions, DMs, replies). */
  get inbox(): string {
    return `${resolveApiOrigin()}/v1/team/inbox`
  },
  /** Space document tree & teamspaces. */
  get docs(): string {
    return `${resolveApiOrigin()}/v1/team/docs`
  },
  /** Individual message mutations (replies, reactions, edit, delete). */
  get messages(): string {
    return `${resolveApiOrigin()}/v1/team/messages`
  },
  /** Per-space file storage. */
  get files(): string {
    return `${resolveApiOrigin()}/v1/team/files`
  },
  /** The plan, the seats and the guest cap. */
  get plan(): string {
    return `${resolveApiOrigin()}/v1/team/billing/plan`
  },
}

/** Meet / Virtual Office / LiveKit signaling plane (`/v1/meet/*`). */
export const meet = {
  get health(): string {
    return `${resolveApiOrigin()}/v1/meet/health`
  },
  get session(): string {
    return `${resolveApiOrigin()}/v1/meet/session`
  },
  get call(): string {
    return `${resolveApiOrigin()}/v1/meet/call`
  },
  get getToken(): string {
    return `${resolveApiOrigin()}/v1/meet/getToken`
  },
  get record(): string {
    return `${resolveApiOrigin()}/v1/meet/record`
  },
}

/** Cloud Agents & Bot Members plane (`/v1/agents`, `/v1/bot/members`). */
export const agents = {
  get list(): string {
    return `${resolveApiOrigin()}/v1/agents`
  },
  get legacyList(): string {
    return `${resolveApiOrigin()}/v1/agent`
  },
  get botMembers(): string {
    return `${resolveApiOrigin()}/v1/bot/members`
  },
}

/**
 * Any API path, for the CRM (@hanzo/crm), which names its own: the org's Base
 * (`base/collections/...`), the beta (`entitlement/orgs/:org`), mail and the drip
 * (`email`, `marketing/...`). The org is the token's, never a parameter.
 */
export const v1 = (path: string): string => `${resolveApiOrigin()}/v1/${path.replace(/^\/+/, '')}`

/**
 * Direct local `hanzod` (`127.0.0.1:3690`) endpoints for local `hanzo-engine`,
 * bots, `hanzoai/tasks` worker status, and automated `k3s` cluster orchestration,
 * available even while Team chat remains connected to shared multiplayer Cloud.
 */
export const hanzod = {
  origin: hanzodOrigin,
  manifest: `${hanzodOrigin}/v1/hanzod`,
  worker: `${hanzodOrigin}/v1/hanzod/worker`,
  devHealth: `${hanzodOrigin}/v1/dev/health`,
  engine: `${hanzodOrigin}/v1/engine`,
  engineCatalog: `${hanzodOrigin}/v1/engine/catalog`,
  engineChatCompletions: `${hanzodOrigin}/v1/engine/chat/completions`,
  botHealth: `${hanzodOrigin}/v1/bot/health`,
  botTemplates: `${hanzodOrigin}/v1/bot/templates`,
  bots: `${hanzodOrigin}/v1/bot/bots`,
  botRuns: `${hanzodOrigin}/v1/bot/runs`,
  botRun: (botId: string): string => `${hanzodOrigin}/v1/bot/bots/${encodeURIComponent(botId)}/run`,
  teamHealth: `${hanzodOrigin}/v1/team/health`,
  clusterHealth: `${hanzodOrigin}/v1/cluster/health`,
  clusterUp: `${hanzodOrigin}/v1/cluster/up`,
  clusterDown: `${hanzodOrigin}/v1/cluster/down`,
  clusterWorkloads: `${hanzodOrigin}/v1/cluster/workloads`,
  k3s: `${hanzodOrigin}/v1/k3s`,
  v1: (path: string): string => `${hanzodOrigin}/v1/${path.replace(/^\/+/, '')}`,
} as const

/** The issuer, for the trips the IAM SDK does not make. */
export const issuer = {
  signup: `${brand.issuer}/signup/${brand.org}-${brand.app}`,
} as const

/** Where a refusal sends somebody who has to sign in. */
export const loginPath = '/login'

/** Where the issuer returns them. */
export const callbackPath = '/auth/callback'
