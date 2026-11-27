/**
 * Pure DTO mappers converting `/v1/team/*`, `/v1/agents`, and `/v1/bot/members`
 * payloads into workspace UI models.
 */
import type { BotMemberDto, CloudAgentDto } from '../data/agents.ts'
import { bareAccount, isUuid } from '../data/model.ts'
import {
  teamAvatarUrl,
  type TeamChannelDto,
  type TeamDocDto,
  type TeamInboxItemDto,
  type TeamMemberDto,
  type TeamMessageDto,
  type TeamTeamspaceDto,
} from '../data/teamRest.ts'
import { slugHandle } from '../agents/workforce.ts'
import type {
  AttentionItem,
  ChatMessageItem,
  ChatReplyItem,
  MemoryNode,
  RosterMember,
  SpaceDeliverable,
  WorkspaceChannel,
} from './seed.ts'

export function formatClock(ms?: number): string {
  if (!ms || !Number.isFinite(ms)) return 'Just now'
  const d = new Date(ms)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (sameDay) return time
  const day = d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  return `${day} · ${time}`
}

function shortLabel(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return parts[0] || 'Member'
  return `${parts[0]} ${parts[parts.length - 1]![0]}.`
}

function resolveBotPresence(
  member: Pick<TeamMemberDto, 'active' | 'presence'> | undefined,
  agent: Pick<CloudAgentDto, 'status' | 'model' | 'description' | 'executionMode' | 'schedule'> | undefined,
): { presence: RosterMember['presence']; activity: string } {
  if (member && member.active === false) {
    return { presence: 'offline', activity: 'Inactive' }
  }
  const st = (agent?.status ?? '').trim().toLowerCase()
  if (st === 'running' || st === 'executing') {
    return {
      presence: 'busy',
      activity: agent?.description || `${agent?.model || 'Agent'} · Running`,
    }
  }
  if (st === 'blocked' || st === 'gated' || st === 'awaiting_approval') {
    return {
      presence: 'gated',
      activity: 'Blocked · Provider or approval required',
    }
  }
  if (st === 'offline' || st === 'disabled' || st === 'paused' || st === 'error' || st === 'unavailable' || st === 'unconfigured') {
    return {
      presence: 'offline',
      activity: st === 'error' ? 'Unavailable · Error' : 'Offline',
    }
  }
  if (member?.presence === 'online' || st === 'ready' || st === 'active' || st === 'online') {
    return {
      presence: 'online',
      activity: agent?.description || (agent?.model ? `${agent.model} · Ready` : 'Workspace Agent · Ready'),
    }
  }
  if (member?.presence === 'offline' && !agent) {
    return {
      presence: 'offline',
      activity: 'Offline',
    }
  }
  if (agent) {
    return {
      presence: 'online',
      activity: agent.description || (agent.model ? `${agent.model} · Ready` : 'Workspace Agent · Ready'),
    }
  }
  return {
    presence: 'offline',
    activity: 'Offline',
  }
}

