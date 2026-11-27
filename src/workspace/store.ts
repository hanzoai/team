/**
 * Reactive store for Hanzo Team v1.1.0 ("Discord × Mattermost" + Hanzo v8.8).
 *
 * Manages active Guild Organization, Discord Instant Voice/Huddles, Mattermost
 * Channels/DMs/Threads/Reactions/Pins/Deploy Approvals, Appearance mode, and
 * Virtual Office interactions with zero external boilerplate.
 */
import { useSyncExternalStore } from 'react'

import { assignToAgent } from '../agents/workforce.ts'
import { readTeamSettings, writeTeamSettings } from '../settings/preferences.ts'
import {
  INITIAL_ATTENTION,
  INITIAL_CHANNELS,
  INITIAL_MEMORY,
  INITIAL_MESSAGES,
  INITIAL_ORGS,
  INITIAL_SPACES,
  INITIAL_VOICE_ROOMS,
  OFFICE_DESKS,
  ROSTER_MEMBERS,
  type AttentionItem,
  type ChatMessageItem,
  type MemoryNode,
  type OrgGuild,
  type RosterMember,
  type SpaceDeliverable,
  type VoiceRoom,
  type WorkspaceChannel,
} from './seed.ts'

export type AppearanceMode = 'zen' | 'clay' | 'light'
export type RightPaneMode = 'roster' | 'thread' | 'closed'
export type ComposerModel = 'enso' | 'enso-auto' | 'zen6-coder' | 'zen6-ultra'

export interface ActiveThreadRef {
  roomId: string
  messageId: string
}

export interface OfficeToast {
  id: string
  text: string
  at: number
}

export interface WorkspaceSnapshot {
  orgs: readonly OrgGuild[]
  activeOrgId: string
  roster: readonly RosterMember[]
  channels: readonly WorkspaceChannel[]
  voiceRooms: readonly VoiceRoom[]
  connectedVoiceId: string | null
  micMuted: boolean
  deafened: boolean
  screenSharing: boolean
  cameraOn: boolean
  messages: readonly ChatMessageItem[]
  rightPaneMode: RightPaneMode
  activeThread: ActiveThreadRef | null
  composerModel: ComposerModel
  appearanceMode: AppearanceMode
  attention: readonly AttentionItem[]
  selectedFloor: 'ALL' | 'F4' | 'F3' | 'F2' | 'F1'
  officeBanner: OfficeToast | null
  spaces: readonly SpaceDeliverable[]
  memory: readonly MemoryNode[]
  phoneModalOpen: boolean
}

function readInitialAppearance(): AppearanceMode {
  if (typeof window === 'undefined') return 'zen'
  try {
    const v = window.localStorage.getItem('hanzo.team.appearance_mode')
    if (v === 'zen' || v === 'clay' || v === 'light') return v
  } catch {
    /* ignore */
  }
  return 'zen'
}

const createInitialSnapshot = (): WorkspaceSnapshot => {
  const prefs = readTeamSettings()
  return {
    orgs: INITIAL_ORGS,
    activeOrgId: 'hanzo',
    roster: ROSTER_MEMBERS,
    channels: INITIAL_CHANNELS,
    voiceRooms: INITIAL_VOICE_ROOMS,
    connectedVoiceId: 'eng-pairing',
    micMuted: prefs.officeDefaultAudio === 'muted',
    deafened: false,
    screenSharing: false,
    cameraOn: prefs.officeDefaultVideo === 'on',
    messages: INITIAL_MESSAGES,
    rightPaneMode: prefs.rightPaneDefault === 'collapsed' ? 'closed' : 'roster',
    activeThread: { roomId: 'engineering', messageId: 'eng-m1' },
    composerModel: prefs.defaultModel,
    appearanceMode: readInitialAppearance(),
    attention: INITIAL_ATTENTION,
    selectedFloor: 'ALL',
    officeBanner: null,
    spaces: INITIAL_SPACES,
    memory: INITIAL_MEMORY,
    phoneModalOpen: false,
  }
}

let state: WorkspaceSnapshot = createInitialSnapshot()
const listeners = new Set<() => void>()

function emit(next: WorkspaceSnapshot) {
  state = next
  for (const fn of listeners) fn()
}

