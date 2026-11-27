/**
 * COL 3 — Main Channel & DM Stage
 *
 * Wired directly to `/v1/team/channels`, `/v1/team/channels/:id/messages`,
 * `/v1/team/dms`, and `/v1/meet/*` + LiveKit huddles.
 */
import { Input, ScrollArea, SizableText, XStack, YStack } from '@hanzo/ui'
import {
  Hash,
  Lock,
  MessagesSquare,
  PhoneCall,
  Pin,
  Plus,
  RefreshCw,
  Users,
} from '@hanzogui/lucide-icons-2'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { bareAccount } from '~/data/model.ts'
import { MemberPortrait } from '~/shell/UnifiedSidebar.tsx'
import { press } from '~/shell/press.ts'
import { chatMaxWidthCssFor, useTeamSettings } from '~/settings/preferences.ts'
import { paint, ring } from '~/theme/theme.ts'
import {
  createWorkspaceChannel,
  joinVoiceRoom,
  leaveVoiceRoom,
  loadRoomMessages,
  openDmWithMember,
  openThreadPane,
  setActiveRoomId,
  toggleRosterPane,
  useWorkspace,
  type RosterMember,
} from '~/workspace/store.ts'
import { MessageCard } from './MessageCard.tsx'
import { PowerComposer } from './PowerComposer.tsx'

function resolveMember(roster: readonly RosterMember[], authorId: string): RosterMember {
  const bare = bareAccount(authorId)
  const found = roster.find((r) => r.id === authorId || r.id === bare || bareAccount(r.id) === bare)
  if (found) return found
  const short = bare ? `Member ${bare.slice(0, 6)}` : 'Teammate'
  return {
    id: bare || 'member',
    handle: short.toLowerCase().replace(/\s+/g, '-'),
    name: short,
    shortName: short,
    bot: false,
    activity: '',
    presence: 'offline',
  }
}

