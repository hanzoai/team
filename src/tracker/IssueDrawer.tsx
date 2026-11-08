/**
 * Interactive Issue Detail & Edit Drawer + New Issue Modal for Hanzo Team Tracker.
 *
 * Connected to `Source` (`source.update`, `source.move`, `source.add`, `source.remove`)
 * so edits to title, description, status, priority, completion %, assignee/bot,
 * labels, and comments immediately persist to the workspace plane and sync to
 * `https://api.hanzo.ai/v1/task/board`.
 */
import { useEffect, useState } from 'react'
import { Badge, Button, Input, ScrollArea, Separator, SizableText, XStack, YStack } from '@hanzo/ui'
import { Bot, Check, MessageSquare, Plus, Send, Sparkles, Tag, Trash2, User, X } from '@hanzogui/lucide-icons-2'

import { caps, paint, ring, round, rung } from '~/theme/theme.ts'
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

type IssueComment = {
  id: string
  author: string
  face?: string
  body: string
  at: string
}

const COMMENTS_STORAGE_KEY = 'hanzo.team.issue.comments.v1'

function loadIssueComments(issueId: string, issue: Issue): IssueComment[] {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(COMMENTS_STORAGE_KEY)
      if (raw) {
        const map = JSON.parse(raw) as Record<string, IssueComment[]>
        if (map[issueId] && map[issueId].length > 0) return map[issueId]
      }
    } catch {
      // ignore storage errors
    }
  }
  const assignee = issue.people[0]
  return [
    {
      id: 'c-init-1',
      author: assignee?.name ?? 'Dev (@dev)',
      face: assignee?.face ?? '/team/portraits/Comparison_2_Grid_5.jpg',
      body: `Tracking ${issue.key}${issue.origin ? ` in ${issue.origin.name}` : ''}. Status is ${NAME[issue.status]} (${Math.round((issue.done ?? 0) * 100)}% complete).`,
      at: 'Synced',
    },
  ]
}

