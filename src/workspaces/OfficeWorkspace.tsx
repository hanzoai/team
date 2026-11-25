/**
 * Roam-Inspired Virtual Office Bento HQ + Multi-Floor Skyscraper Elevator (`/office`)
 *
 * Matches `uploaded_media_2_1795584722435.jpg` & `uploaded_media_3_1795584722435.jpg`:
 * - Interactive Bento Floor Map: Individual & Pair Desks, `Theater` All-Hands Stage + audience
 *   seating dots, `Meeting Room` (`Eng Pairing`), and `Ship Velocity Leaderboard`
 * - Click any human or specialist head to `Wave 👋`, `Knock 🚪`, or `Chat 💬`
 * - Right 268px Multi-Floor Skyscraper Elevator (`F4 Executive · F3 Engineering · F2 Research · F1 GTM`)
 * - Bottom Floating Roam Presence & Voice Control Bar
 */
import { Popover } from '@hanzo/gui'
import { ScrollArea, SizableText, XStack, YStack } from '@hanzo/ui'
import {
  Building2,
  DoorOpen,
  Hand,
  MessageCircle,
  Mic,
  MicOff,
  MonitorUp,
  Trophy,
  Video,
} from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { MemberPortrait } from '~/shell/UnifiedSidebar.tsx'
import { press } from '~/shell/press.ts'
import { paint, ring, round } from '~/theme/theme.ts'
import {
  joinVoiceRoom,
  leaveVoiceRoom,
  OFFICE_DESKS,
  selectOfficeFloor,
  toggleScreenShare,
  toggleVoiceMute,
  triggerOfficeInteraction,
  useWorkspace,
  type RosterMember,
} from '~/workspace/store.ts'

const FLOORS = [
  { id: 'F4' as const, name: 'F4 · Executive & Ops', dept: 'Exec & Security' },
  { id: 'F3' as const, name: 'F3 · R&D & Engineering', dept: 'R&D' },
  { id: 'F2' as const, name: 'F2 · Research & Science', dept: 'Science' },
  { id: 'F1' as const, name: 'F1 · Commercial & GTM', dept: 'Commercial' },
]

