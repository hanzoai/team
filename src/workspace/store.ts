/**
 * Reactive workspace store for Hanzo Team — wired to live production backends:
 * - `/v1/team/{account,channels,dms,members,inbox,docs,messages}` + transactor WS
 * - `/v1/agents` & `/v1/bot/members`
 * - `/v1/meet/{health,session,call,getToken}` + `livekit-client` (`wss://live.hanzo.ai`)
 *
 * Zero hardcoded seed data and zero canned/mock bot replies.
 */
import { useSyncExternalStore } from 'react'

import { listBotMembers, listCloudAgents } from '../data/agents.ts'
import type { SpaceRow } from '../data/account.ts'
import {
  getMeetHealth,
  getMeetSession,
  meetClient,
  type LiveConnectionStatus,
  type LiveParticipant,
  type LiveRoomSnapshot,
} from '../data/meet.ts'
import { bareAccount } from '../data/model.ts'
import {
  addTeamReaction,
  archiveInboxItem,
  createTeamChannel,
  createTeamDoc,
  encodeMentionsForApi,
  listTeamChannels,
  listTeamDocs,
  listTeamInbox,
  listTeamMembers,
  listTeamMessages,
  listTeamReplies,
  markAllInboxRead,
  markInboxRead,
  openTeamDm,
  removeTeamReaction,
  sendTeamMessage,
  sendTeamReply,
} from '../data/teamRest.ts'
import { mapBackendAgents, setWorkforceAgents } from '../agents/workforce.ts'
import { readTeamSettings, writeTeamSettings } from '../settings/preferences.ts'
import {
  buildMemoryNodes,
  formatClock,
  mapChannelsToWorkspace,
  mapDocsToSpaces,
  mapDtoToMessage,
  mapInboxToAttention,
  mapMembersToRoster,
} from './mappers.ts'
import type {
  AttentionItem,
  ChatMessageItem,
  ChatReplyItem,
  MemoryNode,
  OrgGuild,
  RosterMember,
  SpaceDeliverable,
  VoiceRoom,
  WorkspaceChannel,
} from './seed.ts'

export { formatClock, mapChannelsToWorkspace, mapDtoToMessage, mapMembersToRoster } from './mappers.ts'

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

export interface AuthenticatedUser {
  id: string
  accountId: string
  name: string
  email?: string
  avatar?: string
}

export interface WorkspaceSnapshot {
  orgs: readonly OrgGuild[]
  activeOrgId: string
  activeSpaceUuid: string
  currentUser: AuthenticatedUser | null
  roster: readonly RosterMember[]
  channels: readonly WorkspaceChannel[]
  voiceRooms: readonly VoiceRoom[]
  connectedVoiceId: string | null
  voiceStatus: LiveConnectionStatus
  voiceError: string | null
  voiceServerHost: string | null
  meetReady: boolean | null
  liveParticipants: readonly LiveParticipant[]
  micMuted: boolean
  deafened: boolean
  screenSharing: boolean
  cameraOn: boolean
  messages: readonly ChatMessageItem[]
  activeRoomId: string | null
  hydrating: boolean
  hydrateError: string | null
  loadingRooms: Readonly<Record<string, boolean>>
  loadedRooms: Readonly<Record<string, boolean>>
  roomErrors: Readonly<Record<string, string>>
  rightPaneMode: RightPaneMode
  activeThread: ActiveThreadRef | null
  composerModel: ComposerModel
  appearanceMode: AppearanceMode
  attention: readonly AttentionItem[]
  inboxUnread: number
  selectedFloor: 'ALL' | 'F4' | 'F3' | 'F2' | 'F1'
  officeBanner: OfficeToast | null
  spaces: readonly SpaceDeliverable[]
  memory: readonly MemoryNode[]
  phoneModalOpen: boolean
}