export function subscribeWorkspace(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getWorkspace(): WorkspaceSnapshot {
  return state
}

export function useWorkspace(): WorkspaceSnapshot {
  return useSyncExternalStore(subscribeWorkspace, getWorkspace, getWorkspace)
}

export function resetWorkspaceStore(): void {
  emit(createInitialSnapshot())
}

export function selectGuildOrg(orgId: string): void {
  if (!state.orgs.some((o) => o.id === orgId)) return
  emit({ ...state, activeOrgId: orgId })
}

export function setAppearanceMode(mode: AppearanceMode): void {
  writeTeamSettings({
    themePreset: mode === 'light' ? 'zen-light' : mode,
    colorMode: mode === 'light' ? 'light' : 'dark',
  })
  emit({ ...state, appearanceMode: mode })
}

export function setPhoneModalOpen(open: boolean): void {
  emit({ ...state, phoneModalOpen: open })
}

export function joinVoiceRoom(roomId: string): void {
  if (state.connectedVoiceId === roomId) return
  const nextRooms = state.voiceRooms.map((r) => {
    const withoutMe = r.participants.filter((p) => p.memberId !== 'zach')
    if (r.id === roomId) {
      return { ...r, participants: [{ memberId: 'zach' }, ...withoutMe] }
    }
    return { ...r, participants: withoutMe }
  })
  emit({ ...state, voiceRooms: nextRooms, connectedVoiceId: roomId })
}

export function leaveVoiceRoom(): void {
  const nextRooms = state.voiceRooms.map((r) => ({
    ...r,
    participants: r.participants.filter((p) => p.memberId !== 'zach'),
  }))
  emit({
    ...state,
    voiceRooms: nextRooms,
    connectedVoiceId: null,
    screenSharing: false,
    cameraOn: false,
  })
}

export function toggleVoiceMute(): void {
  emit({ ...state, micMuted: !state.micMuted })
}

export function toggleVoiceDeafen(): void {
  const nextDeaf = !state.deafened
  emit({ ...state, deafened: nextDeaf, micMuted: nextDeaf ? true : state.micMuted })
}

export function toggleScreenShare(): void {
  const next = !state.screenSharing
  const nextRooms = state.voiceRooms.map((r) =>
    r.id === state.connectedVoiceId
      ? {
          ...r,
          participants: r.participants.map((p) =>
            p.memberId === 'zach' ? { ...p, sharingScreen: next } : p,
          ),
        }
      : r,
  )
  emit({ ...state, screenSharing: next, voiceRooms: nextRooms })
}

export function toggleCameraOn(): void {
  const next = !state.cameraOn
  emit({ ...state, cameraOn: next })
}

export function openThreadPane(roomId: string, messageId: string): void {
  emit({
    ...state,
    rightPaneMode: 'thread',
    activeThread: { roomId, messageId },
  })
}

export function closeThreadPane(): void {
  emit({
    ...state,
    rightPaneMode: 'roster',
  })
}

export function toggleRosterPane(): void {
  emit({
    ...state,
    rightPaneMode: state.rightPaneMode === 'roster' ? 'closed' : 'roster',
  })
}

export function toggleRightThreadPane(): void {
  if (state.rightPaneMode === 'thread') {
    emit({ ...state, rightPaneMode: 'closed' })
  } else {
    emit({
      ...state,
      rightPaneMode: 'thread',
      activeThread: state.activeThread ?? { roomId: 'engineering', messageId: 'eng-m1' },
    })
  }
}

export function setRightPaneDefaultOpen(open: boolean): void {
  emit({
    ...state,
    rightPaneMode: open ? (state.rightPaneMode === 'closed' ? 'roster' : state.rightPaneMode) : 'closed',
  })
}

export function setComposerModel(model: ComposerModel): void {
  if (model === 'enso' || model === 'zen6-coder' || model === 'zen6-ultra') {
    writeTeamSettings({ defaultModel: model })
  }
  emit({ ...state, composerModel: model })
}

function nowClock(): string {
  return 'Just now'
}

function botAutoReplyText(botHandle: string, prompt: string, model: ComposerModel): string {
  const clean = prompt.replace(new RegExp(`@${botHandle}\\b`, 'gi'), '').trim()
  const summary = clean.slice(0, 96) || 'requested objective'
  switch (botHandle) {
    case 'vi':
      return `Logged under today's executive priorities (${model}). Synced "${summary}" across #engineering and updated your Home briefing.`
    case 'dev':
      return `Picked up "${summary}" on \`${model}\` — inspecting workspace diff and running \`pnpm test\` before opening PR.`
    case 'cyber':
      return `Zero-trust Kai scan complete for "${summary}" — 0 policy violations, supply-chain signatures verified.`
    case 'sci':
      return `Queued benchmark sweep for "${summary}" on \`${model}\` — streaming pass@1 & p95 latency telemetry to Spaces.`
    case 'mana':
      return `Added "${summary}" to the v8.8 sprint cycle and linked owner checkpoints.`
    case 'qa':
      return `Running Playwright + X11 pixel verification suite for "${summary}".`
    default:
      return `Acknowledged "${summary}" (${model}) — executing now.`
  }
}

export function sendWorkspaceMessage(roomId: string, rawText: string): ChatMessageItem | null {
  const body = rawText.trim()
  if (!body) return null
  const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const created: ChatMessageItem = {
    id: msgId,
    roomId,
    authorId: 'zach',
    at: nowClock(),
    body,
    reactions: [],
    replies: [],
  }

  const nextChannels = state.channels.map((c) => (c.id === roomId ? { ...c, unread: 0 } : c))
  let nextMessages = [...state.messages, created]

  const ch = state.channels.find((c) => c.id === roomId)
  const mentionedBot = state.roster.find(
    (m) => m.bot && new RegExp(`@${m.handle}\\b`, 'i').test(body),
  )
  const targetBot =
    mentionedBot ??
    (ch?.kind === 'dm' && ch.dmMemberId
      ? state.roster.find((m) => m.id === ch.dmMemberId && m.bot)
      : undefined)

  if (targetBot) {
    assignToAgent(targetBot.handle, body.slice(0, 80), `/chat/${roomId}`)
    const replyMsg: ChatMessageItem = {
      id: `bot-${Date.now()}-${targetBot.handle}`,
      roomId,
      authorId: targetBot.id,
      at: nowClock(),
      body: botAutoReplyText(targetBot.handle, body, state.composerModel),
      reactions: [{ emoji: '⚡', count: 1, mine: false }],
      replies: [],
    }
    nextMessages = [...nextMessages, replyMsg]
  }

  emit({ ...state, channels: nextChannels, messages: nextMessages })
  return created
}

export function sendThreadReply(
  roomId: string,
  parentMessageId: string,
  rawText: string,
  alsoSendToChannel = false,
): void {
  const body = rawText.trim()
  if (!body) return
  const replyItem = {
    id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    authorId: 'zach',
    at: nowClock(),
    body,
  }
  let nextMessages = state.messages.map((m) =>
    m.id === parentMessageId ? { ...m, replies: [...m.replies, replyItem] } : m,
  )
  if (alsoSendToChannel) {
    nextMessages = [
      ...nextMessages,
      {
        id: `echo-${Date.now()}`,
        roomId,
        authorId: 'zach',
        at: nowClock(),
        body: `Replied to thread: ${body}`,
        reactions: [],
        replies: [],
      },
    ]
  }
  const autoOpen = readTeamSettings().autoOpenThreadOnReply
  emit({
    ...state,
    messages: nextMessages,
    ...(autoOpen
      ? { rightPaneMode: 'thread' as const, activeThread: { roomId, messageId: parentMessageId } }
      : {}),
  })
}

export function toggleMessageReaction(messageId: string, emoji: string): void {
  const nextMessages = state.messages.map((m) => {
    if (m.id !== messageId) return m
    const existing = m.reactions.find((r) => r.emoji === emoji)
    if (!existing) {
      return { ...m, reactions: [...m.reactions, { emoji, count: 1, mine: true }] }
    }
    const nextCount = existing.mine ? existing.count - 1 : existing.count + 1
    const nextReactions =
      nextCount <= 0
        ? m.reactions.filter((r) => r.emoji !== emoji)
        : m.reactions.map((r) =>
            r.emoji === emoji ? { ...r, count: nextCount, mine: !existing.mine } : r,
          )
    return { ...m, reactions: nextReactions }
  })
  emit({ ...state, messages: nextMessages })
}

export function togglePinMessage(messageId: string): void {
  emit({
    ...state,
    messages: state.messages.map((m) => (m.id === messageId ? { ...m, pinned: !m.pinned } : m)),
  })
}

export function approveDeployRelease(messageId: string, approverName = 'Zach Kelling'): void {
  emit({
    ...state,
    messages: state.messages.map((m) =>
      m.id === messageId && m.deployCard
        ? { ...m, deployCard: { ...m.deployCard, approvedBy: approverName } }
        : m,
    ),
    attention: state.attention.map((a) => (a.id === 'att-1' ? { ...a, resolved: true } : a)),
  })
}

export function createWorkspaceChannel(rawName: string, topic = 'New engineering channel'): string | null {
  const clean = rawName.trim().replace(/^#+/, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
  if (!clean) return null
  const existing = state.channels.find((c) => c.id === clean || c.name === clean)
  if (existing) return existing.id
  const next: WorkspaceChannel = { id: clean, name: clean, topic, kind: 'channel' }
  emit({ ...state, channels: [...state.channels, next] })
  return clean
}

export function clearChannelUnread(roomId: string): void {
  const target = state.channels.find((c) => c.id === roomId)
  if (!target || !target.unread) return
  emit({
    ...state,
    channels: state.channels.map((c) => (c.id === roomId ? { ...c, unread: 0 } : c)),
  })
}

export function selectOfficeFloor(floor: WorkspaceSnapshot['selectedFloor']): void {
  emit({ ...state, selectedFloor: floor })
}

export function triggerOfficeInteraction(personName: string, action: 'wave' | 'knock' | 'chat'): void {
  const verb =
    action === 'wave'
      ? `Waved 👋 at ${personName} — gentle ping sent`
      : action === 'knock'
        ? `Knocked 🚪 on ${personName}'s desk — awaiting drop-in`
        : `Opened direct channel with ${personName}`
  emit({
    ...state,
    officeBanner: { id: `${Date.now()}`, text: verb, at: Date.now() },
  })
}

export { OFFICE_DESKS }
export type {
  AttentionItem,
  ChatMessageItem,
  MemoryNode,
  OrgGuild,
  RosterMember,
  SpaceDeliverable,
  VoiceRoom,
  WorkspaceChannel,
}