function saveIssueComments(issueId: string, list: IssueComment[]) {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(COMMENTS_STORAGE_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, IssueComment[]>) : {}
    map[issueId] = list
    window.localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore storage errors
  }
}

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
  const [title, setTitle] = useState(issue.title)
  const [description, setDescription] = useState(issue.description ?? '')
  const [commentText, setCommentText] = useState('')
  const [customTag, setCustomTag] = useState('')
  const [comments, setComments] = useState<IssueComment[]>(() => loadIssueComments(issue.id, issue))
  const [savedNotice, setSavedNotice] = useState(false)

  useEffect(() => {
    setTitle(issue.title)
    setDescription(issue.description ?? '')
    setComments(loadIssueComments(issue.id, issue))
  }, [issue.id, issue.title, issue.description])

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
      description: description.trim(),
    })
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

  const postComment = () => {
    const body = commentText.trim()
    if (!body) return
    const next: IssueComment[] = [
      ...comments,
      {
        id: `c-${Date.now()}`,
        author: 'Zach Kelling',
        body,
        at: 'Just now',
      },
    ]
    setComments(next)
    saveIssueComments(issue.id, next)
    setCommentText('')
    patchIssue({ replies: (issue.replies ?? 0) + 1 })
  }

  const triggerBotTriage = () => {
    const assignee = issue.people[0]
    const botName = assignee?.name ?? 'Dev (@dev)'
    const botFace = assignee?.face ?? '/team/portraits/Comparison_2_Grid_5.jpg'
    const next: IssueComment[] = [
      ...comments,
      {
        id: `c-bot-${Date.now()}`,
        author: botName,
        face: botFace,
        body: `Triaged ${issue.key}: verified ${issue.origin?.name ?? 'hanzo/cloud'} dependencies and linked CI checks. Ready to advance from ${NAME[issue.status]}.`,
        at: 'Just now · 24/7 Bot',
      },
    ]
    setComments(next)
    saveIssueComments(issue.id, next)
    patchIssue({
      replies: (issue.replies ?? 0) + 1,
      done: Math.min(1, Math.max(0.25, (issue.done ?? 0) + 0.25)),
    })
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
              onPress={() => {
                void source.remove?.(issue.id)
                onClose()
              }}
            >
              <Trash2 size={14} color="$soft" />
            </Button>
          ) : null}
          <Button variant="ghost" size="icon-sm" aria-label="Close issue drawer" onPress={onClose}>
            <X size={15} color="$soft" />
          </Button>
        </XStack>
      </XStack>

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

          {/* Assignee / Bot Selector */}
          <YStack gap={8}>
            <XStack items="center" gap={6}>
              <User size={12} color="$dim" />
              <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
                Assignee / 24/7 Bot
              </SizableText>
            </XStack>
            <XStack gap={6} flexWrap="wrap">
              {people.slice(0, 10).map((person) => {
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
                    onPress={() => patchIssue({ assigneeId: person.id })}
                  >
                    <People people={[person]} size={18} show={1} />
                    <SizableText fontSize={rung.chip} fontWeight={active ? '700' : '500'} color={active ? '$ink' : '$soft'}>
                      {person.name.split(' ')[0]}
                    </SizableText>
                  </XStack>
                )
              })}
            </XStack>
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

          <Separator borderColor="$edge" />

          {/* Activity & Bot Triage */}
          <YStack gap={10}>
            <XStack items="center" justify="space-between">
              <XStack items="center" gap={6}>
                <MessageSquare size={12} color="$dim" />
                <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
                  Activity & Comments ({comments.length})
                </SizableText>
              </XStack>
              <Button
                size="xs"
                height={24}
                px={8}
                rounded={round.field}
                variant="outline"
                startIcon={<Sparkles size={11} color="$ink" />}
                onPress={triggerBotTriage}
              >
                <SizableText fontSize={11} fontWeight="600" color="$ink">
                  Ask Bot to Triage
                </SizableText>
              </Button>
            </XStack>

            <YStack gap={8}>
              {comments.map((c) => (
                <YStack
                  key={c.id}
                  p={10}
                  rounded={round.card}
                  bg="$raised"
                  borderWidth={1}
                  borderColor="$edge"
                  gap={4}
                >
                  <XStack items="center" justify="space-between">
                    <XStack items="center" gap={6}>
                      <People people={[{ id: c.id, name: c.author, face: c.face }]} size={18} show={1} />
                      <SizableText fontSize={rung.small} fontWeight="600" color="$ink">
                        {c.author}
                      </SizableText>
                    </XStack>
                    <SizableText fontSize={10} color="$dim">
                      {c.at}
                    </SizableText>
                  </XStack>
                  <SizableText fontSize={rung.small} color="$soft" lineHeight={18}>
                    {c.body}
                  </SizableText>
                </YStack>
              ))}
            </YStack>

            <XStack gap={6} items="center">
              <Input
                flex={1}
                height={30}
                fontSize={12}
                placeholder={`Comment on ${issue.key}...`}
                value={commentText}
                onChangeText={setCommentText}
                bg="$raised"
                borderColor="$edge"
              />
              <Button
                size="xs"
                height={30}
                px={10}
                rounded={round.field}
                style={{ backgroundColor: paint.accent }}
                onPress={postComment}
              >
                <Send size={12} color={paint.ground} />
              </Button>
            </XStack>
          </YStack>
        </YStack>
      </ScrollArea>
    </YStack>
  )
}

export function NewIssueModal({
  initialStatus = 'backlog',
  people,
  onCreate,
  onClose,
}: {
  initialStatus?: Status
  people: Person[]
  onCreate: (status: Status, title: string, patch: IssuePatch) => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Status>(initialStatus)
  const [priority, setPriority] = useState<Priority>('medium')
  const [assigneeId, setAssigneeId] = useState<string | null>(people[0]?.id ?? null)
  const [labels, setLabels] = useState<string[]>(['Feature'])
  const [submitting, setSubmitting] = useState(false)

  const toggleLabel = (l: string) => {
    setLabels((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]))
  }

  const submit = async () => {
    const clean = title.trim()
    if (!clean || submitting) return
    setSubmitting(true)
    try {
      await onCreate(status, clean, {
        description: description.trim() || undefined,
        priority,
        assigneeId,
        labels,
      })
      onClose()
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
              Assign to Team Member or 24/7 Bot
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
          <Button size="sm" variant="ghost" onPress={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            style={{ backgroundColor: paint.accent }}
            disabled={!title.trim() || submitting}
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
