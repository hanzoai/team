/**
 * Typed REST client for Hanzo Cloud Agents (`/v1/agents`) and Bot Members (`/v1/bot/members`).
 */
import { agents } from './api.ts'
import { call, post, Refused } from './http.ts'

export interface CloudAgentDto {
  id: string
  name: string
  model: string
  description?: string
  instructions?: string
  tools?: string[]
  status: string
  executionMode?: string
  schedule?: string
  avatar?: string
  emoji?: string
  runCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface BotMemberDto {
  id: string
  name: string
  userId: string
  personRef: string
  active: boolean
}

export interface CreateAgentInput {
  name: string
  model?: string
  description?: string
  instructions: string
  tools?: string[]
  executionMode?: 'one-shot' | 'long-running'
  schedule?: string
  emoji?: string
  avatar?: string
  cap_micro_usd?: number
  max_task_micro_usd?: number
  period?: 'day' | 'week' | 'month'
}

export interface AgentRunDto {
  id: string
  agentId?: string
  agentName?: string
  status: string
  output?: string
  error?: string
  model?: string
  createdAt?: string
  durationMs?: number
}

async function withAgentsBase<T>(fn: (base: string) => Promise<T>): Promise<T> {
  try {
    return await fn(agents.list)
  } catch (err) {
    if (err instanceof Refused && err.status === 404) {
      return fn(agents.legacyList)
    }
    throw err
  }
}

export async function listCloudAgents(): Promise<CloudAgentDto[]> {
  const res = await withAgentsBase((base) => call<{ agents?: CloudAgentDto[] } | CloudAgentDto[]>(base))
  if (Array.isArray(res)) return res
  return Array.isArray(res?.agents) ? res.agents : []
}

export async function getCloudAgent(ref: string): Promise<CloudAgentDto> {
  return withAgentsBase((base) => call<CloudAgentDto>(`${base}/${encodeURIComponent(ref)}`))
}

export async function createCloudAgent(input: CreateAgentInput): Promise<CloudAgentDto> {
  const payload: CreateAgentInput = {
    name: input.name.trim(),
    model: input.model?.trim() || undefined,
    description: input.description?.trim() || undefined,
    instructions: input.instructions.trim(),
    tools: input.tools ?? ['*'],
    executionMode: input.executionMode ?? 'one-shot',
    ...(input.schedule ? { schedule: input.schedule } : {}),
    ...(input.emoji ? { emoji: input.emoji } : {}),
    ...(input.avatar ? { avatar: input.avatar } : {}),
    // Default monthly budget caps ($10/mo, $1/task in micro-USD) required by cloud/apps/agents.
    cap_micro_usd: input.cap_micro_usd ?? 10_000_000,
    max_task_micro_usd: input.max_task_micro_usd ?? 1_000_000,
    period: input.period ?? 'month',
  }
  return withAgentsBase((base) => post<CloudAgentDto>(base, payload))
}

export async function runCloudAgent(ref: string, input: string): Promise<AgentRunDto> {
  return withAgentsBase((base) =>
    post<AgentRunDto>(`${base}/${encodeURIComponent(ref)}/run`, { input }),
  )
}

export async function deleteCloudAgent(ref: string): Promise<void> {
  await withAgentsBase((base) =>
    call<unknown>(`${base}/${encodeURIComponent(ref)}`, { method: 'DELETE' }),
  )
}

export async function listBotMembers(): Promise<BotMemberDto[]> {
  const res = await call<{ bots?: BotMemberDto[] }>(agents.botMembers)
  return Array.isArray(res?.bots) ? res.bots : []
}

export async function listAgentRuns(limit = 30): Promise<AgentRunDto[]> {
  const q = new URLSearchParams({ limit: String(limit) })
  const res = await withAgentsBase((base) =>
    call<{ runs?: AgentRunDto[] }>(`${base}/runs?${q.toString()}`),
  )
  return Array.isArray(res?.runs) ? res.runs : []
}
