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
  Check,
  CheckCircle2,
  FileCheck2,
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
  issueHandoffPatch,
  parseHandoff,
  requestChanges,
  submitDeliverable,
} from '~/handoff/handoff.ts'
import { setAsideKind, showAside } from '~/shell/aside.ts'
import { caps, paint, ring, round, rung, state } from '~/theme/theme.ts'
import { NAME, PRIORITY, STATUS, type Issue, type IssuePatch, type Person, type Priority, type Source, type Status } from './board/model.ts'
import { People } from './board/People.tsx'
import { Ring } from './board/Ring.tsx'
import { dot, tone } from './board/tone.ts'

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
  const { who } = useSession()
  const actorName = who?.label || who?.name || 'Teammate'
  const parsed = useMemo(() => parseHandoff(issue.description), [issue.description])
  const handoff = parsed.handoff

  const [title, setTitle] = useState(issue.title)
  const [description, setDescription] = useState(parsed.body)
  const [customTag, setCustomTag] = useState('')
  const [savedNotice, setSavedNotice] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [refused, setRefused] = useState<string | null>(null)
  const [approvalRequired, setApprovalRequired] = useState(handoff?.approvalRequired ?? true)
  const [deliverableSummary, setDeliverableSummary] = useState(handoff?.deliverable?.summary ?? '')
  const [deliverableArtifact, setDeliverableArtifact] = useState(handoff?.deliverable?.artifact ?? '')
  const [reviewNote, setReviewNote] = useState('')

  useEffect(() => {
    setTitle(issue.title)
    setDescription(parsed.body)
    setApprovalRequired(parsed.handoff?.approvalRequired ?? true)
    setDeliverableSummary(parsed.handoff?.deliverable?.summary ?? '')
    setDeliverableArtifact(parsed.handoff?.deliverable?.artifact ?? '')
  }, [issue.id, issue.title, parsed.body, parsed.handoff])
  // A question asked about one issue is not asked about the next one opened.
  useEffect(() => {
    setConfirming(false)
    setRefused(null)
    setReviewNote('')
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
      description: formatHandoff(description, handoff),
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
    })
    patchIssue(issueHandoffPatch(issue, meta, description))
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
      })
    const next = submitDeliverable(base, {
      summary: clean,
      artifact: deliverableArtifact.trim() || undefined,
      completedBy: base.owner.name,
    })
    patchIssue(issueHandoffPatch(issue, next, description))
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
    patchIssue(issueHandoffPatch(issue, next, description))
    setReviewNote('')
  }

  const onRequestChanges = () => {
    if (!handoff) return
    const next = requestChanges(handoff, {
      reviewedBy: actorName,
      note: reviewNote.trim() || 'Please revise and resubmit.',
    })
    patchIssue(issueHandoffPatch(issue, next, description))
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
      width={420}
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
              <SizableText fontSize={rung.small} color="$soft">
                {`Owned by ${handoff.owner.kind === 'bot' ? `@${handoff.owner.name}` : handoff.owner.name} · handed off by ${handoff.handedOffBy}`}
              </SizableText>
            ) : (
              <SizableText fontSize={rung.small} color="$soft">
                Pick a teammate or @bot above to hand off work, attach a deliverable, and route it to the Approval Inbox.
              </SizableText>
            )}

            {handoff?.deliverable ? (
              <YStack p={10} gap={4} rounded={round.field} bg="$panel" borderWidth={1} borderColor="$edge">
                <XStack items="center" justify="space-between" gap={6}>
                  <XStack items="center" gap={5}>
                    <FileCheck2 size={13} color={handoff.deliverable.verified ? state.done : paint.ink} />
                    <SizableText fontSize={rung.chip} fontWeight="700" color="$ink">
                      {handoff.deliverable.verified ? 'Verified deliverable' : 'Submitted deliverable'}
                    </SizableText>
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

/** A project the new-issue form can file into. */
export type Choice = { id: string; name: string; identifier: string }

export function NewIssueModal({
  initialStatus = 'backlog',
  people,
  projects,
  onCreate,
  onClose,
}: {
  initialStatus?: Status
  people: Person[]
  /**
   * The projects to choose between, on a board that spans them all. Absent on
   * a project's own board, where the project is already the answer.
   */
  projects?: readonly Choice[]
  onCreate: (status: Status, title: string, patch: IssuePatch) => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Status>(initialStatus)
  const [priority, setPriority] = useState<Priority>('medium')
  const [assigneeId, setAssigneeId] = useState<string | null>(people[0]?.id ?? null)
  const [labels, setLabels] = useState<string[]>(['Feature'])
  const navigate = useNavigate()
  const [project, setProject] = useState<string | null>(projects?.[0]?.id ?? null)
  const [submitting, setSubmitting] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)

  // The list can arrive after the form opens; take its first project then.
  useEffect(() => {
    if (projects && !projects.some((p) => p.id === project)) setProject(projects[0]?.id ?? null)
  }, [projects, project])

  const placed = !projects || !!project

  const toggleLabel = (l: string) => {
    setLabels((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]))
  }

  const submit = async () => {
    const clean = title.trim()
    if (!clean || !placed || submitting) return
    setSubmitting(true)
    setFailed(null)
    try {
      await onCreate(status, clean, {
        description: description.trim() || undefined,
        priority,
        assigneeId,
        labels,
        ...(projects && project ? { project } : {}),
      })
      onClose()
    } catch (e) {
      setFailed(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <YStack
      position="fixed"
      t={0}
      l={0}
      r={0}
      b={0}
      z={1000}
      bg={paint.ground}
      items="center"
      justify="center"
      p={16}
    >
      <YStack
        width="100%"
        maxW={520}
        rounded={round.card}
        borderWidth={1}
        borderColor="$edge"
        bg="$panel"
        overflow="hidden"
      >
        <XStack
          height={46}
          px={16}
          items="center"
          justify="space-between"
          borderBottomWidth={1}
          borderColor="$edge"
        >
          <XStack items="center" gap={8}>
            <Bot size={15} color="$ink" />
            <SizableText fontSize={rung.body} fontWeight="700" color="$ink">
              Create New Issue
            </SizableText>
          </XStack>
          <Button variant="ghost" size="icon-sm" aria-label="Close modal" onPress={onClose}>
            <X size={15} color="$soft" />
          </Button>
        </XStack>

        <YStack p={16} gap={14}>
          {projects ? (
            <YStack gap={6}>
              <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
                Project
              </SizableText>
              {projects.length === 0 ? (
                <XStack items="center" justify="space-between" gap={8} flexWrap="wrap">
                  <SizableText fontSize={rung.small} color="$soft">
                    There is no project to file this in yet.
                  </SizableText>
                  <Button size="sm" variant="outline" onPress={() => navigate('/projects?new')}>
                    New project
                  </Button>
                </XStack>
              ) : (
                <XStack gap={6} flexWrap="wrap">
                  {projects.map((p) => {
                    const active = project === p.id
                    return (
                      <XStack
                        key={p.id}
                        role="button"
                        aria-pressed={active}
                        tabIndex={0}
                        cursor="pointer"
                        px={10}
                        height={26}
                        rounded={round.field}
                        items="center"
                        gap={6}
                        bg={active ? '$hover' : '$raised'}
                        borderWidth={1}
                        borderColor={active ? '$ink' : '$edge'}
                        onPress={() => setProject(p.id)}
                      >
                        <SizableText fontSize={rung.chip} fontWeight="700" color={active ? '$ink' : '$soft'}>
                          {p.identifier}
                        </SizableText>
                        <SizableText fontSize={rung.chip} fontWeight={active ? '600' : '500'} color={active ? '$ink' : '$soft'}>
                          {p.name}
                        </SizableText>
                      </XStack>
                    )
                  })}
                </XStack>
              )}
            </YStack>
          ) : null}

          <YStack gap={6}>
            <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
              Issue Title
            </SizableText>
            <Input
              autoFocus
              placeholder="e.g. Wire real-time webhook retry metrics in hanzo/cloud"
              value={title}
              onChangeText={setTitle}
              fontSize={13}
              bg="$raised"
              borderColor="$edge"
            />
          </YStack>

          <YStack gap={6}>
            <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
              Description & Acceptance Criteria
            </SizableText>
            <Input
              placeholder="Context, repository, and target milestone..."
              value={description}
              onChangeText={setDescription}
              fontSize={12}
              bg="$raised"
              borderColor="$edge"
            />
          </YStack>

          <YStack gap={6}>
            <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
              Status
            </SizableText>
            <XStack gap={6} flexWrap="wrap">
              {STATUS.map((s) => {
                const active = status === s
                return (
                  <XStack
                    key={s}
                    role="button"
                    tabIndex={0}
                    cursor="pointer"
                    px={10}
                    height={26}
                    rounded={round.field}
                    items="center"
                    gap={6}
                    bg={active ? '$hover' : '$raised'}
                    borderWidth={1}
                    borderColor={active ? '$ink' : '$edge'}
                    onPress={() => setStatus(s)}
                  >
                    <YStack width={7} height={7} rounded={9999} style={{ backgroundColor: dot[s] }} />
                    <SizableText fontSize={rung.chip} fontWeight={active ? '700' : '500'} color={active ? '$ink' : '$soft'}>
                      {NAME[s]}
                    </SizableText>
                  </XStack>
                )
              })}
            </XStack>
          </YStack>

          <YStack gap={6}>
            <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
              Priority
            </SizableText>
            <XStack gap={6} flexWrap="wrap">
              {PRIORITY.map((p) => {
                const active = priority === p
                const { background, color } = tone(cap(p), p)
                return (
                  <XStack
                    key={p}
                    role="button"
                    tabIndex={0}
                    cursor="pointer"
                    px={10}
                    height={24}
                    rounded={round.pill}
                    items="center"
                    borderWidth={1}
                    borderColor={active ? '$ink' : 'transparent'}
                    style={{ backgroundColor: background }}
                    onPress={() => setPriority(p)}
                  >
                    <SizableText fontSize={rung.chip} fontWeight="700" style={{ color }}>
                      {cap(p)}
                    </SizableText>
                  </XStack>
                )
              })}
            </XStack>
          </YStack>

          <YStack gap={6}>
            <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
              Assign to a team member
            </SizableText>
            <XStack gap={6} flexWrap="wrap">
              {people.slice(0, 8).map((p) => {
                const active = assigneeId === p.id
                return (
                  <XStack
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    cursor="pointer"
                    px={8}
                    height={26}
                    rounded={round.pill}
                    items="center"
                    gap={6}
                    bg={active ? '$hover' : '$raised'}
                    borderWidth={1}
                    borderColor={active ? '$ink' : '$edge'}
                    onPress={() => setAssigneeId(p.id)}
                  >
                    <People people={[p]} size={16} show={1} />
                    <SizableText fontSize={rung.chip} fontWeight={active ? '700' : '500'} color={active ? '$ink' : '$soft'}>
                      {p.name.split(' ')[0]}
                    </SizableText>
                  </XStack>
                )
              })}
            </XStack>
          </YStack>

          <YStack gap={6}>
            <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
              Labels
            </SizableText>
            <XStack gap={6} flexWrap="wrap">
              {AVAILABLE_LABELS.slice(0, 6).map((l) => {
                const active = labels.includes(l)
                const { background, color } = tone(l)
                return (
                  <Badge
                    key={l}
                    variant="default"
                    style={{
                      minHeight: 20,
                      height: 20,
                      paddingLeft: 8,
                      paddingRight: 8,
                      borderRadius: 9999,
                      cursor: 'pointer',
                      backgroundColor: active ? background : 'transparent',
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: active ? color : paint.rule,
                    }}
                    onClick={() => toggleLabel(l)}
                  >
                    <SizableText fontSize={rung.chip} fontWeight="600" style={{ color: active ? color : paint.mute }}>
                      {l}
                    </SizableText>
                  </Badge>
                )
              })}
            </XStack>
          </YStack>
        </YStack>

        <XStack
          px={16}
          py={12}
          items="center"
          justify="flex-end"
          gap={8}
          borderTopWidth={1}
          borderColor="$edge"
          bg="$raised"
        >
          {failed ? (
            <SizableText flex={1} fontSize={rung.small} color="$ink" role="alert">
              {failed}
            </SizableText>
          ) : null}
          <Button size="sm" variant="ghost" onPress={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            style={{ backgroundColor: paint.accent }}
            disabled={!title.trim() || !placed || submitting}
            onPress={() => void submit()}
          >
            <SizableText fontSize={12} fontWeight="600" style={{ color: paint.ground }}>
              {submitting ? 'Creating…' : 'Create issue'}
            </SizableText>
          </Button>
        </XStack>
      </YStack>
    </YStack>
  )
}
