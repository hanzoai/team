/**
 * Typed REST client for Hanzo Team's live `/v1/team/*` production endpoints.
 *
 * All calls route through `http.ts` (IAM Bearer token, relative/resolved API origin).
 * Mentions are encoded as `<@uuid>` to match `cloud/apps/team/markup.go:31` so
 * workspace humans get inbox notifications and workspace bots (`@dev`, etc.) reply live.
 */
import { team } from './api.ts'
import { call, post } from './http.ts'

export interface TeamChannelDto {
  id: string
  space: string
  name: string
  topic?: string
  kind: 'public' | 'private' | 'dm' | string
  direct: boolean
  private: boolean
  archived: boolean
  members: string[]
  life?: string
  bindings?: string[]
}

export interface TeamReactionDto {
  emoji: string
  count: number
  accounts: string[]
}

export interface TeamFileDto {
  id: string
  file: string
  name: string
  type?: string
  size?: number
}

export interface TeamMessageDto {
  id: string
  channel: string
  thread?: string
  doc?: string
  author: string
  text: string
  mentions: string[]
  createdOn: number
  editedOn?: number
  replies: number
  lastReply?: number
  reactions: TeamReactionDto[]
  files: TeamFileDto[]
}

export interface TeamMemberDto {
  id: string
  name: string
  avatar?: string
  bot: boolean
  role: string
  active: boolean
  presence: 'online' | 'offline' | string
  personRef: string
}

export interface TeamInboxItemDto {
  id: string
  space: string
  reason: 'mention' | 'dm' | 'reply' | 'comment' | 'assigned' | 'other' | string
  read: boolean
  archived: boolean
  createdOn: number
  channel?: string
  doc?: string
  thread?: string
  message?: TeamMessageDto
}

export interface TeamInboxDto {
  items: TeamInboxItemDto[]
  unread: number
}

export interface TeamTeamspaceDto {
  id: string
  name: string
  private: boolean
  archived: boolean
}

export interface TeamDocDto {
  id: string
  space: string
  teamspace: string
  title: string
  parent?: string
  rank: string
  author: string
  createdOn: number
  modifiedOn: number
  comments: number
  collaborator: string
}

export interface TeamDocsDto {
  docs: TeamDocDto[]
  teamspaces: TeamTeamspaceDto[]
}

export interface TeamBillingPlanDto {
  plan?: string
  seats?: number
  guestCap?: number
  [key: string]: unknown
}

export interface MentionTarget {
  id: string
  handle?: string
  name: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Resolve typed `@handle` or `@Full Name` mentions against the real workspace
 * roster and emit `<@uuid>` tokens per `cloud/apps/team/markup.go:31`.
 *
 * - Longest key wins so `@Ada Lovelace` beats `@Ada`.
 * - Ignores email addresses (`user@hanzo.ai`).
 * - Leaves unknown `@tokens` untouched as literal text.
 * - Already-formatted `<@uuid>` tokens are preserved.
 */
export function encodeMentionsForApi(text: string, roster: readonly MentionTarget[]): string {
  if (!text || roster.length === 0) return text

  const candidates: Array<{ key: string; uuid: string }> = []
  const seen = new Set<string>()
  for (const m of roster) {
    const uuid = m.id.trim()
    if (!UUID_RE.test(uuid)) continue
    const keys = [m.name.trim().toLowerCase(), (m.handle ?? '').trim().toLowerCase()].filter(Boolean)
    for (const key of keys) {
      if (seen.has(key)) continue
      seen.add(key)
      candidates.push({ key, uuid })
    }
  }
  if (candidates.length === 0) return text

  // Longest match first so multi-word names and longer handles win over prefixes.
  candidates.sort((a, b) => b.key.length - a.key.length)

  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const encodedLines = lines.map((line) => {
    const low = line.toLowerCase()
    let out = ''
    let cursor = 0
    for (const match of line.matchAll(/(?<![\w.@<-])@/g)) {
      const atIdx = match.index
      const start = atIdx + 1
      if (start <= cursor) continue
      const hit = candidates.find(
        ({ key }) => low.startsWith(key, start) && !/[\w-]/.test(line.charAt(start + key.length)),
      )
      if (!hit) continue
      out += line.slice(cursor, atIdx)
      out += `<@${hit.uuid}>`
      cursor = start + hit.key.length
    }
    if (cursor < line.length) out += line.slice(cursor)
    return out
  })
  return encodedLines.join('\n')
}

/**
 * Decode `<@uuid>` tokens back to human-readable `@handle` (for bots) or `@name`
 * using the live workspace roster so raw UUID brackets never flash in message rows.
 */
export function decodeMentionsForDisplay(
  text: string,
  roster: readonly (MentionTarget & { bot?: boolean })[],
): string {
  if (!text || !text.includes('<@') || roster.length === 0) return text
  const byId = new Map<string, MentionTarget & { bot?: boolean }>()
  for (const m of roster) {
    const id = m.id.trim().toLowerCase()
    if (id) byId.set(id, m)
  }
  return text.replace(
    /<@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})>/gi,
    (full, uuid: string) => {
      const hit = byId.get(uuid.toLowerCase())
      if (!hit) return full
      const label = (hit.bot && hit.handle) ? hit.handle : hit.handle || hit.name
      return `@${label}`
    },
  )
}