export function OfficeWorkspace() {
  const navigate = useNavigate()
  const {
    roster,
    selectedFloor,
    officeBanner,
    connectedVoiceId,
    micMuted,
    screenSharing,
  } = useWorkspace()

  const visibleDesks =
    selectedFloor === 'ALL'
      ? OFFICE_DESKS
      : OFFICE_DESKS.filter((d) => d.floor === selectedFloor)

  const theaterSpeakers = ['zach', 'vi', 'mana']
    .map((id) => roster.find((m) => m.id === id))
    .filter((m): m is RosterMember => Boolean(m))

  const meetingPeople = ['zach', 'dev', 'alex']
    .map((id) => roster.find((m) => m.id === id))
    .filter((m): m is RosterMember => Boolean(m))

  const topShippers = [
    { rank: '1', member: roster.find((m) => m.id === 'dev')!, stat: '14 PRs merged' },
    { rank: '2', member: roster.find((m) => m.id === 'zach')!, stat: '9 releases' },
    { rank: '3', member: roster.find((m) => m.id === 'sci')!, stat: '6 eval sweeps' },
  ]

  return (
    <XStack flex={1} minW={0} minH={0} style={{ backgroundColor: paint.panel }} data-testid="office-roam-workspace">
      {/* LEFT / MAIN: Bento Virtual HQ Map + Floating Bottom Dock */}
      <YStack flex={1} minW={0} minH={0} position="relative">
        {/* 44px Header */}
        <XStack
          height={44}
          px={18}
          items="center"
          justify="space-between"
          gap={10}
          borderBottomWidth={1}
          style={{ borderBottomColor: paint.rule }}
        >
          <XStack items="center" gap={8}>
            <Building2 size={15} color={paint.ink} />
            <SizableText fontSize={14} fontWeight="700" style={{ color: paint.ink }}>
              Virtual HQ · Hanzo Tower
            </SizableText>
            <YStack width={1} height={13} style={{ backgroundColor: paint.rule }} />
            <SizableText fontSize={12} style={{ color: paint.dim }}>
              Click any teammate or bot head to wave, knock, or chat
            </SizableText>
          </XStack>

          {/* Floor Filter Pills */}
          <XStack items="center" gap={4}>
            {(['ALL', 'F4', 'F3', 'F2', 'F1'] as const).map((fl) => {
              const active = selectedFloor === fl
              return (
                <XStack
                  key={fl}
                  {...press(() => selectOfficeFloor(fl), `Floor ${fl}`)}
                  height={24}
                  px={9}
                  rounded={6}
                  borderWidth={1}
                  items="center"
                  style={{
                    backgroundColor: active ? paint.rowActive : 'transparent',
                    borderColor: active ? paint.border : paint.rule,
                  }}
                  hoverStyle={{ background: paint.hover }}
                >
                  <SizableText fontSize={11} fontWeight={active ? '700' : '500'} style={{ color: active ? paint.ink : paint.mute }}>
                    {fl === 'ALL' ? 'All Floors' : fl}
                  </SizableText>
                </XStack>
              )
            })}
          </XStack>
        </XStack>

        {officeBanner ? (
          <XStack
            px={18}
            py={6}
            items="center"
            justify="space-between"
            borderBottomWidth={1}
            style={{ backgroundColor: paint.voiceBg, borderBottomColor: paint.voiceEdge }}
          >
            <SizableText fontSize={12} fontWeight="600" style={{ color: paint.speaking }}>
              {officeBanner.text}
            </SizableText>
          </XStack>
        ) : null}

        <ScrollArea flex={1} minH={0}>
          <YStack p={16} pb={76} gap={12}>
            {/* Row 1: Individual & Pair Desks (Roam Bento Top Grid) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
                gap: 10,
              }}
            >
              {visibleDesks.slice(0, 6).map((desk) => (
                <DeskTileCard
                  key={desk.id}
                  label={desk.label}
                  floor={desk.floor}
                  toolTag={desk.toolTag}
                  activeRing={desk.activeRing}
                  statusLine={desk.statusLine}
                  members={desk.occupants
                    .map((id) => roster.find((r) => r.id === id))
                    .filter((m): m is RosterMember => Boolean(m))}
                  onChat={(m) => navigate(`/chat/dm-${m.id}`)}
                />
              ))}
            </div>

            {/* Row 2: Central Roam Bento Feature Rooms (`Theater` + `Meeting Room` + `Ship Leaderboard`) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(270px, 1.35fr) minmax(220px, 1fr) minmax(220px, 1fr)',
                gap: 10,
              }}
            >
              {/* THEATER ALL-HANDS STAGE */}
              <YStack
                p={14}
                rounded={12}
                borderWidth={1}
                gap={12}
                style={{ backgroundColor: paint.card, borderColor: paint.border }}
                data-testid="office-theater-room"
              >
                <XStack items="center" justify="space-between">
                  <SizableText fontSize={13} fontWeight="700" style={{ color: paint.ink }}>
                    Theater
                  </SizableText>
                  <XStack
                    {...press(() => joinVoiceRoom('all-hands'), 'Join Theater Stage')}
                    px={8}
                    py={2.5}
                    rounded={5}
                    borderWidth={1}
                    style={{
                      backgroundColor: connectedVoiceId === 'all-hands' ? paint.speakingBg : paint.elevated,
                      borderColor: connectedVoiceId === 'all-hands' ? paint.voiceEdge : paint.border,
                    }}
                  >
                    <SizableText
                      fontSize={10.5}
                      fontWeight="600"
                      style={{ color: connectedVoiceId === 'all-hands' ? paint.speaking : paint.mute }}
                    >
                      {connectedVoiceId === 'all-hands' ? 'On Stage' : 'Take Stage'}
                    </SizableText>
                  </XStack>
                </XStack>

                {/* Speaker Podium */}
                <XStack
                  py={12}
                  px={10}
                  rounded={10}
                  items="center"
                  justify="center"
                  gap={14}
                  style={{ backgroundColor: paint.elevated }}
                >
                  {theaterSpeakers.map((sp) => (
                    <InteractiveHead
                      key={sp.id}
                      member={sp}
                      size={44}
                      speaking={sp.id === 'vi'}
                      onChat={() => navigate(`/chat/dm-${sp.id}`)}
                    />
                  ))}
                </XStack>

                {/* Audience Seating Dots (Roam signature theater rows) */}
                <YStack gap={5} pt={2}>
                  {[0, 1, 2].map((row) => (
                    <XStack key={row} items="center" justify="space-between" gap={6}>
                      {[3, 4, 2, 3, 4].map((dots, col) => (
                        <XStack
                          key={col}
                          flex={1}
                          height={12}
                          rounded={6}
                          items="center"
                          justify="center"
                          gap={3}
                          style={{ backgroundColor: paint.surface }}
                        >
                          {Array.from({ length: dots }).map((_, d) => (
                            <YStack
                              key={d}
                              width={2.5}
                              height={2.5}
                              rounded={round.pill}
                              style={{ backgroundColor: paint.dim }}
                            />
                          ))}
                        </XStack>
                      ))}
                    </XStack>
                  ))}
                </YStack>
              </YStack>

              {/* MEETING ROOM (`Eng Pairing`) */}
              <YStack
                p={14}
                rounded={12}
                borderWidth={1}
                justify="space-between"
                gap={12}
                style={{
                  backgroundColor: paint.card,
                  borderColor: connectedVoiceId === 'eng-pairing' ? paint.voiceEdge : paint.border,
                }}
                data-testid="office-meeting-room"
              >
                <XStack items="center" justify="space-between">
                  <YStack>
                    <SizableText fontSize={13} fontWeight="700" style={{ color: paint.ink }}>
                      Meeting Room
                    </SizableText>
                    <SizableText fontSize={11} style={{ color: paint.speaking }}>
                      Eng Pairing · Live 14ms
                    </SizableText>
                  </YStack>
                  <Video size={14} color={paint.mute} />
                </XStack>

                <XStack items="center" gap={10} py={8}>
                  {meetingPeople.map((mp) => (
                    <InteractiveHead
                      key={mp.id}
                      member={mp}
                      size={42}
                      speaking={mp.id === 'dev'}
                      onChat={() => navigate(`/chat/dm-${mp.id}`)}
                    />
                  ))}
                </XStack>

                <XStack
                  {...press(
                    () => (connectedVoiceId === 'eng-pairing' ? leaveVoiceRoom() : joinVoiceRoom('eng-pairing')),
                    'Toggle Meeting Room',
                  )}
                  py={6}
                  rounded={7}
                  borderWidth={1}
                  items="center"
                  justify="center"
                  style={{
                    backgroundColor: connectedVoiceId === 'eng-pairing' ? paint.speakingBg : paint.elevated,
                    borderColor: connectedVoiceId === 'eng-pairing' ? paint.voiceEdge : paint.border,
                  }}
                >
                  <SizableText
                    fontSize={11.5}
                    fontWeight="600"
                    style={{ color: connectedVoiceId === 'eng-pairing' ? paint.speaking : paint.ink }}
                  >
                    {connectedVoiceId === 'eng-pairing' ? 'Connected · Leave Room' : 'Drop In Instantly'}
                  </SizableText>
                </XStack>
              </YStack>

              {/* SHIP VELOCITY LEADERBOARD (Roam Game/Velocity Room) */}
              <YStack
                p={14}
                rounded={12}
                borderWidth={1}
                justify="space-between"
                gap={10}
                style={{ backgroundColor: paint.card, borderColor: paint.border }}
              >
                <XStack items="center" justify="space-between">
                  <SizableText fontSize={13} fontWeight="700" style={{ color: paint.ink }}>
                    Velocity Lounge
                  </SizableText>
                  <Trophy size={14} color={paint.sevInk} />
                </XStack>

                <XStack
                  py={10}
                  px={8}
                  rounded={10}
                  items="center"
                  justify="space-around"
                  style={{ backgroundColor: paint.elevated }}
                >
                  {topShippers.map((ts) => (
                    <YStack key={ts.rank} items="center" gap={4}>
                      <InteractiveHead
                        member={ts.member}
                        size={38}
                        onChat={() => navigate(`/chat/dm-${ts.member.id}`)}
                      />
                      <XStack px={6} py={1} rounded={8} style={{ backgroundColor: paint.surface }}>
                        <SizableText fontSize={10} fontWeight="700" style={{ color: paint.sevInk }}>
                          {`#${ts.rank}`}
                        </SizableText>
                      </XStack>
                    </YStack>
                  ))}
                </XStack>

                <XStack
                  {...press(() => navigate('/issues'), 'Open Work Leaderboard')}
                  items="center"
                  justify="space-between"
                >
                  <SizableText fontSize={11.5} style={{ color: paint.dim }}>
                    Sprint Leaderboard ›
                  </SizableText>
                  <SizableText fontSize={11} style={{ color: paint.mute, fontFamily: 'var(--font-mono)' }}>
                    29 shipped
                  </SizableText>
                </XStack>
              </YStack>
            </div>

            {/* Row 3: Remaining Desks */}
            {visibleDesks.length > 6 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
                  gap: 10,
                }}
              >
                {visibleDesks.slice(6).map((desk) => (
                  <DeskTileCard
                    key={desk.id}
                    label={desk.label}
                    floor={desk.floor}
                    toolTag={desk.toolTag}
                    activeRing={desk.activeRing}
                    statusLine={desk.statusLine}
                    members={desk.occupants
                      .map((id) => roster.find((r) => r.id === id))
                      .filter((m): m is RosterMember => Boolean(m))}
                    onChat={(m) => navigate(`/chat/dm-${m.id}`)}
                  />
                ))}
              </div>
            ) : null}
          </YStack>
        </ScrollArea>

        {/* Bottom Floating Roam Presence & Quick Controls Bar */}
        <XStack
          position="absolute"
          b={14}
          l={0}
          r={0}
          items="center"
          justify="center"
          pointerEvents="box-none"
        >
          <XStack
            px={12}
            py={6}
            gap={10}
            rounded={20}
            borderWidth={1}
            items="center"
            style={{ backgroundColor: paint.sidebar, borderColor: paint.border }}
          >
            <XStack
              {...press(() => (connectedVoiceId ? leaveVoiceRoom() : joinVoiceRoom('eng-pairing')), 'Door / Room')}
              width={28}
              height={28}
              rounded={14}
              items="center"
              justify="center"
              hoverStyle={{ background: paint.hover }}
            >
              <DoorOpen size={14} color={connectedVoiceId ? paint.speaking : paint.mute} />
            </XStack>
            <XStack
              {...press(toggleVoiceMute, 'Toggle Mic')}
              width={28}
              height={28}
              rounded={14}
              items="center"
              justify="center"
              hoverStyle={{ background: paint.hover }}
            >
              {micMuted ? <MicOff size={14} color={paint.alert} /> : <Mic size={14} color={paint.ink} />}
            </XStack>
            <XStack
              {...press(toggleScreenShare, 'Share Screen')}
              width={28}
              height={28}
              rounded={14}
              items="center"
              justify="center"
              hoverStyle={{ background: paint.hover }}
            >
              <MonitorUp size={14} color={screenSharing ? paint.speaking : paint.mute} />
            </XStack>
            <XStack
              {...press(() => triggerOfficeInteraction('Engineering Floor', 'wave'), 'Wave to floor')}
              width={28}
              height={28}
              rounded={14}
              items="center"
              justify="center"
              hoverStyle={{ background: paint.hover }}
            >
              <Hand size={14} color={paint.sevInk} />
            </XStack>
          </XStack>
        </XStack>
      </YStack>

      {/* RIGHT COLUMN: Multi-Floor Skyscraper Elevator (`uploaded_media_3_1795584722435.jpg`) */}
      <YStack
        width={268}
        shrink={0}
        minH={0}
        borderLeftWidth={1}
        style={{ backgroundColor: paint.aside, borderLeftColor: paint.sidebarRule }}
        data-testid="office-skyscraper-elevator"
      >
        <XStack
          height={44}
          px={14}
          items="center"
          justify="space-between"
          borderBottomWidth={1}
          style={{ borderBottomColor: paint.rule }}
        >
          <SizableText fontSize={12.5} fontWeight="700" style={{ color: paint.ink }}>
            Elevator · 4 Floors
          </SizableText>
          <SizableText fontSize={11} style={{ color: paint.dim }}>
            Skyscraper View
          </SizableText>
        </XStack>

        <ScrollArea flex={1} minH={0}>
          <YStack p={10} gap={10}>
            {FLOORS.map((fl) => {
              const desksOnFloor = OFFICE_DESKS.filter((d) => d.floor === fl.id)
              const selected = selectedFloor === fl.id
              return (
                <YStack
                  key={fl.id}
                  {...press(
                    () => selectOfficeFloor(selected ? 'ALL' : fl.id),
                    `Focus ${fl.name}`,
                  )}
                  p={10}
                  gap={8}
                  rounded={10}
                  borderWidth={1}
                  style={{
                    backgroundColor: selected ? paint.elevated : paint.card,
                    borderColor: selected ? paint.ink : paint.border,
                  }}
                  hoverStyle={{ background: paint.elevated }}
                  focusVisibleStyle={ring}
                  data-testid={`elevator-floor-${fl.id}`}
                >
                  <XStack items="center" justify="space-between">
                    <SizableText fontSize={12} fontWeight="700" style={{ color: paint.ink }}>
                      {fl.dept}
                    </SizableText>
                    <SizableText fontSize={10.5} fontWeight="600" style={{ color: paint.dim, fontFamily: 'var(--font-mono)' }}>
                      {fl.id}
                    </SizableText>
                  </XStack>

                  {/* Miniature Floor Grid with Live Occupant Heads */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: 5,
                    }}
                  >
                    {desksOnFloor.map((d) => (
                      <XStack
                        key={d.id}
                        p={5}
                        minH={32}
                        rounded={6}
                        borderWidth={1}
                        items="center"
                        justify="center"
                        gap={3}
                        style={{ backgroundColor: paint.surface, borderColor: paint.rule }}
                      >
                        {d.occupants.map((occId) => {
                          const m = roster.find((r) => r.id === occId)
                          if (!m) return null
                          return <MemberPortrait key={occId} member={m} size={18} speaking={Boolean(m.speaking)} />
                        })}
                      </XStack>
                    ))}
                  </div>
                </YStack>
              )
            })}
          </YStack>
        </ScrollArea>
      </YStack>
    </XStack>
  )
}

