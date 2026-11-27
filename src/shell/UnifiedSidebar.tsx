/**
 * COL 2 — Discord × Mattermost Channel, Voice & Workspace Sidebar (`244px`)
 *
 * Hydrated from real `/v1/team/{channels,dms,members,inbox}`, `/v1/agents`,
 * `/v1/bot/members`, and `/v1/meet/*` + LiveKit (`livekit-client`).
 */
import { Popover, Separator } from '@hanzo/gui'
import { Input, ScrollArea, SizableText, XStack, YStack } from '@hanzo/ui'
import {
  Brain,
  Building2,
  Check,
  ChevronDown,
  Hash,
  Headphones,
  HeadphoneOff,
  Home,
  Inbox as InboxIcon,
  Layers,
  Lock,
  MessagesSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Settings,
  SquareCheck,
  UserPlus,
  Video,
  Volume2,
} from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { bareAccount } from '~/data/model.ts'
import { openSettingsModal } from '~/settings/SettingsModal.tsx'
import { paint, ring, round, state } from '~/theme/theme.ts'
import {
  clearChannelUnread,
  createWorkspaceChannel,
  joinVoiceRoom,
  leaveVoiceRoom,
  openDmWithMember,
  selectGuildOrg,
  toggleCameraOn,
  toggleScreenShare,
  toggleVoiceDeafen,
  toggleVoiceMute,
  useWorkspace,
  type RosterMember,
} from '~/workspace/store.ts'
import { openConnectModal } from './ConnectOrgModal.tsx'
import { press } from './press.ts'
import {
  DockIconBtn,
  MemberPortrait,
  SectionHead,
  VoiceActionBtn,
  WorkspaceNavItem,
} from './SidebarParts.tsx'

export { MemberPortrait } from './SidebarParts.tsx'