export function mapMembersToRoster(
  spaceUuid: string,
  members: readonly TeamMemberDto[],
  cloudAgents: readonly CloudAgentDto[],
  botMembers: readonly BotMemberDto[],
): RosterMember[] {
  const agentByName = new Map<string, CloudAgentDto>()
  const agentById = new Map<string, CloudAgentDto>()
  for (const ag of cloudAgents) {
    if (ag.status === 'retired') continue
    agentById.set(ag.id, ag)
    agentByName.set(ag.name.trim().toLowerCase(), ag)
  }

  const botByUserId = new Map<string, BotMemberDto>()
  for (const bm of botMembers) {
    if (bm.userId) botByUserId.set(bm.userId, bm)
  }

  const seen = new Set<string>()
  const out: RosterMember[] = []

  for (const m of members) {
    if (!m.id || m.active === false) continue
    seen.add(m.id)
    const bm = botByUserId.get(m.id)
    const ag = (bm ? agentById.get(bm.id) : undefined) ?? agentByName.get(m.name.trim().toLowerCase())
    const cleanName = isUuid(m.name) ? `Member ${m.id.slice(0, 6)}` : m.name.trim() || `Member ${m.id.slice(0, 6)}`
    const handle = slugHandle(ag?.name || bm?.name || cleanName)
    const isBot = Boolean(m.bot || bm)
    const botState = isBot ? resolveBotPresence(m, ag) : null
    out.push({
      id: m.id,
      handle,
      name: cleanName,
      shortName: isBot ? cleanName : shortLabel(cleanName),
      avatar: teamAvatarUrl(spaceUuid, m.avatar) ?? ag?.avatar,
      bot: isBot,
      badge: isBot ? `BOT · @${handle}` : m.role ? m.role.toUpperCase() : undefined,
      role: m.role,
      model: ag?.model,
      agentId: ag?.id ?? bm?.id,
      activity: botState
        ? botState.activity
        : m.presence === 'online'
          ? 'Online'
          : 'Offline',
      presence: botState ? botState.presence : m.presence === 'online' ? 'online' : 'offline',
      active: m.active,
    })
  }

  for (const bm of botMembers) {
    if (!bm.active) continue
    const uid = bm.userId || bm.id
    if (seen.has(uid)) continue
    seen.add(uid)
    const ag = agentById.get(bm.id) ?? agentByName.get(bm.name.trim().toLowerCase())
    const handle = slugHandle(bm.name)
    const botState = resolveBotPresence({ active: bm.active, presence: ag ? 'online' : 'offline' }, ag)
    out.push({
      id: uid,
      handle,
      name: bm.name,
      shortName: bm.name,
      avatar: ag?.avatar,
      bot: true,
      badge: `BOT · @${handle}`,
      role: 'agent',
      model: ag?.model,
      agentId: ag?.id ?? bm.id,
      activity: botState.activity,
      presence: botState.presence,
      active: bm.active,
    })
  }

  for (const ag of cloudAgents) {
    if (ag.status === 'retired') continue
    const already = out.some(
      (r) => r.bot && (r.agentId === ag.id || r.name.toLowerCase() === ag.name.trim().toLowerCase()),
    )
    if (already) continue
    const handle = slugHandle(ag.name)
    const botState = resolveBotPresence(undefined, ag)
    out.push({
      id: ag.id,
      handle,
      name: ag.name,
      shortName: ag.name,
      avatar: ag.avatar,
      bot: true,
      badge: `BOT · @${handle}`,
      role: 'agent',
      model: ag.model,
      agentId: ag.id,
      activity: botState.activity,
      presence: botState.presence,
      active: botState.presence !== 'offline',
    })
  }

  return out
}

export function mapChannelsToWorkspace(
  spaceUuid: string,
  channels: readonly TeamChannelDto[],
  roster: readonly RosterMember[],
  myAccountId: string,
): WorkspaceChannel[] {
  const myBare = bareAccount(myAccountId)
  return channels
    .filter((c) => !c.archived && (!spaceUuid || c.space === spaceUuid))
    .map((c) => {
      const isDm = c.direct || c.kind === 'dm'
      let dmMemberId: string | undefined
      let displayName = c.name?.trim() || ''

      if (isDm) {
        const others = (c.members ?? []).filter((id) => bareAccount(id) !== myBare)
        dmMemberId = others[0] ?? c.members?.[0]
        if (!displayName) {
          const names = (others.length ? others : c.members ?? [])
            .map((id) => roster.find((r) => r.id === id || bareAccount(r.id) === bareAccount(id))?.name)
            .filter((n): n is string => Boolean(n))
          displayName = names.join(', ') || 'Direct Message'
        }
      }

      return {
        id: c.id,
        name: displayName || c.id,
        topic: c.topic || (isDm ? 'Direct conversation' : ''),
        kind: isDm ? ('dm' as const) : ('channel' as const),
        private: c.private,
        members: c.members ?? [],
        dmMemberId,
      }
    })
}