/** Resolve an avatar blob id returned by `/v1/team/members` into a downloadable image URL. */
export function teamAvatarUrl(spaceUuid: string, avatar?: string): string | undefined {
  if (!avatar) return undefined
  if (/^(https?:|data:|\/)/i.test(avatar)) return avatar
  if (!spaceUuid) return undefined
  return `${team.files}/${encodeURIComponent(spaceUuid)}/avatar?file=${encodeURIComponent(avatar)}`
}

export async function listTeamChannels(): Promise<TeamChannelDto[]> {
  const res = await call<{ channels?: TeamChannelDto[] }>(team.channels)
  return Array.isArray(res?.channels) ? res.channels : []
}

export async function createTeamChannel(input: {
  space: string
  name: string
  topic?: string
  private?: boolean
  members?: string[]
}): Promise<TeamChannelDto> {
  const res = await post<{ channel: TeamChannelDto }>(team.channels, {
    space: input.space,
    name: input.name,
    ...(input.topic ? { topic: input.topic } : {}),
    ...(input.private ? { private: true } : {}),
    ...(input.members?.length ? { members: input.members } : {}),
  })
  return res.channel
}

export async function openTeamDm(space: string, members: string[]): Promise<{ channel: TeamChannelDto; created: boolean }> {
  return post<{ channel: TeamChannelDto; created: boolean }>(team.dms, { space, members })
}

export async function listTeamMessages(channelId: string, space: string): Promise<TeamMessageDto[]> {
  const q = new URLSearchParams({ space })
  const res = await call<{ messages?: TeamMessageDto[] }>(
    `${team.channels}/${encodeURIComponent(channelId)}/messages?${q.toString()}`,
  )
  return Array.isArray(res?.messages) ? res.messages : []
}

export async function sendTeamMessage(
  channelId: string,
  input: { space: string; text: string },
): Promise<TeamMessageDto> {
  return post<TeamMessageDto>(`${team.channels}/${encodeURIComponent(channelId)}/messages`, {
    space: input.space,
    text: input.text,
  })
}

export async function listTeamReplies(messageId: string, space: string): Promise<TeamMessageDto[]> {
  const q = new URLSearchParams({ space })
  const res = await call<{ messages?: TeamMessageDto[] }>(
    `${team.messages}/${encodeURIComponent(messageId)}/replies?${q.toString()}`,
  )
  return Array.isArray(res?.messages) ? res.messages : []
}

export async function sendTeamReply(
  messageId: string,
  input: { space: string; text: string },
): Promise<TeamMessageDto> {
  return post<TeamMessageDto>(`${team.messages}/${encodeURIComponent(messageId)}/replies`, {
    space: input.space,
    text: input.text,
  })
}

export async function addTeamReaction(messageId: string, emoji: string, space: string): Promise<TeamMessageDto> {
  return call<TeamMessageDto>(
    `${team.messages}/${encodeURIComponent(messageId)}/reactions/${encodeURIComponent(emoji)}`,
    { method: 'PUT', body: JSON.stringify({ space }) },
  )
}

export async function removeTeamReaction(messageId: string, emoji: string, space: string): Promise<TeamMessageDto> {
  const q = new URLSearchParams({ space })
  return call<TeamMessageDto>(
    `${team.messages}/${encodeURIComponent(messageId)}/reactions/${encodeURIComponent(emoji)}?${q.toString()}`,
    { method: 'DELETE' },
  )
}

export async function listTeamMembers(space?: string): Promise<{ members: TeamMemberDto[]; degraded: string[] }> {
  const q = space ? `?${new URLSearchParams({ space }).toString()}` : ''
  const res = await call<{ members?: TeamMemberDto[]; degraded?: string[] }>(`${team.members}${q}`)
  return {
    members: Array.isArray(res?.members) ? res.members : [],
    degraded: Array.isArray(res?.degraded) ? res.degraded : [],
  }
}

export async function listTeamInbox(space?: string, archived = false): Promise<TeamInboxDto> {
  const q = new URLSearchParams()
  if (space) q.set('space', space)
  if (archived) q.set('archived', 'true')
  const suffix = q.toString() ? `?${q.toString()}` : ''
  const res = await call<TeamInboxDto>(`${team.inbox}${suffix}`)
  return {
    items: Array.isArray(res?.items) ? res.items : [],
    unread: typeof res?.unread === 'number' ? res.unread : 0,
  }
}

export async function markInboxRead(id: string, space: string): Promise<TeamInboxItemDto> {
  return post<TeamInboxItemDto>(`${team.inbox}/${encodeURIComponent(id)}/read`, { space })
}

export async function markAllInboxRead(space?: string): Promise<{ read: number }> {
  return post<{ read: number }>(`${team.inbox}/read`, space ? { space } : {})
}

export async function archiveInboxItem(id: string, space: string): Promise<TeamInboxItemDto> {
  return post<TeamInboxItemDto>(`${team.inbox}/${encodeURIComponent(id)}/archive`, { space })
}

export async function listTeamDocs(space?: string): Promise<TeamDocsDto> {
  const q = space ? `?${new URLSearchParams({ space }).toString()}` : ''
  const res = await call<TeamDocsDto>(`${team.docs}${q}`)
  return {
    docs: Array.isArray(res?.docs) ? res.docs : [],
    teamspaces: Array.isArray(res?.teamspaces) ? res.teamspaces : [],
  }
}

export async function createTeamDoc(input: {
  space?: string
  title: string
  teamspace?: string
  parent?: string
}): Promise<TeamDocDto> {
  return post<TeamDocDto>(team.docs, input)
}

export async function getTeamBillingPlan(): Promise<TeamBillingPlanDto> {
  return call<TeamBillingPlanDto>(team.plan)
}