export function EngineeringStage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    channels,
    messages,
    roster,
    connectedVoiceId,
    voiceStatus,
    rightPaneMode,
    hydrating,
    hydrateError,
    loadingRooms,
    roomErrors,
  } = useWorkspace()
  const { settings } = useTeamSettings()
  const maxChatWidth = chatMaxWidthCssFor(settings.chatWidth)
  const isCompact = settings.messageDensity === 'compact'

  const [pinsOpen, setPinsOpen] = useState(false)
  const [creatingName, setCreatingName] = useState('')
  const [creatingErr, setCreatingErr] = useState<string | null>(null)
  const [resolvingDm, setResolvingDm] = useState(false)
  const dmOpenedRef = useRef<string | null>(null)

  const isDmShortcut = Boolean(id && (id.startsWith('with-') || id.startsWith('dm-')))

  // Resolve `/chat/with-<uuid>` or `/chat/dm-<handle|uuid>` into a real `/v1/team/dms` channel
  useEffect(() => {
    if (!id || !isDmShortcut || hydrating) return
    if (dmOpenedRef.current === id) return
    dmOpenedRef.current = id
    setResolvingDm(true)
    void openDmWithMember(id)
      .then((dmId) => {
        if (dmId && dmId !== id) {
          navigate(`/chat/${dmId}`, { replace: true })
        }
      })
      .finally(() => setResolvingDm(false))
  }, [id, isDmShortcut, hydrating, navigate])

  const room =
    (id
      ? channels.find((c) => c.id === id || c.name.toLowerCase() === id.toLowerCase())
      : undefined) ??
    channels.find((c) => c.kind === 'channel') ??
    channels[0] ??
    null

  // Track active room & load its real messages from `/v1/team/channels/:id/messages`
  useEffect(() => {
    setActiveRoomId(room?.id ?? null)
    if (room?.id) {
      void loadRoomMessages(room.id)
    }
    return () => setActiveRoomId(null)
  }, [room?.id])

  if (hydrating && channels.length === 0) {
    return (
      <YStack flex={1} items="center" justify="center" p={24} style={{ backgroundColor: paint.panel }} data-testid="engineering-main-stage">
        <SizableText fontSize={13.5} style={{ color: paint.dim }}>
          Connecting to workspace channels…
        </SizableText>
      </YStack>
    )
  }

  if (resolvingDm) {
    return (
      <YStack flex={1} items="center" justify="center" p={24} style={{ backgroundColor: paint.panel }} data-testid="engineering-main-stage">
        <SizableText fontSize={13.5} style={{ color: paint.dim }}>
          Opening direct message…
        </SizableText>
      </YStack>
    )
  }

  if (!room) {
    const submitFirstChannel = async () => {
      const clean = creatingName.trim()
      if (!clean) return
      setCreatingErr(null)
      try {
        const createdId = await createWorkspaceChannel(clean)
        setCreatingName('')
        if (createdId) navigate(`/chat/${createdId}`)
      } catch (err) {
        setCreatingErr(err instanceof Error ? err.message : 'Failed to create channel')
      }
    }

    return (
      <YStack
        flex={1}
        items="center"
        justify="center"
        p={24}
        gap={12}
        style={{ backgroundColor: paint.panel }}
        data-testid="engineering-main-stage"
      >
        <SizableText fontSize={16} fontWeight="700" style={{ color: paint.ink }}>
          {hydrateError ? 'Unable to load workspace channels' : 'No channels in this workspace yet'}
        </SizableText>
        <SizableText fontSize={13} style={{ color: paint.dim, textAlign: 'center', maxWidth: 420 }}>
          {hydrateError || 'Create your first channel to start talking with teammates and workspace bots.'}
        </SizableText>
        <XStack gap={8} items="center" pt={4}>
          <XStack
            px={10}
            py={6}
            rounded={8}
            borderWidth={1}
            items="center"
            gap={6}
            width={220}
            style={{ backgroundColor: paint.composer, borderColor: paint.border }}
          >
            <Hash size={13} color={paint.dim} />
            <Input
              flex={1}
              unstyled
              height={22}
              borderWidth={0}
              bg="transparent"
              fontSize={12.5}
              color={paint.ink}
              placeholder="general"
              value={creatingName}
              onChangeText={setCreatingName}
              onKeyDown={(e: { key?: string; preventDefault?: () => void }) => {
                if (e.key === 'Enter') {
                  e.preventDefault?.()
                  void submitFirstChannel()
                }
              }}
            />
          </XStack>
          <XStack
            {...press(() => void submitFirstChannel(), 'Create channel')}
            height={34}
            px={12}
            rounded={8}
            items="center"
            gap={5}
            style={{ backgroundColor: paint.ink }}
          >
            <Plus size={13} color={paint.ground} />
            <SizableText fontSize={12.5} fontWeight="700" style={{ color: paint.ground }}>
              Create Channel
            </SizableText>
          </XStack>
        </XStack>
        {creatingErr ? (
          <SizableText fontSize={12} style={{ color: paint.alert }}>
            {creatingErr}
          </SizableText>
        ) : null}
      </YStack>
    )
  }

  const isDm = room.kind === 'dm'
  const dmMember = isDm && room.dmMemberId ? roster.find((m) => m.id === room.dmMemberId) : undefined
  const roomMessages = messages.filter((m) => m.roomId === room.id)
  const pinnedMessages = roomMessages.filter((m) => m.pinned)
  const threadParents = roomMessages.filter((m) => m.replyCount > 0 || m.replies.length > 0)
  const huddleActive = connectedVoiceId === room.id && (voiceStatus === 'connected' || voiceStatus === 'connecting')
  const loadingRoom = Boolean(loadingRooms[room.id])
  const roomError = roomErrors[room.id] || ''

  return (
    <YStack flex={1} minW={0} minH={0} style={{ backgroundColor: paint.panel }} data-testid="engineering-main-stage">
      {/* 44px Mattermost-Crisp Channel / DM Header */}
      <XStack
        height={44}
        px={16}
        items="center"
        justify="space-between"
        gap={10}
        borderBottomWidth={1}
        style={{ backgroundColor: paint.panel, borderBottomColor: paint.rule }}
      >
        <XStack items="center" gap={8} flex={1} minW={0}>
          {isDm && dmMember ? (
            <XStack items="center" gap={8} shrink={0}>
              <MemberPortrait member={dmMember} size={22} />
              <SizableText fontSize={14} fontWeight="700" style={{ color: paint.ink }}>
                {dmMember.bot ? `@${dmMember.handle}` : dmMember.name}
              </SizableText>
            </XStack>
          ) : (
            <XStack items="center" gap={5} shrink={0}>
              {room.private ? <Lock size={14} color={paint.mute} /> : <Hash size={15} color={paint.mute} />}
              <SizableText fontSize={14} fontWeight="700" style={{ color: paint.ink }}>
                {room.name}
              </SizableText>
            </XStack>
          )}

          {room.topic ? (
            <>
              <YStack width={1} height={14} style={{ backgroundColor: paint.rule }} shrink={0} />
              <SizableText fontSize={12} style={{ color: paint.dim }} numberOfLines={1} flex={1}>
                {room.topic}
              </SizableText>
            </>
          ) : null}
        </XStack>

        {/* Right Header Tools: Start Huddle, Pinned, Threads, Roster */}
        <XStack items="center" gap={5} shrink={0}>
          <HeaderToolPill
            active={huddleActive}
            accent={huddleActive}
            label={huddleActive ? 'In Huddle' : 'Start Huddle'}
            icon={<PhoneCall size={12} color={huddleActive ? paint.speaking : paint.mute} />}
            onPress={() => void (huddleActive ? leaveVoiceRoom() : joinVoiceRoom(room.id))}
            testId="header-huddle-btn"
          />
          <HeaderToolPill
            active={pinsOpen}
            label={`Pinned (${pinnedMessages.length})`}
            icon={<Pin size={12} color={pinsOpen ? paint.ink : paint.mute} />}
            onPress={() => setPinsOpen((v) => !v)}
            testId="header-pinned-btn"
          />
          <HeaderToolPill
            active={rightPaneMode === 'thread'}
            label={`Threads (${threadParents.length})`}
            icon={<MessagesSquare size={12} color={rightPaneMode === 'thread' ? paint.ink : paint.mute} />}
            onPress={() => {
              const first = threadParents[0]
              if (first) openThreadPane(first.roomId, first.id)
              else navigate('/threads')
            }}
            testId="header-threads-btn"
          />
          <HeaderToolPill
            active={rightPaneMode === 'roster'}
            label="Roster"
            icon={<Users size={12} color={rightPaneMode === 'roster' ? paint.ink : paint.mute} />}
            onPress={toggleRosterPane}
            testId="chat-header-members-trigger"
          />
        </XStack>
      </XStack>

      {/* Optional Pinned Messages Strip */}
      {pinsOpen ? (
        <YStack
          px={18}
          py={10}
          gap={6}
          borderBottomWidth={1}
          style={{ backgroundColor: paint.card, borderBottomColor: paint.rule }}
        >
          <SizableText fontSize={11.5} fontWeight="700" style={{ color: paint.ink }}>
            {`Pinned Messages (${pinnedMessages.length})`}
          </SizableText>
          {pinnedMessages.length === 0 ? (
            <SizableText fontSize={12} style={{ color: paint.dim }}>
              No pinned messages in this channel yet.
            </SizableText>
          ) : (
            pinnedMessages.map((pm) => {
              const a = resolveMember(roster, pm.authorId)
              return (
                <XStack key={pm.id} items="center" gap={8} py={3}>
                  <MemberPortrait member={a} size={18} />
                  <SizableText fontSize={12} fontWeight="600" style={{ color: paint.ink }}>
                    {a.shortName}:
                  </SizableText>
                  <SizableText fontSize={12} style={{ color: paint.mute }} numberOfLines={1} flex={1}>
                    {pm.body.split('\n')[0]}
                  </SizableText>
                </XStack>
              )
            })
          )}
        </YStack>
      ) : null}

      {/* Message Stream */}
      <ScrollArea flex={1} minH={0}>
        <YStack
          py={isCompact ? 6 : 10}
          gap={isCompact ? 0 : 2}
          width="100%"
          style={{ maxWidth: maxChatWidth, marginInline: settings.chatWidth === 'full' ? 0 : 'auto' }}
        >
          {/* Channel Intro Banner */}
          <YStack px={18} pb={10} mb={4} borderBottomWidth={1} style={{ borderBottomColor: paint.rule }} gap={3}>
            <SizableText fontSize={16} fontWeight="700" style={{ color: paint.ink }}>
              {isDm ? room.name : `# ${room.name}`}
            </SizableText>
            {room.topic ? (
              <SizableText fontSize={12.5} style={{ color: paint.dim }}>
                {room.topic}
              </SizableText>
            ) : null}
          </YStack>

          {roomError ? (
            <XStack
              mx={18}
              my={8}
              px={12}
              py={8}
              rounded={8}
              borderWidth={1}
              items="center"
              justify="space-between"
              style={{ backgroundColor: paint.card, borderColor: paint.border }}
            >
              <SizableText fontSize={12.5} style={{ color: paint.alert }}>
                {roomError}
              </SizableText>
              <XStack
                {...press(() => void loadRoomMessages(room.id), 'Retry loading messages')}
                px={8}
                py={4}
                rounded={6}
                borderWidth={1}
                items="center"
                gap={4}
                style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
              >
                <RefreshCw size={11} color={paint.ink} />
                <SizableText fontSize={11.5} fontWeight="600" style={{ color: paint.ink }}>
                  Retry
                </SizableText>
              </XStack>
            </XStack>
          ) : null}

          {loadingRoom && roomMessages.length === 0 ? (
            <YStack px={18} py={20}>
              <SizableText fontSize={13} style={{ color: paint.dim }}>
                Loading messages…
              </SizableText>
            </YStack>
          ) : roomMessages.length === 0 ? (
            <YStack px={18} py={20}>
              <SizableText fontSize={13} style={{ color: paint.dim }}>
                {`No messages in ${isDm ? room.name : `#${room.name}`} yet — type below or @mention a workspace bot to start.`}
              </SizableText>
            </YStack>
          ) : (
            roomMessages.map((msg) => {
              const author = resolveMember(roster, msg.authorId)
              return (
                <MessageCard
                  key={msg.id}
                  message={msg}
                  author={author}
                  roster={roster}
                  roomLabel={isDm ? room.name : `#${room.name}`}
                  density={settings.messageDensity}
                  renderMath={settings.renderMarkdownAndMath}
                />
              )
            })
          )}
        </YStack>
      </ScrollArea>

      {/* Mattermost × Hanzo Power Composer */}
      <PowerComposer roomId={room.id} roomName={room.name} isDm={isDm} />
    </YStack>
  )
}

function HeaderToolPill({
  label,
  icon,
  active,
  accent,
  onPress,
  testId,
}: {
  label: string
  icon: React.ReactNode
  active?: boolean
  accent?: boolean
  onPress: () => void
  testId: string
}) {
  return (
    <XStack
      {...press(onPress, label)}
      height={26}
      px={8}
      rounded={6}
      borderWidth={1}
      items="center"
      gap={5}
      style={{
        backgroundColor: accent ? paint.speakingBg : active ? paint.rowActive : 'transparent',
        borderColor: accent ? paint.voiceEdge : active ? paint.border : paint.rule,
      }}
      hoverStyle={{ background: paint.hover }}
      focusVisibleStyle={ring}
      data-testid={testId}
    >
      {icon}
      <SizableText
        fontSize={11.5}
        fontWeight="500"
        style={{ color: accent ? paint.speaking : active ? paint.ink : paint.mute }}
      >
        {label}
      </SizableText>
    </XStack>
  )
}