function DeskTileCard({
  label,
  floor,
  toolTag,
  activeRing,
  statusLine,
  members,
  onChat,
}: {
  label: string
  floor: string
  toolTag?: string
  activeRing?: 'emerald' | 'warm' | 'subtle'
  statusLine?: string
  members: RosterMember[]
  onChat: (m: RosterMember) => void
}) {
  const borderCol =
    activeRing === 'emerald'
      ? paint.voiceEdge
      : activeRing === 'warm'
        ? paint.sevEdge
        : activeRing === 'subtle'
          ? paint.roomGlow
          : paint.border

  return (
    <YStack
      p={11}
      minH={104}
      rounded={11}
      borderWidth={1}
      justify="space-between"
      gap={8}
      style={{ backgroundColor: paint.card, borderColor: borderCol }}
    >
      <XStack items="center" justify="space-between" gap={4}>
        <SizableText fontSize={12} fontWeight="600" style={{ color: paint.ink }} numberOfLines={1} flex={1}>
          {label}
        </SizableText>
        {toolTag ? (
          <XStack px={5} py={1} rounded={4} style={{ backgroundColor: paint.elevated }}>
            <SizableText fontSize={9.5} fontWeight="600" style={{ color: paint.mute }}>
              {toolTag}
            </SizableText>
          </XStack>
        ) : (
          <SizableText fontSize={9.5} style={{ color: paint.dim }}>
            {floor}
          </SizableText>
        )}
      </XStack>

      <XStack items="center" gap={8}>
        {members.map((m) => (
          <InteractiveHead
            key={m.id}
            member={m}
            size={36}
            speaking={Boolean(m.speaking)}
            onChat={() => onChat(m)}
          />
        ))}
      </XStack>

      {statusLine ? (
        <SizableText fontSize={10.5} style={{ color: paint.dim }} numberOfLines={1}>
          {statusLine}
        </SizableText>
      ) : null}
    </YStack>
  )
}

