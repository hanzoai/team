/**
 * THE CHAT SCREEN — a room's header, structured task handoffs & approval inbox,
 * its conversation, and a composer.
 *
 * Everything below the header is the same for a channel and a direct message.
 * Channels additionally support assigning / handing off tasks to @hanzo-dev or
 * teammates (#67-#68) and reviewing + approving waiting deliverables inside
 * #approvals (#69-#70).
 */
import { Input, SizableText, XStack, YStack } from '@hanzo/ui'
import { EmptyState } from '@hanzo/ui/product'
import {
  ArrowRight,
  Bell,
  Check,
  Code,
  Hash,
  Lock,
  MessagesSquare,
  Monitor,
  Plus,
} from '@hanzogui/lucide-icons-2'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { HANZO_AGENTS, humanSchedule, type AgentPreset } from '~/data/agents.ts'
import { invalidate } from '~/data/query.ts'
import { useSpace } from '~/data/space.tsx'
import { press, toggleAsideKind, useAside, useAsideKind, useNotices } from '~/shell'
import { caps, paint, ring, round, rung, state } from '~/theme/theme'
import { react, reply, say, unreact, type Message, type Room } from './chat.ts'
import { Composer } from './Composer.tsx'
import {
  approveTaskHandoff,
  createTaskHandoff,
  HANDOFF_ASSIGNEES,
  handoffsForRoom,
  readHandoffs,
  requestChangesOnHandoff,
  subscribeHandoffs,
  type TaskHandoff,
} from './handoff.ts'
import { Failed, List, Middle, Waiting } from './List.tsx'
import { People } from './People.tsx'
import { useLive, useMessages, usePeople, useReactions, useReplies, useRooms } from './read.ts'
import { Thread } from './Thread.tsx'
import { tally } from './Run.tsx'

const LEGACY_DM_ALIAS: Record<string, string> = {
  'dm-algo': 'dm-sci',
  'dm-cal': 'dm-mana',
  'dm-core': 'dm-opera',
  'dm-db': 'dm-data',
  'dm-sec': 'dm-cyber',
}