const DEFAULT_OFFICE_ROOMS: readonly VoiceRoom[] = [
  { id: 'office-theater', name: 'Theater · All-Hands', kind: 'theater', participants: [] },
  { id: 'office-meeting', name: 'Meeting Room', kind: 'meeting', participants: [] },
  { id: 'office-huddle', name: 'Engineering Huddle', kind: 'huddle', participants: [] },
]

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
    orgs: [],
    activeOrgId: '',
    activeSpaceUuid: '',
    currentUser: null,
    roster: [],
    channels: [],
    voiceRooms: DEFAULT_OFFICE_ROOMS.map((r) => ({ ...r, participants: [] })),
    connectedVoiceId: null,
    voiceStatus: 'disconnected',
    voiceError: null,
    voiceServerHost: null,
    meetReady: null,
    liveParticipants: [],
    micMuted: prefs.officeDefaultAudio === 'muted',
    deafened: false,
    screenSharing: false,
    cameraOn: prefs.officeDefaultVideo === 'on',
    messages: [],
    activeRoomId: null,
    hydrating: false,
    hydrateError: null,
    loadingRooms: {},
    loadedRooms: {},
    roomErrors: {},
    rightPaneMode: prefs.rightPaneDefault === 'collapsed' ? 'closed' : 'roster',
    activeThread: null,
    composerModel: prefs.defaultModel,
    appearanceMode: readInitialAppearance(),
    attention: [],
    inboxUnread: 0,
    selectedFloor: 'ALL',
    officeBanner: null,
    spaces: [],
    memory: [],
    phoneModalOpen: false,
  }
}

let state: WorkspaceSnapshot = createInitialSnapshot()
const listeners = new Set<() => void>()
let orgChooser: ((slug: string) => void) | null = null
const replyFollowUpTimers = new Set<ReturnType<typeof setTimeout>>()