export function UnifiedSidebar({
  userName,
  userEmail,
  userAvatar,
  onSignOut,
}: {
  userName: string
  userEmail?: string
  userAvatar?: string
  onSignOut: () => void
}) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const {
    orgs,
    activeOrgId,
    currentUser,
    channels,
    voiceRooms,
    connectedVoiceId,
    voiceStatus,
    voiceError,
    voiceServerHost,
    micMuted,
    deafened,
    screenSharing,
    cameraOn,
    roster,
    messages,
    inboxUnread,
    hydrating,
  } = useWorkspace()

  const [orgMenuOpen, setOrgMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [creatingCh, setCreatingCh] = useState(false)
  const [newChName, setNewChName] = useState('')
  const [channelErr, setChannelErr] = useState<string | null>(null)
  const [creatingBusy, setCreatingBusy] = useState(false)

  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? orgs[0] ?? null
  const agentsCount = roster.filter((m) => m.bot).length
  const humansCount = roster.filter((m) => !m.bot).length
  const orgSubtitle = hydrating
    ? 'Syncing workspace…'
    : `${agentsCount} ${agentsCount === 1 ? 'agent' : 'agents'} · ${humansCount} ${humansCount === 1 ? 'human' : 'humans'}`

  const threadsCount = messages.filter((m) => m.replyCount > 0 || m.replies.length > 0).length
  const publicChannels = channels.filter((c) => c.kind === 'channel')
  const connectedRoom = voiceRooms.find((r) => r.id === connectedVoiceId) ?? null
  const myBare = bareAccount(currentUser?.accountId || currentUser?.id || '')

  const sidebarDms = [
    ...roster.filter((m) => m.bot),
    ...roster.filter((m) => !m.bot && bareAccount(m.id) !== myBare),
  ]

  const submitChannel = async () => {
    const clean = newChName.trim()
    if (!clean || creatingBusy) return
    setCreatingBusy(true)
    setChannelErr(null)
    try {
      const createdId = await createWorkspaceChannel(clean)
      setNewChName('')
      setCreatingCh(false)
      if (createdId) navigate(`/chat/${createdId}`)
    } catch (err) {
      setChannelErr(err instanceof Error ? err.message : 'Failed to create channel')
    } finally {
      setCreatingBusy(false)
    }
  }

  const openMemberDm = async (member: RosterMember) => {
    try {
      const dmId = await openDmWithMember(member.id)
      navigate(dmId ? `/chat/${dmId}` : `/chat/with-${member.id}`)
    } catch {
      navigate(`/chat/with-${member.id}`)
    }
  }

  const voiceStatusLabel =
    voiceStatus === 'connecting'
      ? 'Connecting…'
      : voiceStatus === 'reconnecting'
        ? 'Reconnecting…'
        : voiceStatus === 'connected'
          ? voiceServerHost
            ? `Connected · ${voiceServerHost}`
            : 'Voice Connected'
          : voiceStatus === 'error'
            ? 'Voice Error'
            : ''

  return (
    <YStack
      flex={1}
      minH={0}
      borderRightWidth={1}
      style={{ backgroundColor: paint.sidebar, borderRightColor: paint.sidebarRule }}
      data-testid="team-left-sidebar"
    >
      {/* 1. Organization Header */}
      <Popover open={orgMenuOpen} onOpenChange={setOrgMenuOpen} placement="bottom-start" allowFlip stayInFrame>
        <Popover.Trigger asChild>
          <XStack
            {...press(() => setOrgMenuOpen((v) => !v), `${activeOrg?.name || 'Workspace'} organization menu`)}
            px={12}
            py={9}
            items="center"
            justify="space-between"
            borderBottomWidth={1}
            style={{ borderBottomColor: paint.sidebarRule }}
            hoverStyle={{ background: paint.rowHover }}
            focusVisibleStyle={ring}
            data-testid="sidebar-org-switcher-trigger"
          >
            <YStack flex={1} minW={0} gap={1}>
              <XStack items="center" gap={5}>
                <SizableText fontSize={14} fontWeight="700" style={{ color: paint.ink }} numberOfLines={1}>
                  {activeOrg?.name || 'Workspace'}
                </SizableText>
                <ChevronDown size={13} color={paint.dim} />
              </XStack>
              <SizableText fontSize={11} style={{ color: paint.dim }} numberOfLines={1}>
                {orgSubtitle}
              </SizableText>
            </YStack>
          </XStack>
        </Popover.Trigger>
        <Popover.Content
          role="menu"
          borderWidth={1}
          rounded={10}
          p={8}
          width={232}
          style={{ backgroundColor: paint.sidebar, borderColor: paint.paneEdge, zIndex: 100000 }}
        >
          <YStack gap={4}>
            <SizableText px={8} py={2} fontSize={10.5} fontWeight="700" style={{ color: paint.dim }}>
              WORKSPACES
            </SizableText>
            {orgs.length === 0 ? (
              <SizableText px={8} py={4} fontSize={12} style={{ color: paint.dim }}>
                No workspaces loaded
              </SizableText>
            ) : (
              orgs.map((o) => {
                const active = o.id === activeOrg?.id
                return (
                  <XStack
                    key={o.id}
                    {...press(() => {
                      selectGuildOrg(o.id)
                      setOrgMenuOpen(false)
                    }, `Switch to ${o.name}`)}
                    px={8}
                    py={6}
                    rounded={6}
                    items="center"
                    justify="space-between"
                    style={active ? { backgroundColor: paint.rowActive } : undefined}
                    hoverStyle={{ background: paint.rowHover }}
                  >
                    <SizableText fontSize={12.5} fontWeight={active ? '600' : '500'} style={{ color: paint.ink }}>
                      {o.name}
                    </SizableText>
                    {active ? <Check size={13} color={paint.ink} /> : null}
                  </XStack>
                )
              })
            )}
            <Separator borderColor={paint.rule} my={2} />
            <XStack
              {...press(() => {
                setOrgMenuOpen(false)
                openConnectModal('connect')
              }, 'Invite people or connect org')}
              px={8}
              py={5}
              gap={7}
              rounded={6}
              items="center"
              hoverStyle={{ background: paint.rowHover }}
            >
              <UserPlus size={13} color={paint.mute} />
              <SizableText fontSize={12.5} style={{ color: paint.ink }}>
                Invite teammates…
              </SizableText>
            </XStack>
            <XStack
              {...press(() => {
                setOrgMenuOpen(false)
                openSettingsModal('general')
              }, 'Organization settings')}
              px={8}
              py={5}
              gap={7}
              rounded={6}
              items="center"
              hoverStyle={{ background: paint.rowHover }}
            >
              <Settings size={13} color={paint.mute} />
              <SizableText fontSize={12.5} style={{ color: paint.ink }}>
                Organization Settings
              </SizableText>
            </XStack>
          </YStack>
        </Popover.Content>
      </Popover>

      {/* Scrollable Navigation Body */}
      <ScrollArea flex={1} minH={0}>
        <YStack px={8} py={8} gap={12}>
          {/* 2. Core Workspaces */}
          <YStack gap={2} data-testid="sidebar-workspaces">
            <WorkspaceNavItem
              label="Home"
              icon={<Home size={14} color={pathname === '/home' ? paint.ink : paint.mute} />}
              active={pathname === '/home'}
              onPress={() => navigate('/home')}
              testId="nav-ws-home"
            />
            <WorkspaceNavItem
              label="Inbox"
              badge={inboxUnread > 0 ? String(inboxUnread) : undefined}
              icon={<InboxIcon size={14} color={pathname === '/inbox' ? paint.ink : paint.mute} />}
              active={pathname === '/inbox'}
              onPress={() => navigate('/inbox')}
              testId="nav-ws-inbox"
            />
            <WorkspaceNavItem
              label="Threads"
              badge={threadsCount > 0 ? String(threadsCount) : undefined}
              icon={<MessagesSquare size={14} color={pathname === '/threads' ? paint.ink : paint.mute} />}
              active={pathname === '/threads'}
              onPress={() => navigate('/threads')}
              testId="nav-ws-threads"
            />
            <WorkspaceNavItem
              label="Office"
              liveDot={voiceStatus === 'connected'}
              icon={<Building2 size={14} color={pathname === '/office' ? paint.ink : paint.mute} />}
              active={pathname === '/office'}
              onPress={() => navigate('/office')}
              testId="nav-ws-office"
            />
            <WorkspaceNavItem
              label="Work"
              icon={<SquareCheck size={14} color={pathname.startsWith('/issues') || pathname.startsWith('/projects') ? paint.ink : paint.mute} />}
              active={pathname.startsWith('/issues') || pathname.startsWith('/projects')}
              onPress={() => navigate('/issues')}
              testId="nav-ws-work"
            />
            <WorkspaceNavItem
              label="Spaces"
              icon={<Layers size={14} color={pathname.startsWith('/spaces') ? paint.ink : paint.mute} />}
              active={pathname.startsWith('/spaces')}
              onPress={() => navigate('/spaces')}
              testId="nav-ws-spaces"
            />
            <WorkspaceNavItem
              label="Memory"
              icon={<Brain size={14} color={pathname === '/memory' ? paint.ink : paint.mute} />}
              active={pathname === '/memory'}
              onPress={() => navigate('/memory')}
              testId="nav-ws-memory"
            />
          </YStack>

          {/* 3. CHANNELS (+) */}
          <YStack gap={2}>
            <SectionHead
              label="CHANNELS"
              onAdd={() => {
                setChannelErr(null)
                setCreatingCh((v) => !v)
              }}
              addLabel="Create channel"
            />
            {creatingCh ? (
              <YStack gap={4}>
                <XStack
                  px={8}
                  py={4}
                  gap={5}
                  rounded={6}
                  borderWidth={1}
                  items="center"
                  style={{ backgroundColor: paint.panel, borderColor: paint.border }}
                >
                  <Hash size={12} color={paint.dim} />
                  <Input
                    flex={1}
                    unstyled
                    height={22}
                    borderWidth={0}
                    bg="transparent"
                    fontSize={12}
                    color={paint.ink}
                    placeholder="new-channel"
                    value={newChName}
                    onChangeText={setNewChName}
                    onKeyDown={(e: { key?: string; preventDefault?: () => void }) => {
                      if (e.key === 'Enter') {
                        e.preventDefault?.()
                        void submitChannel()
                      } else if (e.key === 'Escape') {
                        setCreatingCh(false)
                        setChannelErr(null)
                      }
                    }}
                  />
                </XStack>
                {channelErr ? (
                  <SizableText px={8} fontSize={11} style={{ color: paint.alert }}>
                    {channelErr}
                  </SizableText>
                ) : null}
              </YStack>
            ) : null}

            {hydrating && publicChannels.length === 0 ? (
              <SizableText px={8} py={4} fontSize={11.5} style={{ color: paint.dim }}>
                Loading channels…
              </SizableText>
            ) : publicChannels.length === 0 ? (
              <SizableText px={8} py={4} fontSize={11.5} style={{ color: paint.dim }}>
                No channels yet — press + to create one.
              </SizableText>
            ) : (
              publicChannels.map((ch) => {
                const target = `/chat/${ch.id}`
                const active = pathname === target || pathname === `/chat/${ch.name}`
                const hasUnread = Boolean(ch.unread && ch.unread > 0)
                return (
                  <XStack
                    key={ch.id}
                    {...press(() => {
                      clearChannelUnread(ch.id)
                      navigate(target)
                    }, `#${ch.name}`)}
                    height={27}
                    px={8}
                    rounded={6}
                    items="center"
                    justify="space-between"
                    gap={6}
                    position="relative"
                    style={active ? { backgroundColor: paint.rowActive } : undefined}
                    hoverStyle={active ? undefined : { background: paint.rowHover }}
                    focusVisibleStyle={ring}
                    data-testid={`sidebar-channel-${ch.name}`}
                  >
                    <XStack items="center" gap={6} flex={1} minW={0}>
                      {ch.private ? (
                        <Lock size={12} color={active || hasUnread ? paint.ink : paint.dim} />
                      ) : (
                        <Hash size={13} color={active || hasUnread ? paint.ink : paint.dim} />
                      )}
                      <SizableText
                        fontSize={13}
                        fontWeight={active || hasUnread ? '600' : '400'}
                        style={{ color: active || hasUnread ? paint.ink : paint.mute }}
                        numberOfLines={1}
                      >
                        {ch.name}
                      </SizableText>
                    </XStack>
                    {hasUnread ? (
                      <YStack width={6} height={6} rounded={round.pill} style={{ backgroundColor: paint.ink }} />
                    ) : null}
                  </XStack>
                )
              })
            )}
          </YStack>

          {/* 4. VOICE & HUDDLES (+) */}
          <YStack gap={3}>
            <SectionHead
              label="VOICE & HUDDLES"
              onAdd={() => void joinVoiceRoom('office-huddle')}
              addLabel="Start huddle"
            />
            {voiceRooms.map((vr) => {
              const joined = vr.id === connectedVoiceId
              return (
                <YStack key={vr.id} gap={2}>
                  <XStack
                    {...press(
                      () => void (joined ? leaveVoiceRoom() : joinVoiceRoom(vr.id)),
                      joined ? `Leave ${vr.name}` : `Join ${vr.name} voice huddle`,
                    )}
                    height={27}
                    px={8}
                    rounded={6}
                    items="center"
                    justify="space-between"
                    style={joined ? { backgroundColor: paint.rowActive } : undefined}
                    hoverStyle={{ background: paint.rowHover }}
                    focusVisibleStyle={ring}
                    data-testid={`voice-room-${vr.id}`}
                  >
                    <XStack items="center" gap={6} flex={1} minW={0}>
                      <Volume2 size={13} color={joined ? paint.speaking : paint.dim} />
                      <SizableText
                        fontSize={13}
                        fontWeight={joined ? '600' : '400'}
                        style={{ color: joined ? paint.ink : paint.mute }}
                        numberOfLines={1}
                      >
                        {vr.name}
                      </SizableText>
                    </XStack>
                    {vr.participants.length > 0 ? (
                      <SizableText fontSize={10.5} fontWeight="600" style={{ color: joined ? paint.speaking : paint.dim }}>
                        {`${vr.participants.length}`}
                      </SizableText>
                    ) : null}
                  </XStack>

                  {vr.participants.length > 0 ? (
                    <YStack pl={20} pr={4} gap={2}>
                      {vr.participants.map((part) => {
                        const matched = roster.find((m) => m.id === part.memberId || bareAccount(m.id) === bareAccount(part.memberId))
                        const displayName = matched ? (matched.bot ? `@${matched.handle}` : matched.shortName) : (part.name || part.memberId.slice(0, 8))
                        const portraitMember = matched ?? {
                          name: displayName,
                          shortName: displayName,
                          avatar: part.isLocal ? userAvatar : undefined,
                          bot: false,
                        }
                        return (
                          <XStack key={part.memberId} height={24} px={6} rounded={5} items="center" justify="space-between" gap={6}>
                            <XStack items="center" gap={6} flex={1} minW={0}>
                              <MemberPortrait member={portraitMember} size={18} speaking={Boolean(part.speaking)} />
                              <SizableText
                                fontSize={12}
                                fontWeight={part.speaking ? '600' : '400'}
                                style={{ color: part.speaking ? paint.ink : paint.mute }}
                                numberOfLines={1}
                              >
                                {part.isLocal ? `${displayName} (You)` : displayName}
                              </SizableText>
                            </XStack>
                            {part.sharingScreen ? (
                              <XStack px={4} py={0.5} rounded={3} style={{ backgroundColor: paint.speakingBg }}>
                                <SizableText fontSize={9} fontWeight="700" style={{ color: paint.speaking }}>
                                  LIVE
                                </SizableText>
                              </XStack>
                            ) : null}
                          </XStack>
                        )
                      })}
                    </YStack>
                  ) : null}
                </YStack>
              )
            })}
            {voiceStatus === 'error' && voiceError ? (
              <SizableText px={8} py={2} fontSize={11} style={{ color: paint.alert }}>
                {voiceError}
              </SizableText>
            ) : null}
          </YStack>

          {/* 5. DIRECT MESSAGES & AI WORKFORCE (+) */}
          <YStack gap={2}>
            <SectionHead label="DIRECT MESSAGES & AI" onAdd={() => navigate('/office')} addLabel="Open workforce directory" />
            {hydrating && sidebarDms.length === 0 ? (
              <SizableText px={8} py={4} fontSize={11.5} style={{ color: paint.dim }}>
                Loading members…
              </SizableText>
            ) : sidebarDms.length === 0 ? (
              <SizableText px={8} py={4} fontSize={11.5} style={{ color: paint.dim }}>
                No teammates or bots yet.
              </SizableText>
            ) : (
              sidebarDms.map((m) => {
                const existingDm = channels.find(
                  (c) => c.kind === 'dm' && (c.dmMemberId === m.id || (c.members ?? []).includes(m.id)),
                )
                const active =
                  (existingDm && pathname === `/chat/${existingDm.id}`) ||
                  pathname === `/chat/with-${m.id}` ||
                  pathname === `/chat/dm-${m.id}`
                return (
                  <XStack
                    key={m.id}
                    {...press(() => void openMemberDm(m), `Message ${m.name}`)}
                    py={4}
                    px={8}
                    rounded={6}
                    items="center"
                    gap={8}
                    style={active ? { backgroundColor: paint.rowActive } : undefined}
                    hoverStyle={active ? undefined : { background: paint.rowHover }}
                    focusVisibleStyle={ring}
                    data-testid={`sidebar-dm-${m.id}`}
                  >
                    <YStack position="relative" shrink={0}>
                      <MemberPortrait member={m} size={22} />
                      <YStack
                        position="absolute"
                        b={-1}
                        r={-1}
                        width={7}
                        height={7}
                        rounded={round.pill}
                        borderWidth={1.5}
                        style={{
                          backgroundColor:
                            m.presence === 'online' || m.presence === 'voice'
                              ? state.done
                              : m.presence === 'busy'
                                ? state.doing
                                : m.presence === 'gated'
                                  ? paint.sevInk
                                  : paint.dim,
                          borderColor: paint.sidebar,
                        }}
                      />
                    </YStack>
                    <YStack flex={1} minW={0}>
                      <SizableText fontSize={12.5} fontWeight={active ? '600' : '500'} style={{ color: active ? paint.ink : paint.fg }} numberOfLines={1}>
                        {m.bot ? `@${m.handle}` : m.shortName}
                      </SizableText>
                      <SizableText fontSize={10.5} style={{ color: paint.dim }} numberOfLines={1}>
                        {m.activity}
                      </SizableText>
                    </YStack>
                  </XStack>
                )
              })
            )}
          </YStack>
        </YStack>
      </ScrollArea>

      {/* LiveKit Voice Connected Bar */}
      {connectedRoom || voiceStatus === 'connecting' || voiceStatus === 'reconnecting' ? (
        <YStack
          px={10}
          py={7}
          gap={6}
          borderTopWidth={1}
          style={{ backgroundColor: paint.voiceBg, borderTopColor: paint.voiceEdge }}
          data-testid="discord-voice-connected-bar"
        >
          <XStack items="center" gap={6}>
            <YStack
              width={7}
              height={7}
              rounded={round.pill}
              style={{ backgroundColor: voiceStatus === 'connected' ? paint.speaking : paint.sevInk }}
            />
            <YStack flex={1} minW={0}>
              <SizableText fontSize={11.5} fontWeight="700" style={{ color: paint.speaking }} numberOfLines={1}>
                {voiceStatusLabel}
              </SizableText>
              <SizableText fontSize={10.5} style={{ color: paint.mute }} numberOfLines={1}>
                {`${connectedRoom?.name ?? 'Voice Room'}${activeOrg ? ` / ${activeOrg.name}` : ''}`}
              </SizableText>
            </YStack>
          </XStack>
          <XStack gap={4}>
            <VoiceActionBtn
              active={screenSharing}
              label="Share"
              icon={<MonitorUp size={12} color={screenSharing ? paint.speaking : paint.ink} />}
              onPress={toggleScreenShare}
            />
            <VoiceActionBtn
              active={cameraOn}
              label="Video"
              icon={<Video size={12} color={cameraOn ? paint.speaking : paint.ink} />}
              onPress={toggleCameraOn}
            />
            <VoiceActionBtn
              danger
              label="Leave"
              icon={<PhoneOff size={12} color={paint.alert} />}
              onPress={() => void leaveVoiceRoom()}
            />
          </XStack>
        </YStack>
      ) : null}

      {/* 6. Bottom User Dock (52px) */}
      <XStack
        height={52}
        px={8}
        items="center"
        justify="space-between"
        gap={4}
        borderTopWidth={1}
        style={{ backgroundColor: paint.dock, borderTopColor: paint.sidebarRule }}
        data-testid="sidebar-account-org-footer"
      >
        <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen} placement="top-start" allowFlip stayInFrame>
          <Popover.Trigger asChild>
            <XStack
              {...press(() => setUserMenuOpen((v) => !v), 'User profile & status')}
              flex={1}
              minW={0}
              py={4}
              px={5}
              rounded={7}
              items="center"
              gap={8}
              hoverStyle={{ background: paint.rowHover }}
              focusVisibleStyle={ring}
              data-testid="sidebar-account-org-pill"
            >
              <YStack position="relative" shrink={0}>
                <MemberPortrait member={{ name: userName, shortName: userName, avatar: userAvatar, bot: false }} size={28} />
                <YStack
                  position="absolute"
                  b={-1}
                  r={-1}
                  width={8}
                  height={8}
                  rounded={round.pill}
                  borderWidth={1.5}
                  style={{ backgroundColor: state.done, borderColor: paint.dock }}
                />
              </YStack>
              <YStack flex={1} minW={0}>
                <SizableText fontSize={12.5} fontWeight="600" style={{ color: paint.ink }} numberOfLines={1}>
                  {userName}
                </SizableText>
                <SizableText fontSize={10.5} style={{ color: paint.dim }} numberOfLines={1}>
                  {micMuted ? 'Muted' : 'Online'}
                </SizableText>
              </YStack>
            </XStack>
          </Popover.Trigger>

          <Popover.Content
            role="menu"
            borderWidth={1}
            rounded={10}
            p={10}
            width={236}
            style={{ backgroundColor: paint.sidebar, borderColor: paint.paneEdge, zIndex: 100000 }}
          >
            <YStack gap={6}>
              <SizableText fontSize={13} fontWeight="700" style={{ color: paint.ink }}>
                {userName}
              </SizableText>
              {userEmail ? (
                <SizableText fontSize={11} style={{ color: paint.dim }}>
                  {userEmail}
                </SizableText>
              ) : null}
              <Separator borderColor={paint.rule} />
              <XStack
                {...press(() => {
                  setUserMenuOpen(false)
                  openSettingsModal('general')
                }, 'Settings')}
                px={8}
                py={5}
                rounded={6}
                hoverStyle={{ background: paint.rowHover }}
              >
                <SizableText fontSize={12.5} style={{ color: paint.ink }}>
                  Preferences &amp; Node
                </SizableText>
              </XStack>
              <XStack
                {...press(() => {
                  setUserMenuOpen(false)
                  onSignOut()
                }, 'Switch account or sign out')}
                px={8}
                py={5}
                rounded={6}
                hoverStyle={{ background: paint.rowHover }}
              >
                <SizableText fontSize={12.5} style={{ color: paint.mute }}>
                  Switch account (hanzo.id)
                </SizableText>
              </XStack>
            </YStack>
          </Popover.Content>
        </Popover>

        <XStack items="center" gap={2} shrink={0} data-testid="sidebar-user-controls">
          <DockIconBtn label={micMuted ? 'Unmute microphone' : 'Mute microphone'} pressed={micMuted} onPress={toggleVoiceMute} testId="sidebar-mic-toggle">
            {micMuted ? <MicOff size={14} color={paint.alert} /> : <Mic size={14} color={paint.mute} />}
          </DockIconBtn>
          <DockIconBtn label={deafened ? 'Undeafen audio' : 'Deafen audio'} pressed={deafened} onPress={toggleVoiceDeafen} testId="sidebar-deafen-toggle">
            {deafened ? <HeadphoneOff size={14} color={paint.alert} /> : <Headphones size={14} color={paint.mute} />}
          </DockIconBtn>
          <DockIconBtn label="Settings" onPress={() => openSettingsModal('general')} testId="sidebar-settings-trigger">
            <Settings size={14} color={paint.mute} />
          </DockIconBtn>
        </XStack>
      </XStack>
    </YStack>
  )
}