export function Chat() {
  const { id: rawId } = useParams()
  const navigate = useNavigate()
  const id = rawId ? (LEGACY_DM_ALIAS[rawId] ?? rawId) : rawId
  const { plane } = useSpace()
  const rooms = useRooms()
  const room = useMemo(() => (rooms.data ?? []).find((r) => r.id === id) ?? null, [rooms.data, id])
  const approvalsRoom = useMemo(
    () => (rooms.data ?? []).find((r) => r.id === 'c-approvals') ?? null,
    [rooms.data],
  )

  const conversation = useMessages(room?.id ?? null)
  const roster = usePeople()
  const messages = conversation.data ?? []
  const ids = useMemo(() => messages.map((m) => m.id), [messages])
  const feelings = useReactions(ids)
  useLive(room?.id ?? null)

  const [thread, setThread] = useState<string | null>(null)
  const parent = messages.find((m) => m.id === thread) ?? null
  const answers = useReplies(parent?.id ?? null)

  const [handoffs, setHandoffs] = useState<TaskHandoff[]>(() => readHandoffs())
  const [composerOpen, setComposerOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDeliverable, setTaskDeliverable] = useState('')
  const [assigneeHandle, setAssigneeHandle] = useState<string>('@hanzo-dev')
  const [requireApproval, setRequireApproval] = useState(true)

  useEffect(() => {
    setHandoffs(readHandoffs())
    return subscribeHandoffs(() => setHandoffs(readHandoffs()))
  }, [])

  const me = plane?.account ?? ''
  const people = roster.data ?? []
  const reactions = feelings.data ?? []
  const meDisplay = useMemo(
    () => people.find((p) => p.id === me)?.name || 'Team Member',
    [people, me],
  )

  const roomHandoffs = useMemo(
    () => (room ? handoffsForRoom(handoffs, room.id) : []),
    [handoffs, room],
  )

  const onReact = useCallback(
    (message: Message, emoji: string) => {
      if (!plane || !room) return
      const held = tally(reactions.filter((r) => r.message === message.id)).find((g) => g.emoji === emoji)
      const mine = reactions.find((r) => r.message === message.id && r.emoji === emoji && r.by === me)
      void (held && mine
        ? unreact(plane, room, mine)
        : react(plane, room, message, emoji)
      ).then(() => invalidate('chat:reactions:'))
    },
    [plane, room, reactions, me],
  )

  const handleSubmitHandoff = useCallback(() => {
    if (!plane || !room || !taskTitle.trim()) return
    const created = createTaskHandoff({
      title: taskTitle,
      deliverable: taskDeliverable,
      assigneeHandle,
      assignedBy: meDisplay,
      sourceRoomId: room.id,
      sourceRoomName: room.name,
      requireApproval,
    })
    setTaskTitle('')
    setTaskDeliverable('')
    setComposerOpen(false)

    const summaryLine = created.status === 'waiting_approval'
      ? `Task handed off to ${created.ownerHandle}: "${created.title}" · Deliverable: ${created.deliverable} · Waiting for approval in #approvals.`
      : `Task completed by ${created.ownerHandle}: "${created.title}" · Deliverable: ${created.deliverable}.`

    void say(plane, room, summaryLine).then(() => invalidate('chat:messages:'))
    if (created.status === 'waiting_approval' && approvalsRoom && approvalsRoom.id !== room.id) {
      void say(
        plane,
        approvalsRoom,
        `Approval requested from #${created.sourceRoomName} · Owner: ${created.ownerHandle} · Task: "${created.title}" · Deliverable: ${created.deliverable}`,
      ).then(() => invalidate('chat:messages:'))
    }
  }, [plane, room, approvalsRoom, taskTitle, taskDeliverable, assigneeHandle, meDisplay, requireApproval])

  const handleApproveHandoff = useCallback(
    (item: TaskHandoff) => {
      if (!plane) return
      const resolved = approveTaskHandoff(item.id, meDisplay)
      if (!resolved) return
      const sourceRoom = (rooms.data ?? []).find((r) => r.id === resolved.sourceRoomId)
      const notice = `Approved by ${meDisplay} · ${resolved.resultSummary ?? ''}`
      if (approvalsRoom) {
        void say(plane, approvalsRoom, notice).then(() => invalidate('chat:messages:'))
      }
      if (sourceRoom && sourceRoom.id !== approvalsRoom?.id) {
        void say(plane, sourceRoom, notice).then(() => invalidate('chat:messages:'))
      }
    },
    [plane, meDisplay, rooms.data, approvalsRoom],
  )

  const handleRequestChanges = useCallback(
    (item: TaskHandoff) => {
      requestChangesOnHandoff(item.id, meDisplay)
    },
    [meDisplay],
  )

  if (!id) return <Pick />
  if (rooms.phase === 'failure') return <Failed error={rooms.error} onRetry={rooms.reload} />
  if (rooms.phase === 'loading' || !plane) return <Waiting />
  if (!room) return <Gone />

  return (
    <XStack flex={1} minH={0}>
      <YStack flex={1} minW={0} minH={0}>
        <Header
          room={room}
          people={people}
          handoffOpen={composerOpen}
          onToggleHandoff={() => setComposerOpen((v) => !v)}
          waitingCount={handoffs.filter((h) => h.status === 'waiting_approval').length}
          onOpenApprovals={() => navigate('/chat/c-approvals')}
        />

        {composerOpen ? (
          <HandoffComposer
            roomName={room.name}
            taskTitle={taskTitle}
            onChangeTitle={setTaskTitle}
            taskDeliverable={taskDeliverable}
            onChangeDeliverable={setTaskDeliverable}
            assigneeHandle={assigneeHandle}
            onChangeAssignee={setAssigneeHandle}
            requireApproval={requireApproval}
            onToggleApproval={() => setRequireApproval((v) => !v)}
            onSubmit={handleSubmitHandoff}
            onCancel={() => setComposerOpen(false)}
          />
        ) : null}

        {room.id === 'c-approvals' ? (
          <ApprovalInboxPanel
            items={roomHandoffs}
            onApprove={handleApproveHandoff}
            onRequestChanges={handleRequestChanges}
            onJumpRoom={(roomId) => navigate(`/chat/${roomId}`)}
          />
        ) : roomHandoffs.length > 0 ? (
          <ChannelHandoffsStrip
            items={roomHandoffs}
            onOpenApprovals={() => navigate('/chat/c-approvals')}
          />
        ) : null}

        <List
          room={room}
          phase={conversation.phase}
          error={conversation.error}
          messages={messages}
          people={people}
          reactions={reactions}
          me={me}
          onRetry={conversation.reload}
          onReact={onReact}
          onOpen={(m) => setThread(m.id)}
          open={thread ?? undefined}
        />

        <Composer
          placeholder={room.kind === 'direct' ? `Message ${room.name}` : `Message #${room.name}`}
          onSend={(text) => say(plane, room, text)}
        />
      </YStack>

      {parent ? (
        <Thread
          room={room}
          parent={parent}
          replies={answers.data ?? []}
          phase={answers.phase}
          error={answers.error}
          people={people}
          reactions={reactions}
          me={me}
          onClose={() => setThread(null)}
          onRetry={answers.reload}
          onReact={onReact}
          onSend={(text) => reply(plane, room, parent, text)}
        />
      ) : null}
    </XStack>
  )
}