function InteractiveHead({
  member,
  size,
  speaking,
  onChat,
}: {
  member: RosterMember
  size: number
  speaking?: boolean
  onChat: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen} placement="top" allowFlip stayInFrame>
      <Popover.Trigger asChild>
        <YStack
          {...press(() => setOpen((v) => !v), `${member.name} — Wave, Knock, or Chat`)}
          rounded={round.pill}
          focusVisibleStyle={ring}
          data-testid={`office-head-${member.id}`}
        >
          <MemberPortrait member={member} size={size} speaking={speaking} />
        </YStack>
      </Popover.Trigger>
      <Popover.Content
        role="menu"
        borderWidth={1}
        rounded={10}
        p={8}
        width={196}
        style={{ backgroundColor: paint.sidebar, borderColor: paint.paneEdge, zIndex: 100000 }}
      >
        <YStack gap={6}>
          <YStack px={4}>
            <SizableText fontSize={12.5} fontWeight="700" style={{ color: paint.ink }}>
              {member.name}
            </SizableText>
            <SizableText fontSize={10.5} style={{ color: paint.dim }}>
              {member.activity}
            </SizableText>
          </YStack>
          <XStack gap={4}>
            <XStack
              {...press(() => {
                triggerOfficeInteraction(member.name, 'wave')
                setOpen(false)
              }, `Wave at ${member.name}`)}
              flex={1}
              py={5}
              rounded={6}
              borderWidth={1}
              items="center"
              justify="center"
              gap={4}
              style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
              hoverStyle={{ background: paint.hover }}
            >
              <Hand size={11} color={paint.sevInk} />
              <SizableText fontSize={11} fontWeight="600" style={{ color: paint.ink }}>
                Wave
              </SizableText>
            </XStack>
            <XStack
              {...press(() => {
                triggerOfficeInteraction(member.name, 'knock')
                setOpen(false)
              }, `Knock on ${member.name}'s desk`)}
              flex={1}
              py={5}
              rounded={6}
              borderWidth={1}
              items="center"
              justify="center"
              gap={4}
              style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
              hoverStyle={{ background: paint.hover }}
            >
              <DoorOpen size={11} color={paint.mute} />
              <SizableText fontSize={11} fontWeight="600" style={{ color: paint.ink }}>
                Knock
              </SizableText>
            </XStack>
            <XStack
              {...press(() => {
                setOpen(false)
                onChat()
              }, `Chat with ${member.name}`)}
              flex={1}
              py={5}
              rounded={6}
              borderWidth={1}
              items="center"
              justify="center"
              gap={4}
              style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
              hoverStyle={{ background: paint.hover }}
            >
              <MessageCircle size={11} color={paint.speaking} />
              <SizableText fontSize={11} fontWeight="600" style={{ color: paint.ink }}>
                Chat
              </SizableText>
            </XStack>
          </XStack>
        </YStack>
      </Popover.Content>
    </Popover>
  )
}
