/**
 * Virtual Office (`Meet`), Calendar & Bot Cron Routines (`Calendar`),
 * and Time & Sprint Velocity (`Time`) surfaces.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, ScrollArea, Separator, SizableText, XStack, YStack } from '@hanzo/ui'
import {
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  Headphones,
  Mic,
  MicOff,
  MonitorUp,
  Play,
  Plus,
  Sparkles,
  Users,
  Video,
  Volume2,
} from '@hanzogui/lucide-icons-2'

import { HANZO_AGENTS } from '~/data/agents.ts'
import { useSpace } from '~/data/space.tsx'
import { standingIs, useBoard } from '~/serve.tsx'
import { Find, Group, Nav as Column, press, Roll, Row, Rule } from '~/shell'
import { standby } from '~/tracker/board/fixture.ts'
import type { Issue } from '~/tracker/board/model.ts'
import { People } from '~/tracker/board/People.tsx'
import { Ring } from '~/tracker/board/Ring.tsx'
import { dot } from '~/tracker/board/tone.ts'
import { caps, chip, paint, round, rung, state } from '~/theme/theme.ts'

// ── 1. VIRTUAL OFFICE & MEET (`/meet`) ────────────────────────────────────────

type VirtualRoom = {
  id: string
  name: string
  floor: string
  topic: string
  screenShare?: string
  humans: Array<{ name: string; role: string; speaking?: boolean }>
  bots: string[]
  notes: Array<{ who: string; text: string; actionIssue?: string }>
}

const VIRTUAL_ROOMS: readonly VirtualRoom[] = [
  {
    id: 'war-room',
    name: 'Engineering War Room',
    floor: 'Floor 1 · Core Engineering',
    topic: 'ZAP Transactor latency, KMS grants & PR 464 merge gate',
    screenShare: '@dev sharing: Ubuntu 24.04 · go test ./apps/team/... (PASS 0.42s)',
    humans: [
      { name: 'Zach Kelling', role: 'CTO & Founder', speaking: true },
    ],
    bots: ['dev', 'cyber', 'opera', 'sci'],
    notes: [
      {
        who: '@dev',
        text: 'Verified PR 464 against IAM and KMS; regenerated zipdoc_gen.go and all 46 unit + theme checks pass.',
        actionIssue: 'Verify KMS NPM_TOKEN grant propagation in production',
      },
      {
        who: '@cyber',
        text: 'Confirmed zero-knowledge hardware enclave policy holds across all 4 organization spaces.',
      },
      {
        who: 'Zach Kelling',
        text: 'Ship the cutover once the canary healthcheck stays green for 15 minutes.',
        actionIssue: 'Promote transactor canary to 100% traffic',
      },
    ],
  },
  {
    id: 'bot-ops',
    name: 'AI Bot Ops Floor · 24/7',
    floor: 'Floor 1 · Autonomous Fleet',
    topic: 'Continuous 24/7 cron routines, lease budgets & sandbox telemetry',
    screenShare: '@vi sharing: 23/23 active agent sandboxes · 99.98% SLA',
    humans: [{ name: 'Zach Kelling', role: 'Fleet Architecture' }],
    bots: ['vi', 'mana', 'sci', 'data'],
    notes: [
      {
        who: '@vi',
        text: 'All 23 bots online across Hanzo AI, The Foundation, Lux Network, and Zoo Labs.',
      },
      {
        who: '@mana',
        text: 'Rebalanced sprint queue: moved 3 unblocked CRM tasks into In progress.',
        actionIssue: 'Audit daily compute lease caps across specialist bots',
      },
    ],
  },
  {
    id: 'design-crit',
    name: 'Product & Design Studio',
    floor: 'Floor 2 · Design & Brand',
    topic: 'Workspace polish, Gallery live previews & Omni 1.2 Flash stills',
    screenShare: '@des sharing: @hanzo/gui monochrome token sheet & Slack-style top bar',
    humans: [
      { name: 'Antje Worring', role: 'CEO & Founder', speaking: true },
      { name: 'Zach Kelling', role: 'Design Systems' },
    ],
    bots: ['des', 'art', 'mark', 'mo'],
    notes: [
      {
        who: '@des',
        text: 'Unified Slack-style top bar and bottom-left account switcher across desktop and web.',
        actionIssue: 'Add 4K mobile handset frame to product showcase',
      },
    ],
  },
  {
    id: 'deal-desk',
    name: 'Revenue & Enterprise Deal Desk',
    floor: 'Floor 2 · Growth & CRM',
    topic: 'Enterprise seat reconciliation, org credit grants & Q4 pipeline',
    humans: [
      { name: 'Antje Worring', role: 'CEO & Enterprise Growth' },
    ],
    bots: ['rev', 'sal', 'fin', 'su'],
    notes: [
      {
        who: '@rev',
        text: 'Reconciled $156.6K prepaid org grant on z/hanzo with lease billing account.',
        actionIssue: 'Sync enterprise seat count export with Commerce ledger',
      },
    ],
  },
]

export function MeetNav() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const rooms = q
    ? VIRTUAL_ROOMS.filter((r) => `${r.name} ${r.topic} ${r.floor}`.toLowerCase().includes(q))
    : VIRTUAL_ROOMS

  return (
    <Column title="Virtual Office">
      <Find value={query} onChange={setQuery} />
      <YStack height={14} />
      <Row to="/meet" icon={<Headphones size={16} color="$soft" />}>
        All Office Rooms ({VIRTUAL_ROOMS.length})
      </Row>
      <Rule />
      <Roll>
        <Group>Live Voice & Video Rooms</Group>
        {rooms.map((room) => (
          <Row
            key={room.id}
            to="/meet"
            icon={<Volume2 size={15} color="$ink" />}
          >
            {`${room.name} (${room.humans.length + room.bots.length})`}
          </Row>
        ))}
      </Roll>
    </Column>
  )
}

export function MeetScreen() {
  const navigate = useNavigate()
  const { current, standing } = useSpace()
  const source = useBoard('proj-crm') ?? standby(standingIs(standing))
  const [activeRoomId, setActiveRoomId] = useState<string>('war-room')
  const [joined, setJoined] = useState<boolean>(true)
  const [muted, setMuted] = useState<boolean>(false)
  const [sharing, setSharing] = useState<boolean>(false)
  const [createdIssue, setCreatedIssue] = useState<string | null>(null)

  const activeRoom = VIRTUAL_ROOMS.find((r) => r.id === activeRoomId) ?? VIRTUAL_ROOMS[0]!

  const convertToIssue = (title: string) => {
    if (source.add) {
      void source.add('todo', title).then(() => {
        setCreatedIssue(title)
      })
    }
  }

  return (
    <ScrollArea flex={1} minH={0}>
      <YStack p={24} gap={20}>
        {/* Top Header + Live Huddle Controls */}
        <XStack items="center" justify="space-between" flexWrap="wrap" gap={12}>
          <YStack gap={4}>
            <XStack items="center" gap={8}>
              <YStack width={8} height={8} rounded={9999} style={{ backgroundColor: state.done }} />
              <SizableText {...caps} fontSize={rung.chip} fontWeight="600" color="$soft">
                {current?.name ?? 'Hanzo AI'} · Virtual Office & Instant Huddles
              </SizableText>
            </XStack>
            <SizableText fontSize={rung.title} fontWeight="600" color="$ink">
              {activeRoom.name}
            </SizableText>
            <SizableText fontSize={rung.body} color="$quiet">
              {activeRoom.topic}
            </SizableText>
          </YStack>

          <XStack gap={8} items="center" flexWrap="wrap">
            <Button
              variant="outline"
              size="sm"
              onPress={() => setMuted(!muted)}
            >
              {muted ? <MicOff size={15} /> : <Mic size={15} />}
              {muted ? 'Unmute Mic' : 'Mic Live'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onPress={() => setSharing(!sharing)}
            >
              <MonitorUp size={15} />
              {sharing ? 'Stop Sharing' : 'Share Screen'}
            </Button>
            <Button
              size="sm"
              onPress={() => setJoined(!joined)}
            >
              <Video size={15} />
              {joined ? 'In Room · Leave' : 'Join Room'}
            </Button>
          </XStack>
        </XStack>

        {createdIssue ? (
          <XStack
            p={12}
            rounded={round.field}
            bg="$panel"
            borderWidth={1}
            borderColor="$edge"
            items="center"
            justify="space-between"
          >
            <XStack items="center" gap={8}>
              <CheckCircle2 size={16} color="$ink" />
              <SizableText fontSize={rung.small} color="$ink">
                Added meeting action item to CRM Tracker: &ldquo;{createdIssue}&rdquo;
              </SizableText>
            </XStack>
            <Button size="sm" variant="outline" onPress={() => navigate('/projects/proj-crm/issues')}>
              Open Board →
            </Button>
          </XStack>
        ) : null}

        {/* Virtual Office Floor Plan Grid */}
        <XStack flexWrap="wrap" gap={14}>
          {VIRTUAL_ROOMS.map((room) => {
            const isSelected = room.id === activeRoom.id
            const bots = room.bots
              .map((id) => HANZO_AGENTS.find((a) => a.id === id))
              .filter((b): b is NonNullable<typeof b> => !!b)

            return (
              <YStack
                key={room.id}
                {...press(() => {
                  setActiveRoomId(room.id)
                  setJoined(true)
                }, `Enter ${room.name}`)}
                width={320}
                grow={1}
                p={16}
                rounded={round.card}
                bg={isSelected ? '$panel' : '$background'}
                borderWidth={1}
                borderColor={isSelected ? '$ink' : '$edge'}
                hoverStyle={{ background: '$hover' }}
                gap={12}
              >
                <XStack items="center" justify="space-between" gap={8}>
                  <YStack gap={2}>
                    <SizableText fontSize={rung.chip} color="$soft" {...caps}>
                      {room.floor}
                    </SizableText>
                    <SizableText fontSize={rung.row} fontWeight="600" color="$ink">
                      {room.name}
                    </SizableText>
                  </YStack>
                  <XStack
                    px={8}
                    py={3}
                    rounded={round.pill}
                    style={chip(isSelected && joined ? 'Live Now' : 'Open')}
                    items="center"
                    gap={5}
                  >
                    <Volume2 size={12} color="$ink" />
                    <SizableText
                      fontSize={rung.chip}
                      fontWeight="600"
                      style={{ color: chip(isSelected && joined ? 'Live Now' : 'Open').color }}
                    >
                      {room.humans.length + bots.length} in room
                    </SizableText>
                  </XStack>
                </XStack>

                <SizableText fontSize={rung.small} color="$quiet" numberOfLines={2}>
                  {room.topic}
                </SizableText>

                {room.screenShare ? (
                  <XStack
                    px={10}
                    py={6}
                    rounded={round.field}
                    bg="$background"
                    borderWidth={1}
                    borderColor="$edge"
                    items="center"
                    gap={8}
                  >
                    <MonitorUp size={13} color="$ink" />
                    <SizableText fontSize={rung.chip} color="$ink" numberOfLines={1} flex={1}>
                      {room.screenShare}
                    </SizableText>
                  </XStack>
                ) : null}

                {/* Humans + AI Bots sitting in the room */}
                <XStack items="center" justify="space-between" pt={6} borderTopWidth={1} borderColor="$edge">
                  <XStack gap={6} items="center" flexWrap="wrap">
                    {room.humans.map((h) => (
                      <XStack
                        key={h.name}
                        px={8}
                        py={3}
                        rounded={round.pill}
                        bg="$background"
                        borderWidth={1}
                        borderColor={h.speaking ? '$ink' : '$edge'}
                        items="center"
                        gap={5}
                      >
                        <YStack
                          width={6}
                          height={6}
                          rounded={9999}
                          style={{ backgroundColor: h.speaking ? state.done : state.todo }}
                        />
                        <SizableText fontSize={rung.chip} fontWeight="600" color="$ink">
                          {h.name.split(' ')[0]}
                        </SizableText>
                      </XStack>
                    ))}
                    {bots.map((b) => (
                      <XStack
                        key={b.id}
                        px={7}
                        py={2}
                        rounded={round.pill}
                        bg="$background"
                        borderWidth={1}
                        borderColor="$edge"
                        items="center"
                        gap={4}
                      >
                        <img
                          src={b.avatar}
                          alt={b.name}
                          width={14}
                          height={14}
                          style={{ width: 14, height: 14, borderRadius: 999, objectFit: 'cover' }}
                        />
                        <SizableText fontSize={rung.chip} fontWeight="600" color="$soft">
                          @{b.id}
                        </SizableText>
                      </XStack>
                    ))}
                  </XStack>
                </XStack>
              </YStack>
            )
          })}
        </XStack>

        {/* Active Room Stage + AI Meeting Notes & Action Items */}
        <XStack gap={16} flexWrap="wrap" items="stretch">
          {/* Left: Active Stage Participants & Shared Screen */}
          <YStack
            flex={2}
            minW={320}
            p={20}
            rounded={round.card}
            bg="$background"
            borderWidth={1}
            borderColor="$edge"
            gap={14}
          >
            <XStack items="center" justify="space-between">
              <XStack items="center" gap={8}>
                <Users size={16} color="$ink" />
                <SizableText fontSize={rung.row} fontWeight="600" color="$ink">
                  Live Stage · {activeRoom.name}
                </SizableText>
              </XStack>
              <SizableText fontSize={rung.chip} color="$soft">
                Spatial Audio · Low-Latency WebRTC + Bot Voice Bridge
              </SizableText>
            </XStack>

            {activeRoom.screenShare ? (
              <YStack
                p={14}
                rounded={round.field}
                bg="$panel"
                borderWidth={1}
                borderColor="$edge"
                gap={6}
              >
                <XStack items="center" justify="space-between">
                  <XStack items="center" gap={8}>
                    <MonitorUp size={15} color="$ink" />
                    <SizableText fontSize={rung.small} fontWeight="600" color="$ink">
                      {activeRoom.screenShare}
                    </SizableText>
                  </XStack>
                  <Button size="sm" variant="outline" onPress={() => navigate('/chat/dm-dev')}>
                    Open Bot Computer →
                  </Button>
                </XStack>
                <SizableText fontSize={rung.chip} color="$quiet">
                  Streaming 60fps cloud sandbox viewport · Click any bot tile below to hand off terminal or browser control.
                </SizableText>
              </YStack>
            ) : null}

            <XStack flexWrap="wrap" gap={10}>
              {activeRoom.humans.map((h) => (
                <YStack
                  key={h.name}
                  width={170}
                  grow={1}
                  p={12}
                  rounded={round.field}
                  bg="$panel"
                  borderWidth={1}
                  borderColor={h.speaking ? '$ink' : '$edge'}
                  gap={6}
                >
                  <XStack items="center" justify="space-between">
                    <SizableText fontSize={rung.small} fontWeight="600" color="$ink">
                      {h.name}
                    </SizableText>
                    <YStack
                      width={8}
                      height={8}
                      rounded={9999}
                      style={{ backgroundColor: h.speaking ? state.done : state.todo }}
                    />
                  </XStack>
                  <SizableText fontSize={rung.chip} color="$quiet">
                    {h.role}
                  </SizableText>
                </YStack>
              ))}

              {activeRoom.bots.map((botId) => {
                const bot = HANZO_AGENTS.find((a) => a.id === botId)
                if (!bot) return null
                return (
                  <YStack
                    key={bot.id}
                    {...press(() => navigate(`/chat/dm-${bot.id}`), `Open ${bot.name}`)}
                    width={170}
                    grow={1}
                    p={12}
                    rounded={round.field}
                    bg="$panel"
                    borderWidth={1}
                    borderColor="$edge"
                    hoverStyle={{ background: '$hover' }}
                    gap={6}
                  >
                    <XStack items="center" justify="space-between">
                      <XStack items="center" gap={6}>
                        <img
                          src={bot.avatar}
                          alt={bot.name}
                          width={20}
                          height={20}
                          style={{ width: 20, height: 20, borderRadius: 999, objectFit: 'cover' }}
                        />
                        <SizableText fontSize={rung.small} fontWeight="600" color="$ink">
                          {bot.name}
                        </SizableText>
                      </XStack>
                      <SizableText fontSize={rung.chip} style={{ color: paint.accent }}>
                        AI · 24/7
                      </SizableText>
                    </XStack>
                    <SizableText fontSize={rung.chip} color="$quiet" numberOfLines={1}>
                      {bot.role} · {bot.department}
                    </SizableText>
                  </YStack>
                )
              })}
            </XStack>
          </YStack>

          {/* Right: Live AI Transcript & Action Items */}
          <YStack
            flex={1}
            minW={300}
            p={20}
            rounded={round.card}
            bg="$background"
            borderWidth={1}
            borderColor="$edge"
            gap={12}
          >
            <XStack items="center" justify="space-between">
              <XStack items="center" gap={8}>
                <Sparkles size={15} color="$ink" />
                <SizableText fontSize={rung.row} fontWeight="600" color="$ink">
                  Live AI Notes & Actions
                </SizableText>
              </XStack>
              <SizableText fontSize={rung.chip} color="$soft">
                by @mana
              </SizableText>
            </XStack>

            <Separator borderColor="$edge" />

            <YStack gap={12}>
              {activeRoom.notes.map((n, idx) => (
                <YStack
                  key={idx}
                  p={12}
                  rounded={round.field}
                  bg="$panel"
                  borderWidth={1}
                  borderColor="$edge"
                  gap={8}
                >
                  <XStack items="center" justify="space-between">
                    <SizableText fontSize={rung.small} fontWeight="600" color="$ink">
                      {n.who}
                    </SizableText>
                    <SizableText fontSize={rung.chip} color="$soft">
                      Just now
                    </SizableText>
                  </XStack>
                  <SizableText fontSize={rung.small} color="$quiet">
                    {n.text}
                  </SizableText>
                  {n.actionIssue ? (
                    <XStack items="center" justify="space-between" pt={4}>
                      <SizableText fontSize={rung.chip} style={{ color: paint.accent }} flex={1} numberOfLines={1}>
                        Action: {n.actionIssue}
                      </SizableText>
                      <Button size="sm" variant="outline" onPress={() => convertToIssue(n.actionIssue!)}>
                        <Plus size={12} /> Track
                      </Button>
                    </XStack>
                  ) : null}
                </YStack>
              ))}
            </YStack>
          </YStack>
        </XStack>
      </YStack>
    </ScrollArea>
  )
}