function HandoffComposer({
  roomName,
  taskTitle,
  onChangeTitle,
  taskDeliverable,
  onChangeDeliverable,
  assigneeHandle,
  onChangeAssignee,
  requireApproval,
  onToggleApproval,
  onSubmit,
  onCancel,
}: {
  roomName: string
  taskTitle: string
  onChangeTitle: (v: string) => void
  taskDeliverable: string
  onChangeDeliverable: (v: string) => void
  assigneeHandle: string
  onChangeAssignee: (v: string) => void
  requireApproval: boolean
  onToggleApproval: () => void
  onSubmit: () => void
  onCancel: () => void
}) {
  const selectedPreset = HANDOFF_ASSIGNEES.find((a) => a.handle === assigneeHandle)
  return (
    <YStack
      data-testid="handoff-composer"
      px={20}
      py={14}
      gap={10}
      bg="$background"
      borderBottomWidth={1}
      borderBottomColor="$edge"
    >
      <XStack items="center" justify="space-between" gap={8} flexWrap="wrap">
        <SizableText fontSize={rung.small} fontWeight="600" color="$ink">
          {`Hand off task from #${roomName}`}
        </SizableText>
        <SizableText fontSize={rung.chip} color="$quiet">
          {`Owner after handoff: ${assigneeHandle} (${selectedPreset?.role ?? 'Teammate'})`}
        </SizableText>
      </XStack>

      <XStack gap={8} flexWrap="wrap">
        {HANDOFF_ASSIGNEES.map((item) => {
          const active = item.handle === assigneeHandle
          return (
            <XStack
              key={item.handle}
              {...press(() => onChangeAssignee(item.handle), `Assign to ${item.handle}`)}
              px={10}
              py={4}
              rounded={round.pill}
              bg={active ? '$hover' : '$panel'}
              borderWidth={1}
              borderColor={active ? '$bound' : '$edge'}
              items="center"
              gap={6}
              focusVisibleStyle={ring}
            >
              <SizableText fontSize={rung.chip} fontWeight={active ? '600' : '500'} color={active ? '$ink' : '$quiet'}>
                {item.handle}
              </SizableText>
            </XStack>
          )
        })}
      </XStack>

      <XStack gap={10} flexWrap="wrap">
        <Input
          flex={1}
          minW={220}
          height={34}
          px={10}
          fontSize={rung.body}
          color="$ink"
          bg="$panel"
          borderWidth={1}
          borderColor="$edge"
          rounded={round.field}
          value={taskTitle}
          onChangeText={onChangeTitle}
          placeholder="Task to hand off (e.g. Add webhook signature verification)"
          aria-label="Task title"
        />
        <Input
          flex={1}
          minW={220}
          height={34}
          px={10}
          fontSize={rung.body}
          color="$ink"
          bg="$panel"
          borderWidth={1}
          borderColor="$edge"
          rounded={round.field}
          value={taskDeliverable}
          onChangeText={onChangeDeliverable}
          placeholder="Expected deliverable (e.g. PR + passing smoke report)"
          aria-label="Expected deliverable"
        />
      </XStack>

      <XStack items="center" justify="space-between" gap={10} flexWrap="wrap">
        <XStack
          {...press(onToggleApproval, 'Toggle #approvals gate')}
          px={9}
          py={4}
          rounded={round.field}
          bg={requireApproval ? '$hover' : '$panel'}
          borderWidth={1}
          borderColor={requireApproval ? '$bound' : '$edge'}
          items="center"
          gap={6}
          focusVisibleStyle={ring}
        >
          <Check size={12} color={requireApproval ? '$ink' : '$dim'} />
          <SizableText fontSize={rung.chip} color={requireApproval ? '$ink' : '$quiet'}>
            {requireApproval
              ? 'Require human sign-off in #approvals before execution'
              : 'Execute immediately without approval gate'}
          </SizableText>
        </XStack>

        <XStack items="center" gap={8}>
          <XStack
            {...press(onCancel, 'Cancel handoff')}
            px={10}
            py={5}
            rounded={round.field}
            bg="$panel"
            borderWidth={1}
            borderColor="$edge"
            focusVisibleStyle={ring}
          >
            <SizableText fontSize={rung.chip} color="$quiet">
              Cancel
            </SizableText>
          </XStack>
          <XStack
            data-testid="submit-handoff-btn"
            {...press(onSubmit, `Hand off to ${assigneeHandle}`)}
            px={12}
            py={5}
            rounded={round.field}
            bg="$ink"
            items="center"
            gap={6}
            opacity={taskTitle.trim() ? 1 : 0.5}
            focusVisibleStyle={ring}
          >
            <SizableText fontSize={rung.chip} fontWeight="600" style={{ color: paint.panel }}>
              {`Hand off to ${assigneeHandle}`}
            </SizableText>
            <ArrowRight size={12} color={paint.panel} />
          </XStack>
        </XStack>
      </XStack>
    </YStack>
  )
}

