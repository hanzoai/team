/**
 * Interactive Issue Detail & Edit Drawer + New Issue Modal for Hanzo Team Tracker.
 *
 * Connected to `Source` (`source.update`, `source.move`, `source.add`, `source.remove`)
 * so edits to title, description, status, priority, completion %, assignee/bot,
 * labels immediately persist to the workspace plane and sync to
 * `https://api.hanzo.ai/v1/task/board`.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Badge, Button, Input, ScrollArea, Separator, SizableText, XStack, YStack } from '@hanzo/ui'
import {
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileCheck2,
  History,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Tag,
  Trash2,
  User,
  X,
} from '@hanzogui/lucide-icons-2'

import { useSession } from '~/data/session.tsx'
import {
  approvalLabel,
  approveHandoff,
  createHandoff,
  formatHandoff,
  handoffNextAction,
  issueHandoffPatch,
  parseHandoff,
  requestChanges,
  submitDeliverable,
} from '~/handoff/handoff.ts'
import { setAsideKind, showAside } from '~/shell/aside.ts'
import { caps, paint, ring, round, rung, state } from '~/theme/theme.ts'
import { NAME, PRIORITY, STATUS, type Issue, type IssuePatch, type Person, type Source } from './board/model.ts'
import { People } from './board/People.tsx'
import { Ring } from './board/Ring.tsx'
import { dot, tone } from './board/tone.ts'
import {
  chatSourceHref,
  fromDateInput,
  parseChatSource,
  toDateInput,
} from './source.ts'

const AVAILABLE_LABELS = [
  'Backend',
  'Frontend',
  'Devops',
  'Feature',
  'Design',
  'Sales',
  'Marketing',
  'QA',
  'Research',
] as const

const DONE_STEPS = [0, 0.25, 0.5, 0.75, 1] as const

const cap = (s: string): string => s[0]!.toUpperCase() + s.slice(1)

export function IssueDrawer({
  issue,
  source,
  people,
  onClose,
}: {
  issue: Issue
  source: Source
  people: Person[]
  onClose: () => void
}) {
  const navigate = useNavigate()
  const { who } = useSession()
  const actorName = who?.label || who?.name || 'Teammate'
  const parsed = useMemo(() => parseHandoff(issue.description), [issue.description])
  const parsedSource = useMemo(() => parseChatSource(parsed.body), [parsed.body])
  const handoff = parsed.handoff
  const chatSource: ChatSource | null =
    parsedSource.source ??
    (handoff?.sourceRoomId && handoff?.sourceRoomName
      ? { roomId: handoff.sourceRoomId, roomName: handoff.sourceRoomName, messageId: handoff.sourceMessageId }
      : null)

  const [title, setTitle] = useState(issue.title)
  const [description, setDescription] = useState(parsedSource.body)
  const [dueDateStr, setDueDateStr] = useState(toDateInput(issue.dueDate))
  const [customTag, setCustomTag] = useState('')
  const [savedNotice, setSavedNotice] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [refused, setRefused] = useState<string | null>(null)
  const [approvalRequired, setApprovalRequired] = useState(handoff?.approvalRequired ?? true)
  const [handoffNextActionInput, setHandoffNextActionInput] = useState('')
  const [deliverableSummary, setDeliverableSummary] = useState(handoff?.deliverable?.summary ?? '')
  const [deliverableArtifact, setDeliverableArtifact] = useState(handoff?.deliverable?.artifact ?? '')
  const [showPriorVersions, setShowPriorVersions] = useState(false)
  const [reviewNote, setReviewNote] = useState('')

  useEffect(() => {
    setTitle(issue.title)
    setDescription(parsedSource.body)
    setDueDateStr(toDateInput(issue.dueDate))
    setApprovalRequired(parsed.handoff?.approvalRequired ?? true)
    setDeliverableSummary(parsed.handoff?.deliverable?.summary ?? '')
    setDeliverableArtifact(parsed.handoff?.deliverable?.artifact ?? '')
  }, [issue.id, issue.title, issue.dueDate, parsedSource.body, parsed.handoff])

  const bodyWithSource = (raw: string) => formatChatSource(raw, parsedSource.source)
  // A question asked about one issue is not asked about the next one opened.
  useEffect(() => {
    setConfirming(false)
    setRefused(null)
    setReviewNote('')
    setHandoffNextActionInput('')
    setShowPriorVersions(false)
  }, [issue.id])

  const removeIssue = async () => {
    if (!source.remove || removing) return
    setRemoving(true)
    setRefused(null)
    try {
      await source.remove(issue.id)
      onClose()
    } catch (e) {
      setRefused(e instanceof Error ? e.message : String(e))
    } finally {
      setRemoving(false)
    }
  }

  const patchIssue = (patch: IssuePatch) => {
    if (source.update) {
      void source.update(issue.id, patch)
    } else if (patch.status) {
      void source.move(issue.id, patch.status)
    }
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 1200)
  }

  const saveTextChanges = () => {
    const nextTitle = title.trim() || issue.title
    patchIssue({
      title: nextTitle,
      description: formatHandoff(bodyWithSource(description), handoff),
    })
  }

  const handOffTo = (person: Person) => {
    const meta = createHandoff({
      owner: {
        id: person.id,
        name: person.name,
        kind: person.bot ? 'bot' : 'person',
        face: person.face,
      },
      handedOffBy: actorName,
      approvalRequired,
      nextAction: handoffNextActionInput.trim() || undefined,
      ...(chatSource
        ? {
            sourceRoomId: chatSource.roomId,
            sourceRoomName: chatSource.roomName,
            sourceMessageId: chatSource.messageId,
          }
        : {}),
    })
    patchIssue(issueHandoffPatch(issue, meta, bodyWithSource(description)))
    setHandoffNextActionInput('')
    if (approvalRequired) {
      setAsideKind('inbox')
      showAside()
    }
  }

  const onSaveDeliverable = () => {
    const clean = deliverableSummary.trim()
    if (!clean) return
    const assignee = issue.people[0]
    const base =
      handoff ??
      createHandoff({
        owner: {
          id: assignee?.id ?? 'owner',
          name: assignee?.name ?? actorName,
          kind: assignee?.bot ? 'bot' : 'person',
          face: assignee?.face,
        },
        handedOffBy: actorName,
        approvalRequired,
        ...(chatSource
          ? {
              sourceRoomId: chatSource.roomId,
              sourceRoomName: chatSource.roomName,
              sourceMessageId: chatSource.messageId,
            }
          : {}),
      })
    const next = submitDeliverable(base, {
      summary: clean,
      artifact: deliverableArtifact.trim() || undefined,
      completedBy: base.owner.name,
    })
    patchIssue(issueHandoffPatch(issue, next, bodyWithSource(description)))
    if (next.approvalState === 'pending') {
      setAsideKind('inbox')
      showAside()
    }
  }

  const onApprove = () => {
    if (!handoff) return
    const next = approveHandoff(handoff, {
      approvedBy: actorName,
      note: reviewNote.trim() || undefined,
    })
    patchIssue(issueHandoffPatch(issue, next, bodyWithSource(description)))
    setReviewNote('')
  }

  const onRequestChanges = () => {
    if (!handoff) return
    const next = requestChanges(handoff, {
      reviewedBy: actorName,
      note: reviewNote.trim() || 'Please revise and resubmit.',
    })
    patchIssue(issueHandoffPatch(issue, next, bodyWithSource(description)))
    setReviewNote('')
  }

  const toggleLabel = (label: string) => {
    const exists = issue.labels.includes(label)
    const next = exists ? issue.labels.filter((l) => l !== label) : [...issue.labels, label]
    patchIssue({ labels: next })
  }

  const addCustomLabel = () => {
    const clean = customTag.trim()
    if (!clean) return
    if (!issue.labels.includes(clean)) {
      patchIssue({ labels: [...issue.labels, clean] })
    }
    setCustomTag('')
  }

  const currentAssigneeId = issue.people[0]?.id ?? null

  return (
    <YStack
      data-slot="issue-drawer"
      width="100%"
      maxW={420}
      $md={{ width: 420 }}
      shrink={0}
      borderLeftWidth={1}
      borderColor="$edge"
      bg="$panel"
      height="100%"
    >
      {/* Top Bar */}
      <XStack
        height={48}
        px={16}
        items="center"
        justify="space-between"
        borderBottomWidth={1}
        borderColor="$edge"
        gap={8}
      >
        <XStack items="center" gap={8}>
          <YStack
            width={8}
            height={8}
            rounded={9999}
            style={{ backgroundColor: dot[issue.status] }}
          />
          <SizableText fontSize={rung.body} fontWeight="700" color="$ink">
            {issue.key}
          </SizableText>
          {issue.origin ? (
            <XStack
              px={8}
              height={20}
              rounded={9999}
              bg="$raised"
              borderWidth={1}
              borderColor="$edge"
              items="center"
            >
              <SizableText fontSize={rung.chip} color="$soft">
                {issue.origin.name}
              </SizableText>
            </XStack>
          ) : null}
          {savedNotice ? (
            <XStack items="center" gap={4} px={6} py={2} rounded={round.pill} bg="$hover">
              <Check size={11} color="$ink" />
              <SizableText fontSize={rung.chip} color="$ink">
                Saved
              </SizableText>
            </XStack>
          ) : null}
        </XStack>

        <XStack items="center" gap={4}>
          {source.remove ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete issue"
              disabled={confirming}
              onPress={() => setConfirming(true)}
            >
              <Trash2 size={14} color="$soft" />
            </Button>
          ) : null}
          <Button variant="ghost" size="icon-sm" aria-label="Close issue drawer" onPress={onClose}>
            <X size={15} color="$soft" />
          </Button>
        </XStack>
      </XStack>

      {/* Delete asks once: there is no undo, and the trash sits beside Close. */}
      {confirming ? (
        <YStack px={16} py={12} gap={10} borderBottomWidth={1} borderColor="$edge" bg="$raised" role="alertdialog" aria-label={`Delete ${issue.key}`}>
          <SizableText fontSize={rung.small} color="$ink">
            Delete {issue.key}? This can't be undone.
          </SizableText>
          {refused ? (
            <SizableText fontSize={rung.small} color="$ink" role="alert">
              It was not deleted: {refused}
            </SizableText>
          ) : null}
          <XStack gap={8} justify="flex-end">
            <Button size="sm" variant="ghost" disabled={removing} onPress={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="destructive" disabled={removing} onPress={() => void removeIssue()}>
              {removing ? 'Deleting…' : 'Delete'}
            </Button>
          </XStack>
        </YStack>
      ) : null}

      <ScrollArea flex={1} minH={0}>
        <YStack p={16} gap={16}>
          {/* Title & Description */}
          <YStack gap={8}>
            <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
              Title
            </SizableText>
            <Input
              height={32}
              value={title}
              onChangeText={setTitle}
              onBlur={saveTextChanges}
              fontSize={13}
              fontWeight="600"
              bg="$raised"
              borderColor="$edge"
            />
          </YStack>

          <YStack gap={8}>
            <XStack items="center" justify="space-between">
              <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
                Specification & Notes
              </SizableText>
              <Button
                size="xs"
                height={22}
                px={8}
                rounded={round.field}
                style={{ backgroundColor: paint.accent }}
                onPress={saveTextChanges}
              >
                <SizableText fontSize={11} fontWeight="600" style={{ color: paint.ground }}>
                  Save
                </SizableText>
              </Button>
            </XStack>
            <Input
              height={32}
              value={description}
              onChangeText={setDescription}
              onBlur={saveTextChanges}
              placeholder="Add acceptance criteria, PR links, or technical context..."
              fontSize={12}
              bg="$raised"
              borderColor="$edge"
            />
          </YStack>

          <Separator borderColor="$edge" />

          {/* Status Selector */}
          <YStack gap={8}>
            <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
              Workflow Status
            </SizableText>
            <XStack gap={6} flexWrap="wrap">
              {STATUS.map((s) => {
                const active = issue.status === s
                return (
                  <XStack
                    key={s}
                    role="button"
                    tabIndex={0}
                    cursor="pointer"
                    px={10}
                    height={28}
                    rounded={round.field}
                    items="center"
                    gap={6}
                    bg={active ? '$hover' : '$raised'}
                    borderWidth={1}
                    borderColor={active ? '$ink' : '$edge'}
                    focusVisibleStyle={ring}
                    onPress={() => patchIssue({ status: s })}
                  >
                    <YStack width={7} height={7} rounded={9999} style={{ backgroundColor: dot[s] }} />
                    <SizableText fontSize={rung.small} fontWeight={active ? '700' : '500'} color={active ? '$ink' : '$soft'}>
                      {NAME[s]}
                    </SizableText>
                  </XStack>
                )
              })}
            </XStack>
          </YStack>

          {/* Source conversation link */}
          {chatSource ? (
            <XStack
              role="button"
              tabIndex={0}
              cursor="pointer"
              px={10}
              py={6}
              rounded={round.field}
              bg="$raised"
              borderWidth={1}
              borderColor="$edge"
              items="center"
              justify="space-between"
              gap={8}
              hoverStyle={{ background: '$hover' }}
              focusVisibleStyle={ring}
              onPress={() => navigate(chatSourceHref(chatSource))}
            >
              <SizableText fontSize={rung.small} color="$ink" numberOfLines={1}>
                {`Created from ${chatSource.roomName}`}
              </SizableText>
              <XStack items="center" gap={4} shrink={0}>
                <SizableText fontSize={rung.chip} color="$soft">
                  Open chat
                </SizableText>
                <ExternalLink size={12} color="$soft" />
              </XStack>
            </XStack>
          ) : null}

          {/* Due Date */}
          <YStack gap={8}>
            <XStack items="center" justify="space-between">
              <XStack items="center" gap={6}>
                <Calendar size={12} color="$dim" />
                <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
                  Due Date
                </SizableText>
              </XStack>
              {dueDateStr ? (
                <Button
                  size="xs"
                  variant="ghost"
                  height={20}
                  px={6}
                  onPress={() => {
                    setDueDateStr('')
                    patchIssue({ dueDate: null })
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </XStack>
            <input
              type="date"
              aria-label="Due date"
              value={dueDateStr}
              onChange={(e) => {
                const next = e.target.value
                setDueDateStr(next)
                patchIssue({ dueDate: fromDateInput(next) })
              }}
              style={{
                height: 32,
                padding: '0 10px',
                borderRadius: 6,
                border: `1px solid ${paint.rule}`,
                backgroundColor: paint.card,
                color: paint.ink,
                fontSize: 12,
                width: '100%',
              }}
            />
          </YStack>

          {/* Priority Selector */}
          <YStack gap={8}>
            <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
              Priority
            </SizableText>
            <XStack gap={6} flexWrap="wrap">
              {PRIORITY.map((p) => {
                const active = issue.priority === p
                const { background, color } = tone(cap(p), p)
                return (
                  <XStack
                    key={p}
                    role="button"
                    tabIndex={0}
                    cursor="pointer"
                    px={10}
                    height={26}
                    rounded={round.pill}
                    items="center"
                    borderWidth={1}
                    borderColor={active ? '$ink' : 'transparent'}
                    style={{ backgroundColor: background }}
                    onPress={() => patchIssue({ priority: active ? null : p })}
                  >
                    <SizableText fontSize={rung.chip} fontWeight="700" style={{ color }}>
                      {cap(p)}
                    </SizableText>
                  </XStack>
                )
              })}
            </XStack>
          </YStack>

          {/* Completion % Selector */}
          <YStack gap={8}>
            <XStack items="center" justify="space-between">
              <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
                Completion Progress
              </SizableText>
              <XStack items="center" gap={6}>
                <Ring done={issue.done ?? 0} />
                <SizableText fontSize={rung.small} fontWeight="600" color="$ink">
                  {Math.round((issue.done ?? 0) * 100)}%
                </SizableText>
              </XStack>
            </XStack>
            <XStack gap={6}>
              {DONE_STEPS.map((step) => {
                const pct = Math.round(step * 100)
                const active = Math.round((issue.done ?? 0) * 100) === pct
                return (
                  <XStack
                    key={pct}
                    role="button"
                    tabIndex={0}
                    cursor="pointer"
                    flex={1}
                    height={26}
                    rounded={round.field}
                    items="center"
                    justify="center"
                    bg={active ? '$hover' : '$raised'}
                    borderWidth={1}
                    borderColor={active ? '$ink' : '$edge'}
                    onPress={() => patchIssue({ done: step })}
                  >
                    <SizableText fontSize={rung.chip} fontWeight={active ? '700' : '500'} color={active ? '$ink' : '$soft'}>
                      {pct}%
                    </SizableText>
                  </XStack>
                )
              })}
            </XStack>
          </YStack>

          {/* Assignee / Owner (Person or @Bot) */}
          <YStack gap={8}>
            <XStack items="center" justify="space-between" gap={6}>
              <XStack items="center" gap={6}>
                <User size={12} color="$dim" />
                <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
                  Owner & Handoff
                </SizableText>
              </XStack>
              <XStack
                role="button"
                tabIndex={0}
                cursor="pointer"
                items="center"
                gap={5}
                px={7}
                py={2}
                rounded={round.field}
                bg="$raised"
                borderWidth={1}
                borderColor={approvalRequired ? '$ink' : '$edge'}
                focusVisibleStyle={ring}
                onPress={() => setApprovalRequired((v) => !v)}
              >
                <ShieldCheck size={11} color={approvalRequired ? '$ink' : '$soft'} />
                <SizableText fontSize={rung.chip} fontWeight="600" color={approvalRequired ? '$ink' : '$soft'}>
                  {approvalRequired ? 'Approval required' : 'Auto-approve'}
                </SizableText>
              </XStack>
            </XStack>
            <XStack gap={6} flexWrap="wrap">
              {people.slice(0, 12).map((person) => {
                const active = currentAssigneeId === person.id
                return (
                  <XStack
                    key={person.id}
                    role="button"
                    tabIndex={0}
                    cursor="pointer"
                    px={8}
                    height={28}
                    rounded={round.pill}
                    items="center"
                    gap={6}
                    bg={active ? '$hover' : '$raised'}
                    borderWidth={1}
                    borderColor={active ? '$ink' : '$edge'}
                    onPress={() => handOffTo(person)}
                  >
                    {person.bot ? (
                      <Bot size={13} color="$ink" />
                    ) : (
                      <People people={[person]} size={18} show={1} />
                    )}
                    <SizableText fontSize={rung.chip} fontWeight={active ? '700' : '500'} color={active ? '$ink' : '$soft'}>
                      {person.bot ? `@${person.name}` : person.name.split(' ')[0]}
                    </SizableText>
                  </XStack>
                )
              })}
            </XStack>
            <Input
              data-testid="drawer-handoff-next-action"
              height={28}
              fontSize={11}
              placeholder="Optional next action when handing off..."
              value={handoffNextActionInput}
              onChangeText={setHandoffNextActionInput}
              bg="$raised"
              borderColor="$edge"
            />
          </YStack>

          {/* Approval Gate & Resulting Deliverable */}
          <YStack
            data-testid="issue-handoff-panel"
            p={12}
            gap={10}
            rounded={round.card}
            bg="$raised"
            borderWidth={1}
            borderColor="$edge"
          >
            <XStack items="center" justify="space-between" gap={8}>
              <XStack items="center" gap={6}>
                <Send size={13} color="$ink" />
                <SizableText fontSize={rung.chip} fontWeight="700" color="$ink" {...caps}>
                  Approval & Deliverable
                </SizableText>
              </XStack>
              {handoff ? (
                <XStack
                  px={7}
                  py={2}
                  rounded={round.pill}
                  style={{
                    backgroundColor:
                      handoff.approvalState === 'approved'
                        ? state.done
                        : handoff.approvalState === 'pending'
                          ? paint.alert
                          : handoff.approvalState === 'changes_requested'
                            ? paint.composerWarn
                            : state.doing,
                  }}
                >
                  <SizableText
                    fontSize={rung.chip}
                    fontWeight="700"
                    style={{ color: handoff.approvalState === 'pending' ? paint.panel : paint.ground }}
                  >
                    {approvalLabel(handoff.approvalState)}
                  </SizableText>
                </XStack>
              ) : null}
            </XStack>

            {handoff ? (
              <YStack gap={3}>
                <SizableText fontSize={rung.small} color="$soft">
                  {`Owned by ${handoff.owner.kind === 'bot' ? `@${handoff.owner.name}` : handoff.owner.name} · handed off by ${handoff.handedOffBy}`}
                </SizableText>
                <SizableText data-testid="drawer-next-action" fontSize={rung.chip} fontWeight="600" color="$ink">
                  {`Next action: ${handoffNextAction(handoff)}`}
                </SizableText>
              </YStack>
            ) : (
              <SizableText fontSize={rung.small} color="$soft">
                Pick a teammate or @bot above to hand off work, attach a deliverable, and route it to the Approval Inbox.
              </SizableText>
            )}

            {handoff?.deliverable ? (
              <YStack gap={6}>
                <YStack p={10} gap={4} rounded={round.field} bg="$panel" borderWidth={1} borderColor="$edge">
                  <XStack items="center" justify="space-between" gap={6}>
                    <XStack items="center" gap={5}>
                      <FileCheck2 size={13} color={handoff.deliverable.verified ? state.done : paint.ink} />
                      <SizableText fontSize={rung.chip} fontWeight="700" color="$ink">
                        {handoff.deliverable.verified ? 'Verified deliverable' : 'Submitted deliverable'}
                      </SizableText>
                      <XStack px={6} py={1} rounded={round.pill} bg="$raised" borderWidth={1} borderColor="$edge">
                        <SizableText fontSize={rung.chip} fontWeight="700" color="$ink">
                          {`Latest · v${handoff.deliverable.version ?? 1}`}
                        </SizableText>
                      </XStack>
                    </XStack>
                    <SizableText fontSize={rung.chip} color="$dim">
                      {handoff.deliverable.completedBy}
                    </SizableText>
                  </XStack>
                  <SizableText fontSize={rung.small} color="$ink">
                    {handoff.deliverable.summary}
                  </SizableText>
                  {handoff.deliverable.artifact ? (
                    <SizableText fontSize={rung.chip} style={{ color: paint.accent }} numberOfLines={1}>
                      {handoff.deliverable.artifact}
                    </SizableText>
                  ) : null}
                </YStack>

                {handoff.deliverableHistory && handoff.deliverableHistory.length > 0 ? (
                  <YStack gap={5}>
                    <XStack
                      role="button"
                      tabIndex={0}
                      cursor="pointer"
                      items="center"
                      gap={5}
                      self="flex-start"
                      px={7}
                      py={3}
                      rounded={round.field}
                      bg="$panel"
                      borderWidth={1}
                      borderColor="$edge"
                      focusVisibleStyle={ring}
                      onPress={() => setShowPriorVersions((v) => !v)}
                    >
                      <History size={11} color="$soft" />
                      <SizableText fontSize={rung.chip} fontWeight="600" color="$soft">
                        {`Prior versions (${handoff.deliverableHistory.length})`}
                      </SizableText>
                      <ChevronDown
                        size={11}
                        color="$soft"
                        style={{ transform: showPriorVersions ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      />
                    </XStack>

                    {showPriorVersions ? (
                      <YStack gap={5} pl={8} borderLeftWidth={2} borderColor="$edge">
                        {[...handoff.deliverableHistory].reverse().map((prior) => (
                          <YStack
                            key={`v-${prior.version}`}
                            p={8}
                            gap={3}
                            rounded={round.field}
                            bg="$panel"
                            borderWidth={1}
                            borderColor="$edge"
                          >
                            <XStack items="center" justify="space-between" gap={6}>
                              <SizableText fontSize={rung.chip} fontWeight="700" color="$soft">
                                {`v${prior.version} · ${prior.verified ? 'Verified' : 'Unverified'}`}
                              </SizableText>
                              <SizableText fontSize={rung.chip} color="$dim">
                                {prior.completedBy}
                              </SizableText>
                            </XStack>
                            <SizableText fontSize={rung.chip} color="$ink">
                              {prior.summary}
                            </SizableText>
                            {prior.artifact ? (
                              <SizableText fontSize={rung.chip} color="$soft" numberOfLines={1}>
                                {prior.artifact}
                              </SizableText>
                            ) : null}
                          </YStack>
                        ))}
                      </YStack>
                    ) : null}
                  </YStack>
                ) : null}
              </YStack>
            ) : null}

            {handoff?.approvalNote ? (
              <SizableText fontSize={rung.chip} color="$quiet">
                {`${handoff.approvedBy ?? 'Reviewer'}: ${handoff.approvalNote}`}
              </SizableText>
            ) : null}

            {/* Deliverable submission inputs */}
            <YStack gap={6}>
              <Input
                height={30}
                fontSize={12}
                placeholder="Deliverable summary (e.g. PR 412 verified, report ready)..."
                value={deliverableSummary}
                onChangeText={setDeliverableSummary}
                bg="$panel"
                borderColor="$edge"
              />
              <XStack gap={6}>
                <Input
                  flex={1}
                  height={28}
                  fontSize={11}
                  placeholder="Artifact link or path (optional)"
                  value={deliverableArtifact}
                  onChangeText={setDeliverableArtifact}
                  bg="$panel"
                  borderColor="$edge"
                />
                <Button
                  data-testid="drawer-submit-deliverable"
                  size="xs"
                  height={28}
                  px={10}
                  disabled={!deliverableSummary.trim()}
                  style={{ backgroundColor: paint.accent }}
                  onPress={onSaveDeliverable}
                >
                  <SizableText fontSize={rung.chip} fontWeight="700" style={{ color: paint.ground }}>
                    {handoff?.deliverable ? 'Update result' : 'Submit result'}
                  </SizableText>
                </Button>
              </XStack>
            </YStack>

            {/* Reviewer Approval Controls */}
            {handoff && handoff.approvalState !== 'approved' ? (
              <YStack gap={6} pt={4} borderTopWidth={1} borderColor="$edge">
                <Input
                  height={28}
                  fontSize={11}
                  placeholder="Approval or revision note (optional)..."
                  value={reviewNote}
                  onChangeText={setReviewNote}
                  bg="$panel"
                  borderColor="$edge"
                />
                <XStack gap={8}>
                  <Button
                    data-testid="drawer-approve-handoff"
                    size="xs"
                    height={28}
                    flex={1}
                    style={{ backgroundColor: state.done }}
                    onPress={onApprove}
                  >
                    <CheckCircle2 size={13} color={paint.ground} />
                    <SizableText fontSize={rung.chip} fontWeight="700" style={{ color: paint.ground }}>
                      Approve & Complete
                    </SizableText>
                  </Button>
                  <Button
                    data-testid="drawer-request-changes"
                    size="xs"
                    height={28}
                    variant="outline"
                    onPress={onRequestChanges}
                  >
                    <RotateCcw size={12} />
                    <SizableText fontSize={rung.chip} fontWeight="600" color="$ink">
                      Request changes
                    </SizableText>
                  </Button>
                </XStack>
              </YStack>
            ) : null}
          </YStack>

          {/* Labels / Tags */}
          <YStack gap={8}>
            <XStack items="center" gap={6}>
              <Tag size={12} color="$dim" />
              <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
                Labels
              </SizableText>
            </XStack>
            <XStack gap={6} flexWrap="wrap">
              {AVAILABLE_LABELS.map((label) => {
                const active = issue.labels.includes(label)
                const { background, color } = tone(label)
                return (
                  <Badge
                    key={label}
                    variant="default"
                    style={{
                      minHeight: 22,
                      height: 22,
                      paddingLeft: 9,
                      paddingRight: 9,
                      borderRadius: 9999,
                      cursor: 'pointer',
                      backgroundColor: active ? background : 'transparent',
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: active ? color : paint.rule,
                      opacity: active ? 1 : 0.7,
                    }}
                    onClick={() => toggleLabel(label)}
                  >
                    <SizableText fontSize={rung.chip} fontWeight="600" style={{ color: active ? color : paint.mute }}>
                      {active ? `✓ ${label}` : label}
                    </SizableText>
                  </Badge>
                )
              })}
            </XStack>
            <XStack gap={6}>
              <Input
                flex={1}
                height={26}
                fontSize={11}
                placeholder="Add custom label..."
                value={customTag}
                onChangeText={setCustomTag}
                bg="$raised"
                borderColor="$edge"
              />
              <Button size="xs" height={26} px={10} variant="outline" onPress={addCustomLabel}>
                <Plus size={12} />
              </Button>
            </XStack>
          </YStack>
        </YStack>
      </ScrollArea>
    </YStack>
  )
}


export { NewIssueModal, type Choice } from './NewIssueModal.tsx'
