/**
 * COL 2 — Discord × Mattermost Channel, Voice & Workspace Sidebar (`244px`, `#0a0a0c`)
 *
 * - Org Header (`Hanzo ⌄` · `Your organization · 24 agents · 8 humans`, Invite, Org Settings)
 * - Core v8.8 Workspaces (`Home`, `Inbox 4`, `Threads`, `Office`, `Work`, `Spaces`, `Memory`)
 * - `CHANNELS` (`+`) — Mattermost high-density channels (`#general`, `#engineering`, `#incidents` SEV-2, …)
 * - `VOICE & HUDDLES` (`+`) — Discord drop-in voice rooms with live speaking rings + Voice Connected Bar
 * - `DIRECT MESSAGES & AI WORKFORCE` (`+`) — Official `@hanzo/personas` portraits + live status
 * - Bottom User Dock (`52px`, `#060608`) — `Zach Kelling` (`Online`) + Mute, Deafen, Settings
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
  MessagesSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Plus,
  Settings,
  SquareCheck,
  UserPlus,
  Video,
  Volume2,
} from '@hanzogui/lucide-icons-2'
import { useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { openSettingsModal } from '~/settings/SettingsModal.tsx'
import { paint, ring, round, state } from '~/theme/theme.ts'
import {
  clearChannelUnread,
  createWorkspaceChannel,
  joinVoiceRoom,
  leaveVoiceRoom,
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

export function MemberPortrait({
  member,
  size = 24,
  speaking = false,
}: {
  member: Pick<RosterMember, 'name' | 'shortName' | 'avatar' | 'bot'>
  size?: number
  speaking?: boolean
}) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <YStack
      width={size}
      height={size}
      rounded={round.pill}
      overflow="hidden"
      items="center"
      justify="center"
      shrink={0}
      borderWidth={speaking ? 2 : 1}
      style={{
        backgroundColor: paint.avatar,
        borderColor: speaking ? paint.speaking : paint.border,
      }}
    >
      {member.avatar && !imgErr ? (
        <img
          src={member.avatar}
          alt={member.name}
          width={size}
          height={size}
          onError={() => setImgErr(true)}
          style={{ width: size, height: size, objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <SizableText fontSize={Math.max(9, Math.round(size * 0.4))} fontWeight="700" style={{ color: paint.avatarInk }}>
          {member.shortName.slice(0, 2).toUpperCase()}
        </SizableText>
      )}
    </YStack>
  )
}

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
    channels,
    voiceRooms,
    connectedVoiceId,
    micMuted,
    deafened,
    screenSharing,
    cameraOn,
    roster,
    attention,
  } = useWorkspace()

  const [orgMenuOpen, setOrgMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [creatingCh, setCreatingCh] = useState(false)
  const [newChName, setNewChName] = useState('')

  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? orgs[0]!
  const inboxCount = Math.max(4, attention.filter((a) => !a.resolved).length + 1)
  const publicChannels = channels.filter((c) => c.kind === 'channel')
  const connectedRoom = voiceRooms.find((r) => r.id === connectedVoiceId) ?? null
  const sidebarDms = ['vi', 'dev', 'mana', 'cyber', 'alex', 'sara']
    .map((id) => roster.find((m) => m.id === id))
    .filter((m): m is RosterMember => Boolean(m))

  const submitChannel = () => {
    const slug = createWorkspaceChannel(newChName)
    setNewChName('')
    setCreatingCh(false)
    if (slug) navigate(`/chat/${slug}`)
  }

  return (
    <YStack
      flex={1}
      minH={0}
      borderRightWidth={1}
      style={{ backgroundColor: paint.sidebar, borderRightColor: paint.sidebarRule }}
      data-testid="team-left-sidebar"
    >
      {/* 1. Organization Header (`Hanzo ⌄` · `Your organization`) */}
      <Popover open={orgMenuOpen} onOpenChange={setOrgMenuOpen} placement="bottom-start" allowFlip stayInFrame>
        <Popover.Trigger asChild>
          <XStack
            {...press(() => setOrgMenuOpen((v) => !v), `${activeOrg.name} organization menu`)}
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
                  {activeOrg.name}
                </SizableText>
                <ChevronDown size={13} color={paint.dim} />
              </XStack>
              <SizableText fontSize={11} style={{ color: paint.dim }} numberOfLines={1}>
                {`Your organization · ${activeOrg.agentsCount} agents · ${activeOrg.humansCount} humans`}
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
              ORGANIZATIONS (X-ORG-ID)
            </SizableText>
            {orgs.map((o) => {
              const active = o.id === activeOrg.id
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
            })}
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
          {/* 2. Core v8.8 Workspaces */}
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
              badge={String(inboxCount)}
              icon={<InboxIcon size={14} color={pathname === '/inbox' ? paint.ink : paint.mute} />}
              active={pathname === '/inbox'}
              onPress={() => navigate('/inbox')}
              testId="nav-ws-inbox"
            />
            <WorkspaceNavItem
              label="Threads"
              badge="3"
              icon={<MessagesSquare size={14} color={pathname === '/threads' ? paint.ink : paint.mute} />}
              active={pathname === '/threads'}
              onPress={() => navigate('/threads')}
              testId="nav-ws-threads"
            />
            <WorkspaceNavItem
              label="Office"
              liveDot
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
              onAdd={() => setCreatingCh((v) => !v)}
              addLabel="Create channel"
            />
            {creatingCh ? (
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
                      submitChannel()
                    } else if (e.key === 'Escape') {
                      setCreatingCh(false)
                    }
                  }}
                />
              </XStack>
            ) : null}

            {publicChannels.map((ch) => {
              const target = `/chat/${ch.id}`
              const active = pathname === target || (pathname === '/chat' && ch.id === 'engineering')
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
                  {hasUnread && !active ? (
                    <YStack
                      position="absolute"
                      l={1}
                      width={4}
                      height={4}
                      rounded={round.pill}
                      style={{ backgroundColor: paint.ink }}
                    />
                  ) : null}
                  <XStack items="center" gap={6} flex={1} minW={0}>
                    <Hash size={13} color={active || hasUnread ? paint.ink : paint.dim} />
                    <SizableText
                      fontSize={13}
                      fontWeight={active || hasUnread ? '600' : '400'}
                      style={{ color: active || hasUnread ? paint.ink : paint.mute }}
                      numberOfLines={1}
                    >
                      {ch.name}
                    </SizableText>
                  </XStack>
                  {ch.sevTag ? (
                    <XStack
                      px={5}
                      py={1}
                      rounded={4}
                      borderWidth={1}
                      style={{ backgroundColor: paint.sevBg, borderColor: paint.sevEdge }}
                    >
                      <SizableText fontSize={9.5} fontWeight="700" style={{ color: paint.sevInk }}>
                        {ch.sevTag}
                      </SizableText>
                    </XStack>
                  ) : hasUnread ? (
                    <YStack width={6} height={6} rounded={round.pill} style={{ backgroundColor: paint.ink }} />
                  ) : null}
                </XStack>
              )
            })}
          </YStack>

          {/* 4. VOICE & HUDDLES (+) */}
          <YStack gap={3}>
            <SectionHead
              label="VOICE & HUDDLES"
              onAdd={() => joinVoiceRoom('eng-pairing')}
              addLabel="Start huddle"
            />
            {voiceRooms.map((vr) => {
              const joined = vr.id === connectedVoiceId
              return (
                <YStack key={vr.id} gap={2}>
                  <XStack
                    {...press(
                      () => (joined ? leaveVoiceRoom() : joinVoiceRoom(vr.id)),
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

                  {/* Live Connected Avatars Indented Right Below Voice Channel */}
                  {vr.participants.length > 0 ? (
                    <YStack pl={20} pr={4} gap={2}>
                      {vr.participants.map((part) => {
                        const member = roster.find((m) => m.id === part.memberId)
                        if (!member) return null
                        return (
                          <XStack
                            key={part.memberId}
                            {...press(() => navigate(member.bot ? `/chat/dm-${member.handle}` : `/chat/dm-${member.id}`), member.name)}
                            height={24}
                            px={6}
                            rounded={5}
                            items="center"
                            justify="space-between"
                            gap={6}
                            hoverStyle={{ background: paint.rowHover }}
                          >
                            <XStack items="center" gap={6} flex={1} minW={0}>
                              <MemberPortrait member={member} size={18} speaking={Boolean(part.speaking)} />
                              <SizableText
                                fontSize={12}
                                fontWeight={part.speaking ? '600' : '400'}
                                style={{ color: part.speaking ? paint.ink : paint.mute }}
                                numberOfLines={1}
                              >
                                {member.bot ? `@${member.handle}` : member.shortName}
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
          </YStack>

          {/* 5. DIRECT MESSAGES & AI WORKFORCE (+) */}
          <YStack gap={2}>
            <SectionHead
              label="DIRECT MESSAGES & AI"
              onAdd={() => navigate('/office')}
              addLabel="Open workforce directory"
            />
            {sidebarDms.map((m) => {
              const dmPath = `/chat/dm-${m.id}`
              const active = pathname === dmPath
              return (
                <XStack
                  key={m.id}
                  {...press(() => navigate(dmPath), `Message ${m.name}`)}
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
                        backgroundColor: m.presence === 'gated' ? paint.sevInk : state.done,
                        borderColor: paint.sidebar,
                      }}
                    />
                  </YStack>
                  <YStack flex={1} minW={0}>
                    <SizableText
                      fontSize={12.5}
                      fontWeight={active ? '600' : '500'}
                      style={{ color: active ? paint.ink : paint.fg }}
                      numberOfLines={1}
                    >
                      {m.bot ? `@${m.handle}` : m.shortName}
                    </SizableText>
                    <SizableText fontSize={10.5} style={{ color: paint.dim }} numberOfLines={1}>
                      {m.activity}
                    </SizableText>
                  </YStack>
                </XStack>
              )
            })}
          </YStack>
        </YStack>
      </ScrollArea>

      {/* Discord Voice Connected Bar (mounted right above User Dock when joined) */}
      {connectedRoom ? (
        <YStack
          px={10}
          py={7}
          gap={6}
          borderTopWidth={1}
          style={{
            backgroundColor: paint.voiceBg,
            borderTopColor: paint.voiceEdge,
          }}
          data-testid="discord-voice-connected-bar"
        >
          <XStack items="center" justify="space-between" gap={6}>
            <XStack items="center" gap={6} flex={1} minW={0}>
              <YStack width={7} height={7} rounded={round.pill} style={{ backgroundColor: paint.speaking }} />
              <YStack flex={1} minW={0}>
                <SizableText fontSize={11.5} fontWeight="700" style={{ color: paint.speaking }} numberOfLines={1}>
                  {`Voice Connected · ${connectedRoom.latencyMs}ms`}
                </SizableText>
                <SizableText fontSize={10.5} style={{ color: paint.mute }} numberOfLines={1}>
                  {`${connectedRoom.name} / ${activeOrg.name}`}
                </SizableText>
              </YStack>
            </XStack>
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
              onPress={leaveVoiceRoom}
            />
          </XStack>
        </YStack>
      ) : null}

      {/* 6. Discord-Style Bottom User Dock (52px) */}
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
                <MemberPortrait
                  member={{
                    name: userName,
                    shortName: userName,
                    avatar: userAvatar || '/agents/zach.jpg',
                    bot: false,
                  }}
                  size={28}
                />
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
              <SizableText fontSize={11} style={{ color: paint.dim }}>
                {`${userEmail || 'zach@hanzo.ai'} · hanzo.id`}
              </SizableText>
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
          <DockIconBtn
            label={micMuted ? 'Unmute microphone' : 'Mute microphone'}
            pressed={micMuted}
            onPress={toggleVoiceMute}
            testId="sidebar-mic-toggle"
          >
            {micMuted ? <MicOff size={14} color={paint.alert} /> : <Mic size={14} color={paint.mute} />}
          </DockIconBtn>
          <DockIconBtn
            label={deafened ? 'Undeafen audio' : 'Deafen audio'}
            pressed={deafened}
            onPress={toggleVoiceDeafen}
            testId="sidebar-deafen-toggle"
          >
            {deafened ? <HeadphoneOff size={14} color={paint.alert} /> : <Headphones size={14} color={paint.mute} />}
          </DockIconBtn>
          <DockIconBtn
            label="Settings"
            onPress={() => openSettingsModal('general')}
            testId="sidebar-settings-trigger"
          >
            <Settings size={14} color={paint.mute} />
          </DockIconBtn>
        </XStack>
      </XStack>
    </YStack>
  )
}

function WorkspaceNavItem({
  label,
  badge,
  liveDot,
  icon,
  active,
  onPress,
  testId,
}: {
  label: string
  badge?: string
  liveDot?: boolean
  icon: ReactNode
  active: boolean
  onPress: () => void
  testId: string
}) {
  return (
    <XStack
      {...press(onPress, label)}
      height={28}
      px={8}
      rounded={7}
      items="center"
      justify="space-between"
      gap={8}
      style={active ? { backgroundColor: paint.rowActive } : undefined}
      hoverStyle={active ? undefined : { background: paint.rowHover }}
      focusVisibleStyle={ring}
      data-testid={testId}
    >
      <XStack items="center" gap={8} flex={1} minW={0}>
        {icon}
        <SizableText
          fontSize={13}
          fontWeight={active ? '600' : '400'}
          style={{ color: active ? paint.ink : paint.mute }}
          numberOfLines={1}
        >
          {label}
        </SizableText>
      </XStack>
      {badge ? (
        <SizableText fontSize={11.5} fontWeight="600" style={{ color: active ? paint.ink : paint.dim }}>
          {badge}
        </SizableText>
      ) : liveDot ? (
        <YStack width={6} height={6} rounded={round.pill} style={{ backgroundColor: paint.speaking }} />
      ) : null}
    </XStack>
  )
}

function SectionHead({
  label,
  onAdd,
  addLabel,
}: {
  label: string
  onAdd: () => void
  addLabel: string
}) {
  return (
    <XStack px={8} pt={4} pb={2} items="center" justify="space-between">
      <SizableText fontSize={10.5} fontWeight="700" style={{ color: paint.dim, letterSpacing: 0.6 }}>
        {label}
      </SizableText>
      <XStack
        {...press(onAdd, addLabel)}
        width={18}
        height={18}
        rounded={4}
        items="center"
        justify="center"
        hoverStyle={{ background: paint.rowHover }}
      >
        <Plus size={12} color={paint.dim} />
      </XStack>
    </XStack>
  )
}

function VoiceActionBtn({
  label,
  icon,
  active,
  danger,
  onPress,
}: {
  label: string
  icon: ReactNode
  active?: boolean
  danger?: boolean
  onPress: () => void
}) {
  return (
    <XStack
      {...press(onPress, label)}
      flex={1}
      height={24}
      px={5}
      rounded={5}
      borderWidth={1}
      items="center"
      justify="center"
      gap={4}
      style={{
        backgroundColor: active ? paint.speakingBg : paint.panel,
        borderColor: active ? paint.voiceEdge : paint.border,
      }}
      hoverStyle={{ background: paint.hover }}
    >
      {icon}
      <SizableText
        fontSize={10.5}
        fontWeight="600"
        style={{ color: danger ? paint.alert : active ? paint.speaking : paint.ink }}
      >
        {label}
      </SizableText>
    </XStack>
  )
}

function DockIconBtn({
  label,
  pressed,
  onPress,
  testId,
  children,
}: {
  label: string
  pressed?: boolean
  onPress: () => void
  testId: string
  children: ReactNode
}) {
  return (
    <XStack
      {...press(onPress, label)}
      aria-pressed={pressed}
      width={28}
      height={28}
      rounded={6}
      items="center"
      justify="center"
      hoverStyle={{ background: paint.rowHover }}
      focusVisibleStyle={ring}
      data-testid={testId}
    >
      {children}
    </XStack>
  )
}