export function mapDtoToMessage(
  dto: TeamMessageDto,
  myAccountId: string,
  existingReplies: ChatReplyItem[] = [],
): ChatMessageItem {
  const myBare = bareAccount(myAccountId)
  return {
    id: dto.id,
    roomId: dto.channel,
    authorId: bareAccount(dto.author),
    at: formatClock(dto.createdOn),
    createdOn: dto.createdOn,
    body: dto.text || '',
    reactions: (dto.reactions ?? []).map((r) => ({
      emoji: r.emoji,
      count: r.count,
      mine: (r.accounts ?? []).some((a) => bareAccount(a) === myBare),
    })),
    replyCount: dto.replies ?? existingReplies.length,
    replies: existingReplies,
  }
}

export function mapInboxToAttention(
  items: readonly TeamInboxItemDto[],
  roster: readonly RosterMember[],
  channels: readonly WorkspaceChannel[],
): AttentionItem[] {
  return items.map((item) => {
    const authorId = item.message?.author ? bareAccount(item.message.author) : ''
    const author = roster.find((r) => r.id === authorId)
    const ch = item.channel ? channels.find((c) => c.id === item.channel) : undefined
    const reasonLabel =
      item.reason === 'mention'
        ? 'MENTION'
        : item.reason === 'dm'
          ? 'DM'
          : item.reason === 'reply'
            ? 'REPLY'
            : item.reason === 'assigned'
              ? 'ASSIGNED'
              : 'INBOX'
    const channelLabel = ch ? (ch.kind === 'dm' ? ch.name : `#${ch.name}`) : 'Channel'
    return {
      id: item.id,
      space: item.space,
      reason: item.reason,
      agentHandle: author?.handle ?? 'member',
      badgeText: author ? author.shortName.slice(0, 4).toUpperCase() : reasonLabel.slice(0, 4),
      avatar: author?.avatar,
      title: item.message?.text?.split('\n')[0]?.slice(0, 110) || `${reasonLabel} in ${channelLabel}`,
      subtitle: `${author?.name ?? 'Teammate'} · ${channelLabel} · ${formatClock(item.createdOn)}`,
      targetPath: item.channel ? `/chat/${item.channel}` : '/inbox',
      channelId: item.channel,
      threadId: item.thread,
      createdOn: item.createdOn,
      read: item.read,
      archived: item.archived,
      resolved: item.read,
    }
  })
}

export function mapDocsToSpaces(
  docs: readonly TeamDocDto[],
  teamspaces: readonly TeamTeamspaceDto[],
  roster: readonly RosterMember[],
): SpaceDeliverable[] {
  const tsById = new Map(teamspaces.map((t) => [t.id, t.name]))
  return docs.map((d) => {
    const author = roster.find((r) => r.id === bareAccount(d.author))
    return {
      id: d.id,
      space: d.space,
      teamspace: d.teamspace,
      teamspaceName: tsById.get(d.teamspace) || 'General',
      title: d.title || 'Untitled',
      authorId: bareAccount(d.author),
      authorHandle: author?.handle || author?.name || 'member',
      updatedAt: formatClock(d.modifiedOn || d.createdOn),
      createdOn: d.createdOn,
      modifiedOn: d.modifiedOn,
      comments: d.comments ?? 0,
      collaborator: d.collaborator,
      summary: `${tsById.get(d.teamspace) || 'General'} · ${d.comments ?? 0} comments`,
      markdown: '',
    }
  })
}

export function buildMemoryNodes(
  docs: readonly SpaceDeliverable[],
  roster: readonly RosterMember[],
): MemoryNode[] {
  const nodes: MemoryNode[] = []
  for (const d of docs) {
    nodes.push({
      id: `doc-${d.id}`,
      category: 'Document',
      title: d.title,
      ownerHandle: d.authorHandle,
      updatedAt: d.updatedAt,
      tags: [d.teamspaceName.toLowerCase()],
      summary: d.summary,
      targetPath: `/spaces/${d.id}`,
    })
  }
  for (const m of roster) {
    if (!m.bot) continue
    nodes.push({
      id: `agent-${m.id}`,
      category: 'Agent',
      title: `${m.name} (@${m.handle})`,
      ownerHandle: m.handle,
      updatedAt: 'Active',
      tags: [m.model || 'agent', 'bot'],
      summary: m.activity,
      targetPath: `/chat/with-${m.id}`,
    })
  }
  return nodes
}
