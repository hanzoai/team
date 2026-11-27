/**
 * Shared domain types for Hanzo Team's workspace store.
 * Pure types only — all live data is hydrated from real `/v1/team`, `/v1/agents`,
 * `/v1/bot`, and `/v1/meet` production backends (zero hardcoded mock records).
 */

export interface OrgGuild {
  id: string
  spaceUuid: string
  org?: string
  letter: string
  name: string
  subtitle: string
  agentsCount: number
  humansCount: number
}

export interface RosterMember {
  id: string
  handle: string
  name: string
  shortName: string
  avatar?: string
  bot: boolean
  badge?: string
  role?: string
  model?: string
  agentId?: string
  activity: string
  presence: 'online' | 'offline' | 'busy' | 'gated' | 'voice'
  speaking?: boolean
  active?: boolean
}

export interface DeployCardSpec {
  id: string
  version: string
  summary: string
  checks: string
  diffPreview: string
  approvedBy?: string
}

export interface ChatReactionGroup {
  emoji: string
  count: number
  mine: boolean
}

export interface ChatReplyItem {
  id: string
  authorId: string
  at: string
  createdOn?: number
  body: string
}

export interface ChatMessageItem {
  id: string
  roomId: string
  authorId: string
  at: string
  createdOn?: number
  body: string
  pinned?: boolean
  pending?: boolean
  failed?: string
  mergedRef?: string
  deployCard?: DeployCardSpec
  reactions: ChatReactionGroup[]
  replyCount: number
  replies: ChatReplyItem[]
}

export interface WorkspaceChannel {
  id: string
  name: string
  topic: string
  kind: 'channel' | 'dm'
  private?: boolean
  members?: string[]
  unread?: number
  sevTag?: string
  dmMemberId?: string
  playbookSteps?: readonly { id: string; label: string; done: boolean }[]
}

export interface VoiceParticipant {
  memberId: string
  name?: string
  isLocal?: boolean
  speaking?: boolean
  micEnabled?: boolean
  sharingScreen?: boolean
  videoOn?: boolean
}

export interface VoiceRoom {
  id: string
  name: string
  kind: 'theater' | 'meeting' | 'huddle'
  participants: VoiceParticipant[]
}

export interface AttentionItem {
  id: string
  space: string
  reason: string
  agentHandle: string
  badgeText: string
  avatar?: string
  title: string
  subtitle: string
  targetPath: string
  channelId?: string
  threadId?: string
  createdOn: number
  read: boolean
  archived?: boolean
  resolved?: boolean
}

export interface OfficeDeskTile {
  id: string
  floor: 'F4' | 'F3' | 'F2' | 'F1'
  label: string
  occupants: string[]
  toolTag?: string
  activeRing?: 'emerald' | 'warm' | 'subtle'
  statusLine?: string
}

export interface SpaceDeliverable {
  id: string
  space: string
  teamspace: string
  teamspaceName: string
  title: string
  authorId: string
  authorHandle: string
  updatedAt: string
  createdOn: number
  modifiedOn: number
  comments: number
  collaborator: string
  summary: string
  markdown: string
}

export interface MemoryNode {
  id: string
  category: 'Document' | 'Agent' | 'Channel' | 'Pinned'
  title: string
  ownerHandle: string
  updatedAt: string
  tags: readonly string[]
  summary: string
  targetPath?: string
}
