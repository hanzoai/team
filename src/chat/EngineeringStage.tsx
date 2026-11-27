/**
 * COL 3 — Main Engineering Channel & DM Stage (`#0f0f12`)
 *
 * - `44px` Mattermost-crisp channel header:
 *   `# engineering` | `Core platform, Rust/Go services & Zen 6 rollouts`
 *   Right tools: `📞 Start Huddle`, `📋 Playbook`, `📌 Pinned (4)`, `🧵 Threads (3)`, `👥 Roster`
 * - Interactive Playbook & Pinned drawers
 * - Rich engineering message stream + Mattermost × Hanzo Power Composer
 */
import { ScrollArea, SizableText, XStack, YStack } from '@hanzo/ui'
import {
  Check,
  ClipboardList,
  Hash,
  MessagesSquare,
  PhoneCall,
  Pin,
  Users,
} from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { MemberPortrait } from '~/shell/UnifiedSidebar.tsx'
import { press } from '~/shell/press.ts'
import { chatMaxWidthCssFor, useTeamSettings } from '~/settings/preferences.ts'
import { paint, ring, state } from '~/theme/theme.ts'
import {
  joinVoiceRoom,
  leaveVoiceRoom,
  openThreadPane,
  toggleRosterPane,
  useWorkspace,
} from '~/workspace/store.ts'
import { MessageCard } from './MessageCard.tsx'
import { PowerComposer } from './PowerComposer.tsx'

export function EngineeringStage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    channels,
    messages,
    roster,
    connectedVoiceId,
    rightPaneMode,
  } = useWorkspace()
  const { settings } = useTeamSettings()
  const maxChatWidth = chatMaxWidthCssFor(settings.chatWidth)
  const isCompact = settings.messageDensity === 'compact'

  const [playbookOpen, setPlaybookOpen] = useState(false)
  const [pinsOpen, setPinsOpen] = useState(false)
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({})

  const targetId = id || 'engineering'
  const room =
    channels.find((c) => c.id === targetId || `dm-${c.id}` === targetId) ??
    channels.find((c) => c.id === 'engineering')!

  const isDm = room.kind === 'dm'
  const dmMember = isDm ? roster.find((m) => m.id === room.dmMemberId) : undefined
  const roomMessages = messages.filter((m) => m.roomId === room.id)
  const pinnedMessages = messages.filter((m) => m.pinned)
  const threadParents = messages.filter((m) => m.replies.length > 0)
  const huddleActive = connectedVoiceId !== null

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
              <Hash size={15} color={paint.mute} />
              <SizableText fontSize={14} fontWeight="700" style={{ color: paint.ink }}>
                {room.name}
              </SizableText>
              {room.sevTag ? (
                <XStack
                  px={5}
                  py={1}
                  rounded={4}
                  borderWidth={1}
                  style={{ backgroundColor: paint.sevBg, borderColor: paint.sevEdge }}
                >
                  <SizableText fontSize={10} fontWeight="700" style={{ color: paint.sevInk }}>
                    {room.sevTag}
                  </SizableText>
                </XStack>
              ) : null}
            </XStack>
          )}

          <YStack width={1} height={14} style={{ backgroundColor: paint.rule }} shrink={0} />

          <SizableText fontSize={12} style={{ color: paint.dim }} numberOfLines={1} flex={1}>
            {room.topic}
          </SizableText>
        </XStack>

        {/* Right Header Tools: Start Huddle, Playbook, Pinned (4), Threads (3), Roster */}
        <XStack items="center" gap={5} shrink={0}>
          <HeaderToolPill
            active={huddleActive}
            accent={huddleActive}
            label={huddleActive ? 'In Huddle' : 'Start Huddle'}
            icon={<PhoneCall size={12} color={huddleActive ? paint.speaking : paint.mute} />}
            onPress={() => (huddleActive ? leaveVoiceRoom() : joinVoiceRoom('eng-pairing'))}
            testId="header-huddle-btn"
          />
          <HeaderToolPill
            active={playbookOpen}
            label="Playbook"
            icon={<ClipboardList size={12} color={playbookOpen ? paint.ink : paint.mute} />}
            onPress={() => setPlaybookOpen((v) => !v)}
            testId="header-playbook-btn"
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
              const first = roomMessages.find((m) => m.replies.length > 0) ?? threadParents[0]
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

      {/* Optional Mattermost Playbook Strip */}
      {playbookOpen ? (
        <YStack
          px={18}
          py={10}
          gap={6}
          borderBottomWidth={1}
          style={{ backgroundColor: paint.card, borderBottomColor: paint.rule }}
          data-testid="channel-playbook-drawer"
        >
          <XStack items="center" justify="space-between">
            <SizableText fontSize={12} fontWeight="700" style={{ color: paint.ink }}>
              {`Incident & Release Playbook · #${room.name}`}
            </SizableText>
            <SizableText fontSize={11} style={{ color: paint.dim }}>
              Automated runbook gates
            </SizableText>
          </XStack>
          {(room.playbookSteps ?? [
            { id: 'def-1', label: 'Verify CI unit & E2E gates green', done: true },
            { id: 'def-2', label: 'Sign off release artifact in #engineering', done: false },
          ]).map((st) => {
            const done = checkedSteps[st.id] ?? st.done
            return (
              <XStack
                key={st.id}
                {...press(() => setCheckedSteps((p) => ({ ...p, [st.id]: !done })), st.label)}
                items="center"
                gap={8}
                py={2}
              >
                <YStack
                  width={15}
                  height={15}
                  rounded={4}
                  borderWidth={1}
                  items="center"
                  justify="center"
                  style={{
                    backgroundColor: done ? state.done : 'transparent',
                    borderColor: done ? state.done : paint.dim,
                  }}
                >
                  {done ? <Check size={10} color={paint.ground} /> : null}
                </YStack>
                <SizableText fontSize={12} style={{ color: done ? paint.dim : paint.ink }}>
                  {st.label}
                </SizableText>
              </XStack>
            )
          })}
        </YStack>
      ) : null}

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
          {pinnedMessages.map((pm) => {
            const a = roster.find((r) => r.id === pm.authorId) ?? roster[0]!
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
          })}
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
            <SizableText fontSize={12.5} style={{ color: paint.dim }}>
              {room.topic}
            </SizableText>
          </YStack>

          {roomMessages.length === 0 ? (
            <YStack px={18} py={20}>
              <SizableText fontSize={13} style={{ color: paint.dim }}>
                {`No messages in ${isDm ? room.name : `#${room.name}`} yet — type below or @mention a specialist bot to start.`}
              </SizableText>
            </YStack>
          ) : (
            roomMessages.map((msg) => {
              const author = roster.find((r) => r.id === msg.authorId) ?? roster[0]!
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