// ── 2. CALENDAR & 24/7 BOT CRON ROUTINES (`/calendar`) ────────────────────────

type CalendarSlot = {
  id: string
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'
  time: string
  title: string
  kind: 'Standup' | 'Sprint' | 'Customer' | 'Bot Routine'
  bot?: string
  issueKey?: string
  room?: string
}

const CALENDAR_SLOTS: readonly CalendarSlot[] = [
  { id: 'c1', day: 'Mon', time: '09:00', title: 'Weekly Engineering & Bot Fleet Kickoff', kind: 'Standup', bot: 'mana', room: 'Engineering War Room' },
  { id: 'c2', day: 'Mon', time: '11:30', title: '@rev Lease & Org Credit Reconciliation', kind: 'Bot Routine', bot: 'rev', issueKey: 'CRM-18' },
  { id: 'c3', day: 'Tue', time: '10:00', title: 'Custdev Interview w/ Existing Client', kind: 'Customer', bot: 'sal', issueKey: 'CRM-15', room: 'Revenue & Enterprise Deal Desk' },
  { id: 'c4', day: 'Tue', time: '14:00', title: '@dev CI Flake Sweep & PR 464 Gate', kind: 'Bot Routine', bot: 'dev', issueKey: 'DEV-26' },
  { id: 'c5', day: 'Wed', time: '09:30', title: 'Design System & Gallery Live Previews Crit', kind: 'Sprint', bot: 'des', room: 'Product & Design Studio' },
  { id: 'c6', day: 'Wed', time: '15:00', title: '@mark Funnel & Top-20 Landing Audit', kind: 'Bot Routine', bot: 'mark', issueKey: 'MKT-22' },
  { id: 'c7', day: 'Thu', time: '10:30', title: 'Next Platform Ledger Migration Rehearsal', kind: 'Sprint', bot: 'sci', issueKey: 'NEXT-25', room: 'Engineering War Room' },
  { id: 'c8', day: 'Thu', time: '16:00', title: '@cyber KMS Enclave & Secret Grants Scan', kind: 'Bot Routine', bot: 'cyber', issueKey: 'DEV-27' },
  { id: 'c9', day: 'Fri', time: '11:00', title: 'v2.4 Release Cut & Canary Rollout', kind: 'Sprint', bot: 'opera', issueKey: 'CRM-19', room: 'Engineering War Room' },
  { id: 'c10', day: 'Fri', time: '15:30', title: '@fin Weekly Burn-Up & Compute Cost Digest', kind: 'Bot Routine', bot: 'fin' },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const

export function CalendarNav() {
  return (
    <Column title="Calendar & Routines">
      <YStack height={6} />
      <Row to="/calendar" icon={<Calendar size={16} color="$soft" />}>
        Week View · Nov 3–7
      </Row>
      <Row to="/meet" icon={<Video size={16} color="$soft" />}>
        Virtual Office Rooms
      </Row>
      <Row to="/issues/timeline" icon={<Clock size={16} color="$soft" />}>
        Sprint Timeline
      </Row>
      <Rule />
      <Roll>
        <Group>24/7 Bot Cron Schedules</Group>
        {HANZO_AGENTS.slice(0, 10).map((bot) => (
          <Row
            key={bot.id}
            to={`/chat/dm-${bot.id}`}
            icon={
              <img
                src={bot.avatar}
                alt={bot.name}
                width={16}
                height={16}
                style={{ width: 16, height: 16, borderRadius: 999, objectFit: 'cover' }}
              />
            }
          >
            {`@${bot.id} · ${bot.schedule}`}
          </Row>
        ))}
      </Roll>
    </Column>
  )
}

export function CalendarScreen() {
  const navigate = useNavigate()
  const { current } = useSpace()
  const [kindFilter, setKindFilter] = useState<string>('All')
  const [triggeredBot, setTriggeredBot] = useState<string | null>(null)

  const filtered =
    kindFilter === 'All'
      ? CALENDAR_SLOTS
      : CALENDAR_SLOTS.filter((s) => s.kind === kindFilter)

  return (
    <ScrollArea flex={1} minH={0}>
      <YStack p={24} gap={20}>
        {/* Header */}
        <XStack items="center" justify="space-between" flexWrap="wrap" gap={12}>
          <YStack gap={4}>
            <SizableText {...caps} fontSize={rung.chip} fontWeight="600" color="$soft">
              {current?.name ?? 'Hanzo AI'} · Team Schedule & Autonomous Routines
            </SizableText>
            <SizableText fontSize={rung.title} fontWeight="600" color="$ink">
              Calendar & 24/7 Bot Cron Schedule
            </SizableText>
            <SizableText fontSize={rung.body} color="$quiet">
              Team ceremonies, customer interviews, release gates, and automated 24/7 bot routines side by side.
            </SizableText>
          </YStack>

          <XStack gap={8} items="center" flexWrap="wrap">
            {(['All', 'Standup', 'Sprint', 'Customer', 'Bot Routine'] as const).map((k) => {
              const active = kindFilter === k
              return (
                <XStack
                  key={k}
                  {...press(() => setKindFilter(k), `Filter ${k}`)}
                  px={12}
                  py={6}
                  rounded={round.pill}
                  bg={active ? '$hover' : '$background'}
                  borderWidth={1}
                  borderColor={active ? '$ink' : '$edge'}
                  hoverStyle={{ background: '$hover' }}
                >
                  <SizableText fontSize={rung.small} fontWeight={active ? '600' : '400'} color={active ? '$ink' : '$quiet'}>
                    {k}
                  </SizableText>
                </XStack>
              )
            })}
          </XStack>
        </XStack>

        {triggeredBot ? (
          <XStack
            p={12}
            rounded={round.field}
            bg="$panel"
            borderWidth={1}
            borderColor="$edge"
            items="center"
            justify="space-between"
          >
            <XStack items="center" gap={8}>
              <Sparkles size={16} color="$ink" />
              <SizableText fontSize={rung.small} color="$ink">
                Triggered immediate cron run for @{triggeredBot} on its cloud computer.
              </SizableText>
            </XStack>
            <Button size="sm" variant="outline" onPress={() => navigate(`/chat/dm-${triggeredBot}`)}>
              Watch Live Run →
            </Button>
          </XStack>
        ) : null}

        {/* 5-Day Week Grid */}
        <XStack gap={12} flexWrap="wrap" items="stretch">
          {DAYS.map((day) => {
            const dayEvents = filtered.filter((e) => e.day === day)
            const isToday = day === 'Wed'
            return (
              <YStack
                key={day}
                width={220}
                grow={1}
                rounded={round.card}
                bg="$background"
                borderWidth={1}
                borderColor={isToday ? '$ink' : '$edge'}
                overflow="hidden"
              >
                <XStack
                  px={14}
                  height={40}
                  items="center"
                  justify="space-between"
                  bg="$panel"
                  borderBottomWidth={1}
                  borderColor="$edge"
                >
                  <XStack items="center" gap={6}>
                    {isToday ? (
                      <YStack width={7} height={7} rounded={9999} style={{ backgroundColor: paint.accent }} />
                    ) : null}
                    <SizableText fontSize={rung.small} fontWeight="700" color="$ink" {...caps}>
                      {day}
                    </SizableText>
                  </XStack>
                  <SizableText fontSize={rung.chip} color="$soft">
                    {isToday ? 'TODAY' : `${dayEvents.length} events`}
                  </SizableText>
                </XStack>

                <YStack p={12} gap={10}>
                  {dayEvents.map((ev) => {
                    const bot = ev.bot ? HANZO_AGENTS.find((a) => a.id === ev.bot) : undefined
                    return (
                      <YStack
                        key={ev.id}
                        p={12}
                        rounded={round.field}
                        bg="$panel"
                        borderWidth={1}
                        borderColor="$edge"
                        gap={8}
                      >
                        <XStack items="center" justify="space-between">
                          <SizableText fontSize={rung.chip} fontWeight="700" color="$soft">
                            {ev.time} UTC
                          </SizableText>
                          <XStack px={7} py={2} rounded={round.pill} style={chip(ev.kind)}>
                            <SizableText fontSize={rung.chip} fontWeight="600" style={{ color: chip(ev.kind).color }}>
                              {ev.kind}
                            </SizableText>
                          </XStack>
                        </XStack>

                        <SizableText fontSize={rung.small} fontWeight="600" color="$ink">
                          {ev.title}
                        </SizableText>

                        {ev.issueKey ? (
                          <SizableText
                            {...press(() => navigate('/projects/proj-crm/issues'), ev.issueKey)}
                            fontSize={rung.chip}
                            style={{ color: paint.accent }}
                          >
                            Linked issue: {ev.issueKey} →
                          </SizableText>
                        ) : null}

                        {bot ? (
                          <XStack items="center" justify="space-between" pt={4} borderTopWidth={1} borderColor="$edge">
                            <XStack
                              {...press(() => navigate(`/chat/dm-${bot.id}`), `Open @${bot.id}`)}
                              items="center"
                              gap={6}
                            >
                              <img
                                src={bot.avatar}
                                alt={bot.name}
                                width={16}
                                height={16}
                                style={{ width: 16, height: 16, borderRadius: 999, objectFit: 'cover' }}
                              />
                              <SizableText fontSize={rung.chip} fontWeight="600" color="$ink">
                                @{bot.id}
                              </SizableText>
                            </XStack>
                            {ev.kind === 'Bot Routine' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onPress={() => setTriggeredBot(bot.id)}
                              >
                                <Play size={12} /> Run
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" onPress={() => navigate('/meet')}>
                                Join
                              </Button>
                            )}
                          </XStack>
                        ) : null}
                      </YStack>
                    )
                  })}
                </YStack>
              </YStack>
            )
          })}
        </XStack>

        {/* Continuous 24/7 Cron Daemon Matrix */}
        <YStack
          p={20}
          rounded={round.card}
          bg="$background"
          borderWidth={1}
          borderColor="$edge"
          gap={14}
        >
          <XStack items="center" justify="space-between" flexWrap="wrap" gap={8}>
            <XStack items="center" gap={8}>
              <Bot size={18} color="$ink" />
              <SizableText fontSize={rung.row} fontWeight="600" color="$ink">
                24/7 Autonomous Cron Fleet ({HANZO_AGENTS.length} Active Daemons)
              </SizableText>
            </XStack>
            <SizableText fontSize={rung.chip} color="$soft">
              Every bot runs on schedule and pauses for human approval on high-impact actions
            </SizableText>
          </XStack>

          <XStack flexWrap="wrap" gap={10}>
            {HANZO_AGENTS.slice(0, 8).map((bot) => (
              <XStack
                key={bot.id}
                {...press(() => navigate(`/chat/dm-${bot.id}`), `Inspect @${bot.id}`)}
                width={250}
                grow={1}
                p={12}
                rounded={round.field}
                bg="$panel"
                borderWidth={1}
                borderColor="$edge"
                hoverStyle={{ background: '$hover' }}
                items="center"
                justify="space-between"
                gap={10}
              >
                <XStack items="center" gap={10} minW={0} flex={1}>
                  <img
                    src={bot.avatar}
                    alt={bot.name}
                    width={28}
                    height={28}
                    style={{ width: 28, height: 28, borderRadius: 999, objectFit: 'cover' }}
                  />
                  <YStack minW={0} flex={1}>
                    <SizableText fontSize={rung.small} fontWeight="600" color="$ink" numberOfLines={1}>
                      {bot.name} · {bot.role}
                    </SizableText>
                    <SizableText fontSize={rung.chip} color="$soft" numberOfLines={1}>
                      Cron: {bot.schedule}
                    </SizableText>
                  </YStack>
                </XStack>
                <YStack width={8} height={8} rounded={9999} style={{ backgroundColor: state.done }} />
              </XStack>
            ))}
          </XStack>
        </YStack>
      </YStack>
    </ScrollArea>
  )
}

