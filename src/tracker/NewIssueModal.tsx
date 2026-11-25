import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Badge, Button, Input, SizableText, XStack, YStack } from '@hanzo/ui'
import { Bot, X } from '@hanzogui/lucide-icons-2'

import { invalidate } from '~/data/query.ts'
import { useSpace } from '~/data/space.tsx'
import { keys, start as createProject } from '~/data/tracker.ts'
import { caps, paint, round, rung } from '~/theme/theme.ts'
import { NAME, PRIORITY, STATUS, type IssuePatch, type Person, type Priority, type Status } from './board/model.ts'
import { People } from './board/People.tsx'
import { dot, tone } from './board/tone.ts'
import { formatChatSource, fromDateInput, type ChatSource } from './source.ts'

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

const cap = (s: string): string => s[0]!.toUpperCase() + s.slice(1)

/** A project the new-issue form can file into. */
export type Choice = { id: string; name: string; identifier: string }

export function NewIssueModal({
  initialStatus = 'backlog',
  initialTitle = '',
  initialDescription = '',
  sourceLink,
  people,
  projects,
  onCreate,
  onClose,
}: {
  initialStatus?: Status
  initialTitle?: string
  initialDescription?: string
  sourceLink?: ChatSource
  people: Person[]
  /**
   * The projects to choose between, on a board that spans them all. Absent on
   * a project's own board, where the project is already the answer.
   */
  projects?: readonly Choice[]
  onCreate: (status: Status, title: string, patch: IssuePatch) => Promise<void>
  onClose: () => void
}) {
  const { plane } = useSpace()
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [dueDateStr, setDueDateStr] = useState('')
  const [status, setStatus] = useState<Status>(initialStatus)
  const [priority, setPriority] = useState<Priority>('medium')
  const [assigneeId, setAssigneeId] = useState<string | null>(people[0]?.id ?? null)
  const [labels, setLabels] = useState<string[]>(['Feature'])
  const navigate = useNavigate()
  const [project, setProject] = useState<string | null>(projects?.[0]?.id ?? null)
  const [creatingProject, setCreatingProject] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)

  // The list can arrive after the form opens; take its first project then.
  useEffect(() => {
    if (projects && projects.length > 0 && !projects.some((p) => p.id === project)) {
      setProject(projects[0]?.id ?? null)
    }
  }, [projects, project])

  const createDefaultProject = async () => {
    if (!plane || creatingProject) return
    setCreatingProject(true)
    setFailed(null)
    try {
      const candidates = ['GEN', 'TASK', 'WORK', 'TEAM', 'MAIN', 'GEN2', 'GEN3']
      let id: string | null = null
      for (const identifier of candidates) {
        id = await createProject(plane, plane.account ?? '', { name: 'General', identifier })
        if (id) break
      }
      invalidate(keys.projects())
      if (id) setProject(id)
      else setFailed('Could not create default project — open Projects to create one.')
    } catch (e) {
      setFailed(e instanceof Error ? e.message : String(e))
    } finally {
      setCreatingProject(false)
    }
  }

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
      const finalDescription = formatChatSource(description.trim(), sourceLink ?? null)
      const dueDate = fromDateInput(dueDateStr)
      await onCreate(status, clean, {
        description: finalDescription || undefined,
        priority,
        assigneeId,
        ...(dueDate !== null ? { dueDate } : {}),
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
                  <XStack gap={6}>
                    {plane ? (
                      <Button size="sm" disabled={creatingProject} onPress={() => void createDefaultProject()}>
                        {creatingProject ? 'Creating…' : 'Create General project'}
                      </Button>
                    ) : null}
                    <Button size="sm" variant="outline" onPress={() => navigate('/projects?new')}>
                      New project
                    </Button>
                  </XStack>
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
              Due Date (optional)
            </SizableText>
            <input
              type="date"
              aria-label="Due date"
              value={dueDateStr}
              onChange={(e) => setDueDateStr(e.target.value)}
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