function ApprovalInboxPanel({
  items,
  onApprove,
  onRequestChanges,
  onJumpRoom,
}: {
  items: TaskHandoff[]
  onApprove: (item: TaskHandoff) => void
  onRequestChanges: (item: TaskHandoff) => void
  onJumpRoom: (roomId: string) => void
}) {
  const waiting = items.filter((h) => h.status === 'waiting_approval')
  const resolved = items.filter((h) => h.status !== 'waiting_approval')

  return (
    <YStack
      data-testid="team-approval-inbox"
      px={20}
      py={12}
      gap={10}
      bg="$background"
      borderBottomWidth={1}
      borderBottomColor="$edge"
      maxH={320}
      overflow="scroll"
    >
      <XStack items="center" justify="space-between" gap={8}>
        <SizableText fontSize={rung.chip} fontWeight="600" color="$quiet" {...caps}>
          {`Approval Inbox · ${waiting.length} waiting · ${resolved.length} resolved`}
        </SizableText>
      </XStack>

      {waiting.map((item) => (
        <YStack
          key={item.id}
          data-testid="approval-card-waiting"
          p={12}
          gap={6}
          rounded={round.panel}
          bg="$panel"
          borderWidth={1}
          borderColor="$bound"
        >
          <XStack items="center" justify="space-between" gap={8} flexWrap="wrap">
            <XStack items="center" gap={8} flexWrap="wrap">
              <YStack width={8} height={8} rounded={round.pill} style={{ background: state.doing }} />
              <SizableText fontSize={rung.body} fontWeight="600" color="$ink">
                {item.title}
              </SizableText>
            </XStack>
            <XStack items="center" gap={6}>
              <XStack px={8} py={2} rounded={round.pill} bg="$hover" borderWidth={1} borderColor="$edge">
                <SizableText fontSize={rung.chip} fontWeight="600" color="$ink">
                  {`Owner: ${item.ownerHandle}`}
                </SizableText>
              </XStack>
              <XStack
                {...press(() => onJumpRoom(item.sourceRoomId), `Open #${item.sourceRoomName}`)}
                px={8}
                py={2}
                rounded={round.pill}
                bg="$raised"
                borderWidth={1}
                borderColor="$edge"
                focusVisibleStyle={ring}
              >
                <SizableText fontSize={rung.chip} color="$quiet">
                  {`#${item.sourceRoomName}`}
                </SizableText>
              </XStack>
            </XStack>
          </XStack>

          <SizableText fontSize={rung.small} color="$ink">
            {`Deliverable: ${item.deliverable}`}
          </SizableText>
          <SizableText fontSize={rung.chip} color="$quiet">
            {`Why decision is needed: ${item.approvalReason}`}
          </SizableText>
          <SizableText fontSize={rung.chip} color="$dim">
            {`What Approve will do: ${item.approveEffect}`}
          </SizableText>

          <XStack items="center" justify="flex-end" gap={8} pt={4}>
            <XStack
              {...press(() => onRequestChanges(item), `Request changes on ${item.title}`)}
              px={10}
              py={5}
              rounded={round.field}
              bg="$raised"
              borderWidth={1}
              borderColor="$edge"
              focusVisibleStyle={ring}
            >
              <SizableText fontSize={rung.chip} fontWeight="500" color="$quiet">
                Request changes
              </SizableText>
            </XStack>
            <XStack
              data-testid="approve-handoff-btn"
              {...press(() => onApprove(item), `Approve ${item.title}`)}
              px={12}
              py={5}
              rounded={round.field}
              bg="$ink"
              items="center"
              gap={6}
              focusVisibleStyle={ring}
            >
              <Check size={12} color={paint.panel} />
              <SizableText fontSize={rung.chip} fontWeight="600" style={{ color: paint.panel }}>
                Approve & deliver
              </SizableText>
            </XStack>
          </XStack>
        </YStack>
      ))}

      {resolved.map((item) => (
        <YStack
          key={item.id}
          data-testid="approval-card-completed"
          p={10}
          gap={4}
          rounded={round.panel}
          bg="$panel"
          borderWidth={1}
          borderColor="$edge"
        >
          <XStack items="center" justify="space-between" gap={8} flexWrap="wrap">
            <XStack items="center" gap={8}>
              <YStack
                width={8}
                height={8}
                rounded={round.pill}
                style={{ background: item.status === 'completed' ? state.done : state.todo }}
              />
              <SizableText fontSize={rung.small} fontWeight="600" color="$ink">
                {item.title}
              </SizableText>
            </XStack>
            <XStack
              {...press(() => onJumpRoom(item.sourceRoomId), `View in #${item.sourceRoomName}`)}
              px={8}
              py={2}
              rounded={round.pill}
              bg="$raised"
              borderWidth={1}
              borderColor="$edge"
              focusVisibleStyle={ring}
            >
              <SizableText fontSize={rung.chip} color="$quiet">
                {`#${item.sourceRoomName} →`}
              </SizableText>
            </XStack>
          </XStack>
          {item.resultSummary ? (
            <SizableText fontSize={rung.chip} color="$ink">
              {item.resultSummary}
            </SizableText>
          ) : null}
          {item.resultArtifact ? (
            <SizableText fontSize={rung.chip} color="$dim">
              {item.resultArtifact}
            </SizableText>
          ) : null}
        </YStack>
      ))}
    </YStack>
  )
}

