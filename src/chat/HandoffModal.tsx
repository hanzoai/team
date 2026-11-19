/**
 * HandoffModal — hand off work from Chat to a teammate or `@bot` with explicit
 * ownership, approval gate policy, optional tracker project filing, and live
 * routing into the Approval Inbox.
 */
import { useEffect, useState } from 'react'
import { Button, Input, SizableText, XStack, YStack } from '@hanzo/ui'
import { Bot, Send, ShieldCheck, User, X } from '@hanzogui/lucide-icons-2'

import type { HandoffOwner } from '~/handoff/handoff.ts'
import { caps, paint, ring, round, rung } from '~/theme/theme.ts'
import type { Person } from './chat.ts'

export interface ProjectOption {
  id: string
  name: string
  identifier: string
}

export interface HandoffSubmit {
  title: string
  brief: string
  owner: HandoffOwner
  approvalRequired: boolean
  projectId?: string
}

export function HandoffModal({
  initialText,
  people,
  defaultOwnerId,
  defaultApprovalRequired,
  projects,
  roomLabel,
  onSubmit,
  onClose,
}: {
  initialText: string
  people: readonly Person[]
  defaultOwnerId?: string
  defaultApprovalRequired: boolean
  projects: readonly ProjectOption[]
  roomLabel: string
  onSubmit: (payload: HandoffSubmit) => Promise<void>
  onClose: () => void
}) {
  const activeRoster = people.filter((p) => !p.gone && p.name.trim())
  const sortedRoster = [...activeRoster].sort(
    (a, b) => Number(Boolean(b.bot)) - Number(Boolean(a.bot)) || a.name.localeCompare(b.name),
  )

  const cleanedInitial = initialText.trim()
  const firstLine = cleanedInitial.split('\n')[0]?.slice(0, 100) ?? ''

  const [title, setTitle] = useState(firstLine)
  const [brief, setBrief] = useState(cleanedInitial)
  const [ownerId, setOwnerId] = useState<string>(
    defaultOwnerId && sortedRoster.some((p) => p.id === defaultOwnerId)
      ? defaultOwnerId
      : (sortedRoster[0]?.id ?? ''),
  )
  const [approvalRequired, setApprovalRequired] = useState(defaultApprovalRequired)
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ownerId && sortedRoster[0]) setOwnerId(sortedRoster[0].id)
  }, [ownerId, sortedRoster])

  useEffect(() => {
    if (!projectId && projects[0]) setProjectId(projects[0].id)
  }, [projectId, projects])

  const selectedPerson = sortedRoster.find((p) => p.id === ownerId) ?? sortedRoster[0]
  const canSend = Boolean(title.trim() && selectedPerson && !busy)

  const submit = async () => {
    if (!canSend || !selectedPerson) return
    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        brief: brief.trim(),
        owner: {
          id: selectedPerson.id,
          name: selectedPerson.name,
          kind: selectedPerson.bot ? 'bot' : 'person',
          face: selectedPerson.avatar,
        },
        approvalRequired,
        projectId: projectId || undefined,
      })
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <YStack
      data-testid="chat-handoff-modal"
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
          height={48}
          px={16}
          items="center"
          justify="space-between"
          borderBottomWidth={1}
          borderColor="$edge"
        >
          <XStack items="center" gap={8}>
            <Send size={15} color="$ink" />
            <SizableText fontSize={rung.body} fontWeight="700" color="$ink">
              Hand off work
            </SizableText>
            <SizableText fontSize={rung.chip} color="$dim">
              {roomLabel}
            </SizableText>
          </XStack>
          <Button variant="ghost" size="icon-sm" aria-label="Close handoff dialog" onPress={onClose}>
            <X size={15} color="$soft" />
          </Button>
        </XStack>

        <YStack p={16} gap={14}>
          {error ? (
            <SizableText fontSize={rung.small} style={{ color: paint.alert }} role="alert">
              {error}
            </SizableText>
          ) : null}

          <YStack gap={6}>
            <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
              Deliverable / Task title
            </SizableText>
            <Input
              data-testid="handoff-title-input"
              height={34}
              fontSize={13}
              placeholder="e.g. Audit Zen 6 router latency and post report"
              value={title}
              onChangeText={setTitle}
              bg="$raised"
              borderColor="$edge"
            />
          </YStack>

          <YStack gap={6}>
            <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
              Handoff brief & acceptance criteria
            </SizableText>
            <Input
              data-testid="handoff-brief-input"
              height={34}
              fontSize={12}
              placeholder="Context, expected deliverable, and verification criteria..."
              value={brief}
              onChangeText={setBrief}
              bg="$raised"
              borderColor="$edge"
            />
          </YStack>

          <YStack gap={6}>
            <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
              Assign owner (teammate or @bot)
            </SizableText>
            <XStack gap={6} flexWrap="wrap">
              {sortedRoster.slice(0, 12).map((p) => {
                const active = selectedPerson?.id === p.id
                return (
                  <XStack
                    key={p.id}
                    data-testid={`handoff-owner-${p.name.toLowerCase().replace(/\s+/g, '-')}`}
                    role="button"
                    tabIndex={0}
                    cursor="pointer"
                    px={9}
                    height={30}
                    rounded={round.pill}
                    items="center"
                    gap={6}
                    bg={active ? '$hover' : '$raised'}
                    borderWidth={1}
                    borderColor={active ? '$ink' : '$edge'}
                    focusVisibleStyle={ring}
                    onPress={() => setOwnerId(p.id)}
                  >
                    {p.bot ? <Bot size={13} color="$ink" /> : <User size={13} color="$ink" />}
                    <SizableText fontSize={rung.chip} fontWeight={active ? '700' : '500'} color={active ? '$ink' : '$soft'}>
                      {p.bot ? `@${p.name}` : p.name}
                    </SizableText>
                    {p.bot ? (
                      <SizableText fontSize={rung.chip} color="$dim">
                        Bot
                      </SizableText>
                    ) : null}
                  </XStack>
                )
              })}
              {sortedRoster.length === 0 ? (
                <SizableText fontSize={rung.small} color="$dim">
                  No active members on this space roster yet.
                </SizableText>
              ) : null}
            </XStack>
          </YStack>

          {projects.length > 0 ? (
            <YStack gap={6}>
              <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
                Track on project board
              </SizableText>
              <XStack gap={6} flexWrap="wrap">
                {projects.slice(0, 8).map((proj) => {
                  const active = projectId === proj.id
                  return (
                    <XStack
                      key={proj.id}
                      role="button"
                      tabIndex={0}
                      cursor="pointer"
                      px={9}
                      height={26}
                      rounded={round.field}
                      items="center"
                      gap={5}
                      bg={active ? '$hover' : '$raised'}
                      borderWidth={1}
                      borderColor={active ? '$ink' : '$edge'}
                      focusVisibleStyle={ring}
                      onPress={() => setProjectId(proj.id)}
                    >
                      <SizableText fontSize={rung.chip} fontWeight="700" color={active ? '$ink' : '$soft'}>
                        {proj.identifier}
                      </SizableText>
                      <SizableText fontSize={rung.chip} color={active ? '$ink' : '$dim'}>
                        {proj.name}
                      </SizableText>
                    </XStack>
                  )
                })}
              </XStack>
            </YStack>
          ) : null}

          <XStack
            role="button"
            tabIndex={0}
            cursor="pointer"
            p={10}
            rounded={round.field}
            bg="$raised"
            borderWidth={1}
            borderColor={approvalRequired ? '$ink' : '$edge'}
            items="center"
            justify="space-between"
            gap={10}
            focusVisibleStyle={ring}
            onPress={() => setApprovalRequired((v) => !v)}
          >
            <XStack items="center" gap={8} flex={1}>
              <ShieldCheck size={15} color={approvalRequired ? '$ink' : '$soft'} />
              <YStack gap={2} flex={1}>
                <SizableText fontSize={rung.small} fontWeight="600" color="$ink">
                  {approvalRequired ? 'Require approval in Approval Inbox' : 'Full access (auto-approve deliverable)'}
                </SizableText>
                <SizableText fontSize={rung.chip} color="$dim">
                  {approvalRequired
                    ? 'Routes to the Approval Inbox for explicit sign-off before completion.'
                    : 'Deliverable is verified and marked done automatically when submitted.'}
                </SizableText>
              </YStack>
            </XStack>
          </XStack>

          <XStack justify="flex-end" gap={8} pt={4}>
            <Button size="sm" variant="ghost" disabled={busy} onPress={onClose}>
              Cancel
            </Button>
            <Button
              data-testid="handoff-submit-btn"
              size="sm"
              disabled={!canSend}
              style={{ backgroundColor: paint.accent }}
              onPress={() => void submit()}
            >
              <Send size={13} color={paint.ground} />
              <SizableText fontSize={rung.small} fontWeight="700" style={{ color: paint.ground }}>
                {busy ? 'Handing off…' : 'Hand off work'}
              </SizableText>
            </Button>
          </XStack>
        </YStack>
      </YStack>
    </YStack>
  )
}