function emit(next: WorkspaceSnapshot): void {
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

export function registerOrgChooser(fn: ((slug: string) => void) | null): void {
  orgChooser = fn
}

export function resetWorkspaceStore(): void {
  for (const t of replyFollowUpTimers) clearTimeout(t)
  replyFollowUpTimers.clear()
  emit(createInitialSnapshot())
}

function hostOfWs(ws: string | null): string | null {
  if (!ws) return null
  try {
    return new URL(ws).host
  } catch {
    return ws
  }
}

function applyMeetSnapshot(snap: LiveRoomSnapshot): void {
  const mappedParts = snap.participants.map((p) => ({
    memberId: p.identity,
    name: p.name,
    isLocal: p.isLocal,
    speaking: p.isSpeaking,
    micEnabled: p.micEnabled,
    sharingScreen: p.screenSharing,
    videoOn: p.cameraEnabled,
  }))

  let nextRooms = state.voiceRooms.map((r) => ({
    ...r,
    participants: snap.roomId && r.id === snap.roomId ? mappedParts : [],
  }))

  if (snap.roomId && !nextRooms.some((r) => r.id === snap.roomId)) {
    const ch = state.channels.find((c) => c.id === snap.roomId)
    nextRooms = [
      ...nextRooms,
      { id: snap.roomId, name: ch ? `#${ch.name} Huddle` : snap.roomId, kind: 'huddle', participants: mappedParts },
    ]
  }

  emit({
    ...state,
    voiceRooms: nextRooms,
    connectedVoiceId: snap.status === 'disconnected' || snap.status === 'error' ? null : snap.roomId,
    voiceStatus: snap.status,
    voiceError: snap.error,
    voiceServerHost: hostOfWs(snap.wsUrl) ?? state.voiceServerHost,
    liveParticipants: snap.participants,
    micMuted: snap.micMuted,
    deafened: snap.deafened,
    cameraOn: snap.cameraOn,
    screenSharing: snap.screenSharing,
  })
}

meetClient.subscribe(applyMeetSnapshot)

export function syncCurrentUser(user: AuthenticatedUser | null): void {
  emit({ ...state, currentUser: user })
}

export function syncSpacesList(rows: readonly SpaceRow[], current: SpaceRow | null): void {
  const agentsCount = state.roster.filter((m) => m.bot).length
  const humansCount = state.roster.filter((m) => !m.bot).length
  const orgs: OrgGuild[] = rows.map((r) => {
    const isCurrent = current ? r.uuid === current.uuid : false
    const label = r.name?.trim() || r.url || 'Workspace'
    return {
      id: r.url,
      spaceUuid: r.uuid,
      org: r.org,
      letter: label.slice(0, 1).toUpperCase(),
      name: label,
      subtitle: isCurrent
        ? `${agentsCount} ${agentsCount === 1 ? 'agent' : 'agents'} · ${humansCount} ${humansCount === 1 ? 'human' : 'humans'}`
        : r.org || r.url,
      agentsCount: isCurrent ? agentsCount : 0,
      humansCount: isCurrent ? humansCount : 0,
    }
  })
  emit({
    ...state,
    orgs,
    activeOrgId: current?.url ?? rows[0]?.url ?? '',
    activeSpaceUuid: current?.uuid ?? rows[0]?.uuid ?? '',
  })
}

export async function hydrateWorkspaceFromBackend(opts: {
  spaceUuid: string
  spaceSlug: string
  spaces: readonly SpaceRow[]
  current: SpaceRow
  accountId?: string
}): Promise<void> {
  const { spaceUuid, spaces, current } = opts
  if (!spaceUuid) return

  emit({ ...state, hydrating: true, hydrateError: null, activeSpaceUuid: spaceUuid, activeOrgId: current.url })

  const [membersRes, channelsRes, agentsRes, botMembersRes, inboxRes, docsRes, meetHealthRes, meetSessRes] =
    await Promise.allSettled([
      listTeamMembers(spaceUuid),
      listTeamChannels(),
      listCloudAgents(),
      listBotMembers(),
      listTeamInbox(spaceUuid),
      listTeamDocs(spaceUuid),
      getMeetHealth(),
      getMeetSession(),
    ])

  const teamMembers = membersRes.status === 'fulfilled' ? membersRes.value.members : []
  const cloudAgents = agentsRes.status === 'fulfilled' ? agentsRes.value : []
  const botMembers = botMembersRes.status === 'fulfilled' ? botMembersRes.value : []
  const rawChannels = channelsRes.status === 'fulfilled' ? channelsRes.value : []
  const inboxData = inboxRes.status === 'fulfilled' ? inboxRes.value : { items: [], unread: 0 }
  const docsData = docsRes.status === 'fulfilled' ? docsRes.value : { docs: [], teamspaces: [] }
  const meetHealth = meetHealthRes.status === 'fulfilled' ? meetHealthRes.value : null
  const meetSess = meetSessRes.status === 'fulfilled' ? meetSessRes.value : null

  setWorkforceAgents(mapBackendAgents(cloudAgents, botMembers))

  const myAccountId =
    opts.accountId || meetSess?.identity || state.currentUser?.accountId || state.currentUser?.id || ''

  const nextUser = state.currentUser
    ? { ...state.currentUser, accountId: myAccountId || state.currentUser.accountId, name: state.currentUser.name || meetSess?.name || 'Teammate' }
    : meetSess?.identity
      ? { id: meetSess.identity, accountId: meetSess.identity, name: meetSess.name || 'Teammate' }
      : null

  const roster = mapMembersToRoster(spaceUuid, teamMembers, cloudAgents, botMembers)
  const channels = mapChannelsToWorkspace(spaceUuid, rawChannels, roster, myAccountId)
  const attention = mapInboxToAttention(inboxData.items, roster, channels)
  const deliveredSpaces = mapDocsToSpaces(docsData.docs, docsData.teamspaces, roster)
  const memory = buildMemoryNodes(deliveredSpaces, roster)
  const agentsCount = roster.filter((m) => m.bot).length
  const humansCount = roster.filter((m) => !m.bot).length

  const orgs: OrgGuild[] = spaces.map((r) => {
    const isCurrent = r.uuid === current.uuid
    const label = r.name?.trim() || r.url || 'Workspace'
    return {
      id: r.url,
      spaceUuid: r.uuid,
      org: r.org,
      letter: label.slice(0, 1).toUpperCase(),
      name: label,
      subtitle: isCurrent
        ? `${agentsCount} ${agentsCount === 1 ? 'agent' : 'agents'} · ${humansCount} ${humansCount === 1 ? 'human' : 'humans'}`
        : r.org || r.url,
      agentsCount: isCurrent ? agentsCount : 0,
      humansCount: isCurrent ? humansCount : 0,
    }
  })

  const criticalErr =
    channelsRes.status === 'rejected' && membersRes.status === 'rejected'
      ? channelsRes.reason instanceof Error
        ? channelsRes.reason.message
        : 'Failed to load workspace data'
      : null

  emit({
    ...state,
    orgs,
    activeOrgId: current.url,
    activeSpaceUuid: spaceUuid,
    currentUser: nextUser,
    roster,
    channels,
    attention,
    inboxUnread: inboxData.unread,
    spaces: deliveredSpaces,
    memory,
    meetReady: meetHealth ? meetHealth.ready : state.meetReady,
    voiceServerHost: hostOfWs(meetSess?.ws ?? null) ?? state.voiceServerHost,
    hydrating: false,
    hydrateError: criticalErr,
  })

  const targetRoom = state.activeRoomId ?? channels.find((c) => c.kind === 'channel')?.id ?? channels[0]?.id
  if (targetRoom) void loadRoomMessages(targetRoom)
}

export async function refreshChannelsFromBackend(): Promise<void> {
  if (!state.activeSpaceUuid) return
  try {
    const raw = await listTeamChannels()
    const myAccountId = state.currentUser?.accountId || state.currentUser?.id || ''
    emit({ ...state, channels: mapChannelsToWorkspace(state.activeSpaceUuid, raw, state.roster, myAccountId) })
  } catch {
    /* keep existing list */
  }
}

export async function refreshRosterFromBackend(): Promise<void> {
  if (!state.activeSpaceUuid) return
  try {
    const [membersRes, agentsRes, botRes] = await Promise.allSettled([
      listTeamMembers(state.activeSpaceUuid),
      listCloudAgents(),
      listBotMembers(),
    ])
    const members = membersRes.status === 'fulfilled' ? membersRes.value.members : []
    const cloudAgents = agentsRes.status === 'fulfilled' ? agentsRes.value : []
    const botMembers = botRes.status === 'fulfilled' ? botRes.value : []
    setWorkforceAgents(mapBackendAgents(cloudAgents, botMembers))
    const roster = mapMembersToRoster(state.activeSpaceUuid, members, cloudAgents, botMembers)
    const agentsCount = roster.filter((m) => m.bot).length
    const humansCount = roster.filter((m) => !m.bot).length
    const orgs = state.orgs.map((o) =>
      o.spaceUuid === state.activeSpaceUuid
        ? {
            ...o,
            agentsCount,
            humansCount,
            subtitle: `${agentsCount} ${agentsCount === 1 ? 'agent' : 'agents'} · ${humansCount} ${humansCount === 1 ? 'human' : 'humans'}`,
          }
        : o,
    )
    emit({ ...state, roster, orgs, memory: buildMemoryNodes(state.spaces, roster) })
  } catch {
    /* ignore */
  }
}

export async function refreshInboxFromBackend(): Promise<void> {
  if (!state.activeSpaceUuid) return
  try {
    const data = await listTeamInbox(state.activeSpaceUuid)
    emit({ ...state, attention: mapInboxToAttention(data.items, state.roster, state.channels), inboxUnread: data.unread })
  } catch {
    /* ignore */
  }
}

export async function refreshDocsFromBackend(): Promise<void> {
  if (!state.activeSpaceUuid) return
  try {
    const data = await listTeamDocs(state.activeSpaceUuid)
    const deliveredSpaces = mapDocsToSpaces(data.docs, data.teamspaces, state.roster)
    emit({ ...state, spaces: deliveredSpaces, memory: buildMemoryNodes(deliveredSpaces, state.roster) })
  } catch {
    /* ignore */
  }
}

export function setActiveRoomId(roomId: string | null): void {
  if (state.activeRoomId === roomId) return
  emit({ ...state, activeRoomId: roomId })
}

export async function loadRoomMessages(roomId: string, opts: { silent?: boolean } = {}): Promise<ChatMessageItem[]> {
  const spaceUuid = state.activeSpaceUuid
  if (!roomId || !spaceUuid) return []

  if (!opts.silent) {
    emit({
      ...state,
      loadingRooms: { ...state.loadingRooms, [roomId]: true },
      roomErrors: { ...state.roomErrors, [roomId]: '' },
    })
  }

  try {
    const dtos = await listTeamMessages(roomId, spaceUuid)
    const myAccountId = state.currentUser?.accountId || state.currentUser?.id || ''
    const existingById = new Map(state.messages.filter((m) => m.roomId === roomId).map((m) => [m.id, m]))
    const mapped = dtos.map((dto) => mapDtoToMessage(dto, myAccountId, existingById.get(dto.id)?.replies ?? []))
    const failedDrafts = state.messages.filter((m) => m.roomId === roomId && Boolean(m.failed))
    const otherRooms = state.messages.filter((m) => m.roomId !== roomId)

    emit({
      ...state,
      messages: [...otherRooms, ...mapped, ...failedDrafts],
      loadingRooms: { ...state.loadingRooms, [roomId]: false },
      loadedRooms: { ...state.loadedRooms, [roomId]: true },
      roomErrors: { ...state.roomErrors, [roomId]: '' },
    })
    return mapped
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load messages'
    emit({
      ...state,
      loadingRooms: { ...state.loadingRooms, [roomId]: false },
      roomErrors: { ...state.roomErrors, [roomId]: msg },
    })
    return []
  }
}

export async function loadThreadReplies(messageId: string): Promise<ChatReplyItem[]> {
  const spaceUuid = state.activeSpaceUuid
  if (!messageId || !spaceUuid) return []
  try {
    const dtos = await listTeamReplies(messageId, spaceUuid)
    const mapped: ChatReplyItem[] = dtos.map((d) => ({
      id: d.id,
      authorId: bareAccount(d.author),
      at: formatClock(d.createdOn),
      createdOn: d.createdOn,
      body: d.text || '',
    }))
    emit({
      ...state,
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, replies: mapped, replyCount: Math.max(m.replyCount, mapped.length) } : m,
      ),
    })
    return mapped
  } catch {
    return []
  }
}