function ChannelHandoffsStrip({
  items,
  onOpenApprovals,
}: {
  items: TaskHandoff[]
  onOpenApprovals: () => void
}) {
  return (
    <YStack
      data-testid="channel-handoffs-strip"
      px={20}
      py={10}
      gap={8}
      bg="$background"
      borderBottomWidth={1}
      borderBottomColor="$edge"
    >
      <XStack items="center" justify="space-between">
        <SizableText fontSize={rung.chip} fontWeight="600" color="$quiet" {...caps}>
          {`Channel Handoffs & Deliverables (${items.length})`}
        </SizableText>
        <XStack
          {...press(onOpenApprovals, 'Open #approvals inbox')}
          px={8}
          py={2}
          rounded={round.pill}
          bg="$panel"
          borderWidth={1}
          borderColor="$edge"
          focusVisibleStyle={ring}
        >
          <SizableText fontSize={rung.chip} color="$quiet">
            Open #approvals →
          </SizableText>
        </XStack>
      </XStack>

      {items.slice(0, 3).map((item) => (
        <XStack
          key={item.id}
          p={9}
          rounded={round.field}
          bg="$panel"
          borderWidth={1}
          borderColor="$edge"
          items="center"
          justify="space-between"
          gap={10}
          flexWrap="wrap"
        >
          <YStack flex={1} minW={200} gap={2}>
            <XStack items="center" gap={6} flexWrap="wrap">
              <YStack
                width={7}
                height={7}
                rounded={round.pill}
                style={{
                  background: item.status === 'completed' ? state.done : state.doing,
                }}
              />
              <SizableText fontSize={rung.small} fontWeight="600" color="$ink">
                {item.title}
              </SizableText>
              <SizableText fontSize={rung.chip} color="$quiet">
                {`· Owner: ${item.ownerHandle}`}
              </SizableText>
            </XStack>
            <SizableText fontSize={rung.chip} color="$dim">
              {item.status === 'completed' && item.resultSummary
                ? item.resultSummary
                : `Deliverable: ${item.deliverable}`}
            </SizableText>
          </YStack>

          <XStack
            {...press(onOpenApprovals, 'Review in #approvals')}
            px={9}
            py={4}
            rounded={round.pill}
            bg={item.status === 'waiting_approval' ? '$hover' : '$raised'}
            borderWidth={1}
            borderColor={item.status === 'waiting_approval' ? '$bound' : '$edge'}
            focusVisibleStyle={ring}
          >
            <SizableText fontSize={rung.chip} fontWeight="600" color="$ink">
              {item.status === 'waiting_approval'
                ? 'Waiting in #approvals →'
                : item.status === 'completed'
                  ? 'Completed ✓'
                  : 'Changes requested'}
            </SizableText>
          </XStack>
        </XStack>
      ))}
    </YStack>
  )
}