// ── 3. TIME & VELOCITY (`/time`) ──────────────────────────────────────────────

export function TimeNav() {
  return (
    <Column title="Time & Velocity">
      <YStack height={6} />
      <Row to="/time" icon={<Clock size={16} color="$soft" />}>
        Sprint Time Sheet
      </Row>
      <Row to="/projects/proj-crm/issues" icon={<CheckCircle2 size={16} color="$soft" />}>
        CRM Estimates
      </Row>
      <Row to="/bots" icon={<Bot size={16} color="$soft" />}>
        Bot Compute Saved
      </Row>
    </Column>
  )
}

export function TimeScreen() {
  const navigate = useNavigate()
  const { current, standing } = useSpace()
  const source = useBoard() ?? standby(standingIs(standing))
  const [issues, setIssues] = useState<Issue[]>([])
  const [extraHours, setExtraHours] = useState<Record<string, number>>({})

  useEffect(() => {
    return source.watch(
      (next) => setIssues(next),
      () => {},
    )
  }, [source])

  const trackedIssues = issues.filter((i) => i.done !== undefined)
  const totalEstimated = trackedIssues.length * 8
  const totalReported = trackedIssues.reduce(
    (sum, i) => sum + Math.round((i.done ?? 0) * 8) + (extraHours[i.id] ?? 0),
    0,
  )
  const overallRatio = totalEstimated > 0 ? Math.min(1, totalReported / totalEstimated) : 0.45

  return (
    <ScrollArea flex={1} minH={0}>
      <YStack p={24} gap={20}>
        {/* Header */}
        <XStack items="center" justify="space-between" flexWrap="wrap" gap={12}>
          <YStack gap={4}>
            <SizableText {...caps} fontSize={rung.chip} fontWeight="600" color="$soft">
              {current?.name ?? 'Hanzo AI'} · Time Tracking & Engineering Velocity
            </SizableText>
            <SizableText fontSize={rung.title} fontWeight="600" color="$ink">
              Time & Estimates
            </SizableText>
            <SizableText fontSize={rung.body} color="$quiet">
              What the work took against what it was estimated at — across human teammates and 24/7 autonomous bots.
            </SizableText>
          </YStack>

          <Button onPress={() => navigate('/projects/proj-crm/issues')}>
            Open Tracker Board →
          </Button>
        </XStack>

        {/* KPI Summary Cards */}
        <XStack flexWrap="wrap" gap={14}>
          <YStack
            width={240}
            grow={1}
            p={18}
            rounded={round.card}
            bg="$background"
            borderWidth={1}
            borderColor="$edge"
            gap={6}
          >
            <SizableText {...caps} fontSize={rung.chip} fontWeight="600" color="$soft">
              Reported / Estimated
            </SizableText>
            <XStack items="center" gap={10}>
              <Ring done={overallRatio} size={24} width={3} />
              <SizableText fontSize={rung.title} fontWeight="700" color="$ink">
                {totalReported}h / {totalEstimated}h
              </SizableText>
            </XStack>
            <SizableText fontSize={rung.small} color="$quiet">
              {Math.round(overallRatio * 100)}% of estimated sprint capacity logged
            </SizableText>
          </YStack>

          <YStack
            width={240}
            grow={1}
            p={18}
            rounded={round.card}
            bg="$background"
            borderWidth={1}
            borderColor="$edge"
            gap={6}
          >
            <SizableText {...caps} fontSize={rung.chip} fontWeight="600" color="$soft">
              24/7 Bot Compute Saved
            </SizableText>
            <SizableText fontSize={rung.title} fontWeight="700" style={{ color: state.done }}>
              142.5h saved
            </SizableText>
            <SizableText fontSize={rung.small} color="$quiet">
              Autonomous triage, CI fixes & KMS audits by 23 bots this week
            </SizableText>
          </YStack>

          <YStack
            width={240}
            grow={1}
            p={18}
            rounded={round.card}
            bg="$background"
            borderWidth={1}
            borderColor="$edge"
            gap={6}
          >
            <SizableText {...caps} fontSize={rung.chip} fontWeight="600" color="$soft">
              Sprint Cycle Velocity
            </SizableText>
            <SizableText fontSize={rung.title} fontWeight="700" color="$ink">
              1.4d median
            </SizableText>
            <SizableText fontSize={rung.small} color="$quiet">
              From issue creation in To do to verified PR merge
            </SizableText>
          </YStack>
        </XStack>

        {/* Issue Time Sheet Table */}
        <YStack
          rounded={round.card}
          borderWidth={1}
          borderColor="$edge"
          bg="$background"
          overflow="hidden"
        >
          <XStack px={16} height={42} items="center" bg="$panel" borderBottomWidth={1} borderColor="$edge">
            <SizableText fontSize={rung.small} fontWeight="700" color="$ink" {...caps} flex={1}>
              Issue · Estimate vs. Reported Time
            </SizableText>
            <SizableText fontSize={rung.chip} color="$soft">
              Click +1h to log time on any issue
            </SizableText>
          </XStack>

          {trackedIssues.map((issue, idx) => {
            const added = extraHours[issue.id] ?? 0
            const est = 8
            const rep = Math.min(est, Math.round((issue.done ?? 0) * est) + added)
            const ratio = rep / est

            return (
              <YStack key={issue.id}>
                {idx > 0 ? <Separator borderColor="$edge" /> : null}
                <XStack px={16} py={10} items="center" gap={12} hoverStyle={{ background: '$hover' }}>
                  <YStack
                    width={8}
                    height={8}
                    rounded={9999}
                    style={{ backgroundColor: dot[issue.status] }}
                  />
                  <SizableText fontSize={rung.small} fontWeight="600" color="$soft" width={68} shrink={0}>
                    {issue.key}
                  </SizableText>
                  <SizableText fontSize={rung.body} color="$ink" flex={1} minW={160} numberOfLines={1}>
                    {issue.title}
                  </SizableText>
                  <People people={issue.people} size={22} show={2} />
                  <XStack width={110} items="center" justify="flex-end" gap={6} shrink={0}>
                    <Ring done={ratio} size={16} />
                    <SizableText fontSize={rung.small} fontWeight="600" color="$ink">
                      {rep}h / {est}h
                    </SizableText>
                  </XStack>
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() =>
                      setExtraHours((prev) => ({ ...prev, [issue.id]: (prev[issue.id] ?? 0) + 1 }))
                    }
                  >
                    +1h
                  </Button>
                </XStack>
              </YStack>
            )
          })}
        </YStack>
      </YStack>
    </ScrollArea>
  )
}