export function selectGuildOrg(orgId: string): void {
  const target = state.orgs.find((o) => o.id === orgId)
  if (!target) return
  emit({ ...state, activeOrgId: orgId, activeSpaceUuid: target.spaceUuid })
  orgChooser?.(orgId)
}

export function setAppearanceMode(mode: AppearanceMode): void {
  writeTeamSettings({ themePreset: mode === 'light' ? 'zen-light' : mode, colorMode: mode === 'light' ? 'light' : 'dark' })
  emit({ ...state, appearanceMode: mode })
}

export function setPhoneModalOpen(open: boolean): void {
  emit({ ...state, phoneModalOpen: open })
}

export async function joinVoiceRoom(roomId: string): Promise<void> {
  const spaceUuid = state.activeSpaceUuid
  if (!spaceUuid) {
    emit({ ...state, voiceStatus: 'error', voiceError: 'No active workspace selected — sign in to join a live room.' })
    return
  }
  if (state.connectedVoiceId === roomId && state.voiceStatus === 'connected') return
  await meetClient.join({
    spaceUuid,
    roomId,
    participantName: state.currentUser?.name || state.currentUser?.email || 'Teammate',
    accountId: state.currentUser?.accountId || state.currentUser?.id || '',
    micMuted: state.micMuted,
    cameraOn: state.cameraOn,
  })
}