function Header({
  room,
  people,
  handoffOpen,
  onToggleHandoff,
  waitingCount,
  onOpenApprovals,
}: {
  room: Room
  people: ReturnType<typeof usePeople>['data']
  handoffOpen: boolean
  onToggleHandoff: () => void
  waitingCount: number
  onOpenApprovals: () => void
}) {
  const [techOpen, setTechOpen] = useState(false)
  const unread = useNotices()
  const asideShowing = useAside()
  const asideKind = useAsideKind()
  const agent: AgentPreset | undefined = room.id.startsWith('dm-')
    ? HANZO_AGENTS.find((a) => `dm-${a.id}` === room.id)
    : undefined

  return (
    <YStack borderBottomWidth={1} borderBottomColor="$edge" bg="$panel">
      <XStack px={20} py={10} items="center" justify="space-between" gap={12} flexWrap="wrap">
        {agent ? (
          <XStack flex={1} minW={0} items="center" gap={12}>
            <YStack position="relative" shrink={0}>
              <YStack
                width={34}
                height={34}
                rounded={round.pill}
                overflow="hidden"
                bg="$background"
                borderWidth={1}
                borderColor="$edge"
                items="center"
                justify="center"
              >
                <img
                  src={agent.avatar}
                  alt={agent.name}
                  width={34}
                  height={34}
                  style={{ width: 34, height: 34, objectFit: 'cover', display: 'block' }}
                />
              </YStack>
              <YStack
                position="absolute"
                b={-1}
                r={-1}
                width={9}
                height={9}
                rounded={round.pill}
                bg="$ink"
                borderWidth={1.5}
                borderColor="$panel"
              />
            </YStack>

            <YStack flex={1} minW={0} gap={2}>
              <XStack items="center" gap={8} flexWrap="wrap">
                <SizableText fontSize={rung.row} fontWeight="600" color="$ink">
                  {agent.name}
                </SizableText>
                <XStack
                  px={7}
                  py={2}
                  rounded={round.field}
                  bg="$raised"
                  borderWidth={1}
                  borderColor="$edge"
                >
                  <SizableText fontSize={rung.chip} fontWeight="500" color="$quiet">
                    {agent.role}
                  </SizableText>
                </XStack>
                <XStack
                  px={7}
                  py={2}
                  rounded={round.pill}
                  bg="$hover"
                  items="center"
                  gap={5}
                >
                  <YStack width={5} height={5} rounded={round.pill} bg="$ink" />
                  <SizableText fontSize={rung.chip} fontWeight="500" color="$ink">
                    {`Available 24/7 · ${humanSchedule(agent.schedule)}`}
                  </SizableText>
                </XStack>
              </XStack>

              <SizableText fontSize={rung.small} color="$dim" numberOfLines={1}>
                {agent.status}
              </SizableText>
            </YStack>
          </XStack>
        ) : (
          <XStack flex={1} minW={0} items="center" gap={10}>
            <XStack items="center" gap={6} shrink={0}>
              {room.kind === 'direct' ? null : room.private ? (
                <Lock size={16} color="$quiet" />
              ) : (
                <Hash size={17} color="$quiet" />
              )}
              <SizableText fontSize={rung.row} fontWeight="600" color="$ink" numberOfLines={1}>
                {room.name}
              </SizableText>
            </XStack>
            {room.topic ? (
              <>
                <YStack width={1} height={14} bg="$edge" shrink={0} />
                <SizableText fontSize={rung.small} color="$dim" numberOfLines={1} flex={1}>
                  {room.topic}
                </SizableText>
              </>
            ) : null}
          </XStack>
        )}

        <XStack items="center" gap={8} shrink={0} flexWrap="wrap">
          {room.kind === 'channel' && room.id !== 'c-approvals' ? (
            <XStack
              data-testid="open-handoff-composer"
              {...press(onToggleHandoff, 'Hand off task to teammate or @hanzo-dev')}
              aria-expanded={handoffOpen}
              px={10}
              py={5}
              rounded={round.field}
              bg={handoffOpen ? '$hover' : '$raised'}
              borderWidth={1}
              borderColor={handoffOpen ? '$bound' : '$edge'}
              items="center"
              gap={5}
              hoverStyle={{ background: '$hover' }}
              focusVisibleStyle={ring}
            >
              <Plus size={13} color="$ink" />
              <SizableText fontSize={rung.chip} fontWeight="600" color="$ink">
                Hand off task
              </SizableText>
            </XStack>
          ) : null}

          {room.id !== 'c-approvals' && waitingCount > 0 ? (
            <XStack
              {...press(onOpenApprovals, `Open #approvals (${waitingCount} waiting)`)}
              px={9}
              py={5}
              rounded={round.field}
              bg="$raised"
              borderWidth={1}
              borderColor="$edge"
              items="center"
              gap={5}
              hoverStyle={{ background: '$hover' }}
              focusVisibleStyle={ring}
            >
              <SizableText fontSize={rung.chip} fontWeight="500" color="$quiet">
                {`#approvals (${waitingCount})`}
              </SizableText>
            </XStack>
          ) : null}

          {agent ? (
            <>
              <XStack
                {...press(() => setTechOpen((v) => !v), 'Toggle technical details')}
                aria-expanded={techOpen}
                px={9}
                py={5}
                rounded={round.field}
                bg={techOpen ? '$hover' : '$raised'}
                borderWidth={1}
                borderColor={techOpen ? '$bound' : '$edge'}
                items="center"
                gap={5}
                hoverStyle={{ background: '$hover' }}
                focusVisibleStyle={ring}
              >
                <Code size={13} color="$quiet" />
                <SizableText fontSize={rung.chip} fontWeight="500" color="$quiet">
                  Technical details
                </SizableText>
              </XStack>

              <XStack
                {...press(() => toggleAsideKind('inspector'), 'Toggle agent sandbox & inspector')}
                aria-pressed={asideShowing && asideKind === 'inspector'}
                px={9}
                py={5}
                rounded={round.field}
                bg={asideShowing && asideKind === 'inspector' ? '$hover' : '$raised'}
                borderWidth={1}
                borderColor={asideShowing && asideKind === 'inspector' ? '$bound' : '$edge'}
                items="center"
                gap={5}
                hoverStyle={{ background: '$hover' }}
                focusVisibleStyle={ring}
              >
                <Monitor size={13} color="$quiet" />
                <SizableText fontSize={rung.chip} fontWeight="500" color="$quiet">
                  Computer
                </SizableText>
              </XStack>
            </>
          ) : (
            <People members={room.members} people={people ?? []} />
          )}

          <XStack
            {...press(() => toggleAsideKind('inbox'), 'Toggle Inbox drawer')}
            aria-pressed={asideShowing && asideKind === 'inbox'}
            px={9}
            py={5}
            rounded={round.field}
            bg={asideShowing && asideKind === 'inbox' ? '$hover' : '$raised'}
            borderWidth={1}
            borderColor={asideShowing && asideKind === 'inbox' ? '$bound' : '$edge'}
            items="center"
            gap={6}
            hoverStyle={{ background: '$hover' }}
            focusVisibleStyle={ring}
          >
            <Bell size={13} color={asideShowing && asideKind === 'inbox' ? '$ink' : '$quiet'} />
            <SizableText
              fontSize={rung.chip}
              fontWeight="500"
              color={asideShowing && asideKind === 'inbox' ? '$ink' : '$quiet'}
            >
              Inbox
            </SizableText>
            {unread > 0 ? (
              <YStack
                minW={16}
                height={16}
                px={4}
                rounded={round.pill}
                items="center"
                justify="center"
                style={{ background: paint.alert }}
              >
                <SizableText
                  fontSize={10}
                  lineHeight={12}
                  fontWeight="700"
                  style={{ color: paint.panel }}
                >
                  {unread}
                </SizableText>
              </YStack>
            ) : null}
          </XStack>
        </XStack>
      </XStack>

      {agent && techOpen ? (
        <XStack
          px={20}
          py={8}
          bg="$background"
          borderTopWidth={1}
          borderColor="$edge"
          items="center"
          justify="space-between"
          flexWrap="wrap"
          gap={12}
        >
          <XStack items="center" gap={16} flexWrap="wrap">
            <XStack items="center" gap={6}>
              <SizableText fontSize={rung.chip} color="$dim">
                Cron Schedule:
              </SizableText>
              <XStack px={6} py={1} rounded={round.field} bg="$panel" borderWidth={1} borderColor="$edge">
                <SizableText fontSize={rung.chip} fontWeight="600" color="$ink">
                  {agent.schedule}
                </SizableText>
              </XStack>
            </XStack>

            <XStack items="center" gap={6}>
              <SizableText fontSize={rung.chip} color="$dim">
                Triggers:
              </SizableText>
              <SizableText fontSize={rung.chip} fontWeight="500" color="$quiet">
                {agent.triggers.join(', ')}
              </SizableText>
            </XStack>

            <XStack items="center" gap={6}>
              <SizableText fontSize={rung.chip} color="$dim">
                Department:
              </SizableText>
              <SizableText fontSize={rung.chip} fontWeight="500" color="$quiet">
                {agent.department}
              </SizableText>
            </XStack>

            <XStack items="center" gap={6}>
              <SizableText fontSize={rung.chip} color="$dim">
                Agent ID:
              </SizableText>
              <SizableText fontSize={rung.chip} fontWeight="500" color="$quiet">
                {`bot-${agent.id}`}
              </SizableText>
            </XStack>
          </XStack>
        </XStack>
      ) : null}
    </YStack>
  )
}

const Pick = () => (
  <Middle>
    <EmptyState
      icon={MessagesSquare}
      title="Chat"
      description="Choose a channel or a conversation to read it."
    />
  </Middle>
)

const Gone = () => (
  <Middle>
    <EmptyState
      icon={MessagesSquare}
      title="No such room"
      description="It may have been archived, or it may belong to another space."
    />
  </Middle>
)