export async function leaveVoiceRoom(): Promise<void> {
  await meetClient.leave()
}

export function toggleVoiceMute(): void {
  void meetClient.setMuted(!state.micMuted)
}

export function toggleVoiceDeafen(): void {
  void meetClient.setDeafened(!state.deafened)
}

export function toggleScreenShare(): void {
  void meetClient.setScreenShare(!state.screenSharing)
}

export function toggleCameraOn(): void {
  void meetClient.setCamera(!state.cameraOn)
}

export function openThreadPane(roomId: string, messageId: string): void {
  emit({ ...state, rightPaneMode: 'thread', activeThread: { roomId, messageId } })
  void loadThreadReplies(messageId)
}

export function closeThreadPane(): void {
  emit({ ...state, rightPaneMode: 'roster' })
}

export function toggleRosterPane(): void {
  emit({ ...state, rightPaneMode: state.rightPaneMode === 'roster' ? 'closed' : 'roster' })
}

export function toggleRightThreadPane(): void {
  if (state.rightPaneMode === 'thread') {
    emit({ ...state, rightPaneMode: 'closed' })
    return
  }
  const threaded = state.messages.find((m) => m.replyCount > 0 || m.replies.length > 0)
  const fallback = state.activeThread ?? (threaded ? { roomId: threaded.roomId, messageId: threaded.id } : null)
  emit({ ...state, rightPaneMode: 'thread', activeThread: fallback })
  if (fallback) void loadThreadReplies(fallback.messageId)
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

function scheduleBotReplyRefresh(roomId: string): void {
  for (const delay of [2500, 6000, 12000, 20000]) {
    const timer = setTimeout(() => {
      replyFollowUpTimers.delete(timer)
      if (state.activeRoomId === roomId || state.loadedRooms[roomId]) {
        void loadRoomMessages(roomId, { silent: true })
      }
    }, delay)
    replyFollowUpTimers.add(timer)
  }
}

export async function sendWorkspaceMessage(roomId: string, rawText: string): Promise<ChatMessageItem | null> {
  const body = rawText.trim()
  if (!body) return null
  const spaceUuid = state.activeSpaceUuid
  const authorId = bareAccount(state.currentUser?.accountId || state.currentUser?.id || '')

  const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const pendingMsg: ChatMessageItem = {
    id: tempId,
    roomId,
    authorId,
    at: 'Sending…',
    createdOn: Date.now(),
    body,
    pending: true,
    reactions: [],
    replyCount: 0,
    replies: [],
  }

  emit({
    ...state,
    channels: state.channels.map((c) => (c.id === roomId ? { ...c, unread: 0 } : c)),
    messages: [...state.messages, pendingMsg],
  })

  if (!spaceUuid) {
    emit({
      ...state,
      messages: state.messages.map((m) =>
        m.id === tempId ? { ...m, pending: false, at: 'Not sent', failed: 'No active workspace connected.' } : m,
      ),
    })
    return null
  }

  const encodedText = encodeMentionsForApi(body, state.roster)

  try {
    const saved = await sendTeamMessage(roomId, { space: spaceUuid, text: encodedText })
    const confirmed = mapDtoToMessage(saved, authorId)
    emit({ ...state, messages: state.messages.map((m) => (m.id === tempId ? confirmed : m)) })

    const ch = state.channels.find((c) => c.id === roomId)
    const isBotDm =
      ch?.kind === 'dm' && Boolean(ch.dmMemberId && state.roster.some((r) => r.id === ch.dmMemberId && r.bot))
    if (isBotDm || encodedText.includes('<@')) scheduleBotReplyRefresh(roomId)
    return confirmed
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Message failed to send'
    emit({
      ...state,
      messages: state.messages.map((m) => (m.id === tempId ? { ...m, pending: false, at: 'Failed', failed: msg } : m)),
    })
    return null
  }
}

export function dismissFailedMessage(messageId: string): void {
  emit({ ...state, messages: state.messages.filter((m) => m.id !== messageId) })
}

export async function sendThreadReply(
  roomId: string,
  parentMessageId: string,
  rawText: string,
  alsoSendToChannel = false,
): Promise<void> {
  const body = rawText.trim()
  if (!body || !state.activeSpaceUuid) return

  const encodedText = encodeMentionsForApi(body, state.roster)
  const saved = await sendTeamReply(parentMessageId, { space: state.activeSpaceUuid, text: encodedText })
  const replyItem: ChatReplyItem = {
    id: saved.id,
    authorId: bareAccount(saved.author),
    at: formatClock(saved.createdOn),
    createdOn: saved.createdOn,
    body: saved.text || body,
  }

  const autoOpen = readTeamSettings().autoOpenThreadOnReply
  emit({
    ...state,
    messages: state.messages.map((m) =>
      m.id === parentMessageId
        ? {
            ...m,
            replies: [...m.replies.filter((r) => r.id !== replyItem.id), replyItem],
            replyCount: Math.max(m.replyCount + 1, m.replies.length + 1),
          }
        : m,
    ),
    ...(autoOpen ? { rightPaneMode: 'thread' as const, activeThread: { roomId, messageId: parentMessageId } } : {}),
  })

  if (alsoSendToChannel) await sendWorkspaceMessage(roomId, body)
}

export async function toggleMessageReaction(messageId: string, emoji: string): Promise<void> {
  const spaceUuid = state.activeSpaceUuid
  if (!spaceUuid) return
  const target = state.messages.find((m) => m.id === messageId)
  if (!target) return
  const existing = target.reactions.find((r) => r.emoji === emoji)
  const myAccountId = state.currentUser?.accountId || state.currentUser?.id || ''

  try {
    const updatedDto = existing?.mine
      ? await removeTeamReaction(messageId, emoji, spaceUuid)
      : await addTeamReaction(messageId, emoji, spaceUuid)
    const updatedMsg = mapDtoToMessage(updatedDto, myAccountId, target.replies)
    emit({ ...state, messages: state.messages.map((m) => (m.id === messageId ? updatedMsg : m)) })
  } catch {
    /* keep existing state */
  }
}

export function togglePinMessage(messageId: string): void {
  emit({ ...state, messages: state.messages.map((m) => (m.id === messageId ? { ...m, pinned: !m.pinned } : m)) })
}

export function approveDeployRelease(messageId: string, approverName?: string): void {
  const approver = approverName || state.currentUser?.name || 'Approved'
  emit({
    ...state,
    messages: state.messages.map((m) =>
      m.id === messageId && m.deployCard ? { ...m, deployCard: { ...m.deployCard, approvedBy: approver } } : m,
    ),
  })
}

export async function createWorkspaceChannel(rawName: string, topic = ''): Promise<string | null> {
  const clean = rawName.trim().replace(/^#+/, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
  if (!clean) return null
  const existing = state.channels.find((c) => c.kind === 'channel' && c.name.toLowerCase() === clean)
  if (existing) return existing.id
  if (!state.activeSpaceUuid) return null

  const created = await createTeamChannel({
    space: state.activeSpaceUuid,
    name: clean,
    topic: topic.trim() || undefined,
  })
  const mapped: WorkspaceChannel = {
    id: created.id,
    name: created.name || clean,
    topic: created.topic || '',
    kind: 'channel',
    private: created.private,
    members: created.members ?? [],
  }
  emit({ ...state, channels: [...state.channels.filter((c) => c.id !== mapped.id), mapped] })
  return mapped.id
}

export async function openDmWithMember(memberIdOrHandle: string): Promise<string | null> {
  const clean = memberIdOrHandle.replace(/^(dm-|with-)/, '').trim()
  if (!clean) return null
  const member = state.roster.find(
    (m) => m.id === clean || m.handle.toLowerCase() === clean.toLowerCase() || m.agentId === clean || bareAccount(m.id) === clean,
  )
  const targetId = member?.id ?? clean
  const existing = state.channels.find(
    (c) =>
      c.kind === 'dm' &&
      (c.dmMemberId === targetId || (c.members ?? []).some((id) => bareAccount(id) === bareAccount(targetId))),
  )
  if (existing) return existing.id
  if (!state.activeSpaceUuid) return null

  const { channel } = await openTeamDm(state.activeSpaceUuid, [targetId])
  const mapped: WorkspaceChannel = {
    id: channel.id,
    name: member?.name || channel.name || 'Direct Message',
    topic: 'Direct conversation',
    kind: 'dm',
    private: true,
    members: channel.members ?? [targetId],
    dmMemberId: targetId,
  }
  emit({ ...state, channels: [...state.channels.filter((c) => c.id !== mapped.id), mapped] })
  return mapped.id
}

export async function markAttentionRead(itemId: string): Promise<void> {
  const item = state.attention.find((a) => a.id === itemId)
  if (!item || !item.space) return
  await markInboxRead(item.id, item.space)
  await refreshInboxFromBackend()
}

export async function markAllAttentionRead(): Promise<void> {
  if (!state.activeSpaceUuid) return
  await markAllInboxRead(state.activeSpaceUuid)
  await refreshInboxFromBackend()
}

export async function archiveAttention(itemId: string): Promise<void> {
  const item = state.attention.find((a) => a.id === itemId)
  if (!item || !item.space) return
  await archiveInboxItem(item.id, item.space)
  await refreshInboxFromBackend()
}

export async function createWorkspaceDoc(title: string): Promise<SpaceDeliverable | null> {
  if (!state.activeSpaceUuid || !title.trim()) return null
  const created = await createTeamDoc({ space: state.activeSpaceUuid, title: title.trim() })
  await refreshDocsFromBackend()
  return state.spaces.find((s) => s.id === created.id) ?? null
}

export function clearChannelUnread(roomId: string): void {
  const target = state.channels.find((c) => c.id === roomId)
  if (!target || !target.unread) return
  emit({ ...state, channels: state.channels.map((c) => (c.id === roomId ? { ...c, unread: 0 } : c)) })
}

export function selectOfficeFloor(floor: WorkspaceSnapshot['selectedFloor']): void {
  emit({ ...state, selectedFloor: floor })
}

export function triggerOfficeInteraction(personName: string, action: 'wave' | 'knock' | 'chat'): void {
  const verb =
    action === 'wave'
      ? `Waved at ${personName}`
      : action === 'knock'
        ? `Knocked on ${personName}'s desk`
        : `Opened conversation with ${personName}`
  emit({ ...state, officeBanner: { id: `${Date.now()}`, text: verb, at: Date.now() } })
}

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
