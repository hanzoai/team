/**
 * Deliverables & Files (`/files`): live index of deliverables produced across
 * tracked handoffs (from Tracker issues and Chat handoffs), including each
 * deliverable's `Latest · v{n}` version, artifact links, next action, and
 * expandable `Prior versions` history.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Input, ScrollArea, SizableText, XStack, YStack } from '@hanzo/ui'
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileCheck2,
  History,
  ShieldAlert,
  User,
} from '@hanzogui/lucide-icons-2'

import { useSpace } from '~/data/space.tsx'
import { approvalLabel, handoffNextAction, type Deliverable, type HandoffRecord } from './handoff.ts'
import { useHandoffs } from './store.ts'
import { caps, paint, ring, round, rung, state } from '~/theme/theme.ts'

type FilterKind = 'all' | 'verified' | 'pending' | 'versioned'

function formatTimestamp(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return ''
  try {
    return new Date(ms).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function ArtifactLink({ artifact }: { artifact: string }) {
  if (/^https?:\/\//.test(artifact)) {
    return (
      <a
        href={artifact}
        target="_blank"
        rel="noreferrer"
        style={{
          color: paint.accent,
          fontSize: 12,
          textDecoration: 'underline',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {artifact}
      </a>
    )
  }
  return (
    <SizableText fontSize={rung.chip} color="$soft" numberOfLines={1}>
      {artifact}
    </SizableText>
  )
}

function PriorVersionRow({ item }: { item: Deliverable }) {
  return (
    <YStack
      p={10}
      gap={4}
      rounded={round.field}
      bg="$raised"
      borderWidth={1}
      borderColor="$edge"
    >
      <XStack items="center" justify="space-between" gap={8}>
        <XStack items="center" gap={6}>
          <XStack px={6} py={1} rounded={round.pill} bg="$panel" borderWidth={1} borderColor="$edge">
            <SizableText fontSize={rung.chip} fontWeight="700" color="$soft">
              {`v${item.version}`}
            </SizableText>
          </XStack>
          <SizableText fontSize={rung.chip} color="$dim">
            {item.verified ? 'Verified' : 'Unverified'}
          </SizableText>
        </XStack>
        <SizableText fontSize={rung.chip} color="$dim">
          {[item.completedBy, formatTimestamp(item.completedAt)].filter(Boolean).join(' · ')}
        </SizableText>
      </XStack>
      <SizableText fontSize={rung.small} color="$ink">
        {item.summary}
      </SizableText>
      {item.artifact ? <ArtifactLink artifact={item.artifact} /> : null}
    </YStack>
  )
}

function DeliverableRow({ record }: { record: HandoffRecord }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const { meta } = record
  const current = meta.deliverable
  if (!current) return null
  const prior = meta.deliverableHistory ? [...meta.deliverableHistory].reverse() : []
  const isApproved = meta.approvalState === 'approved'
  const isPending = meta.approvalState === 'pending'
  const pillBg = isApproved
    ? state.done
    : isPending
      ? paint.alert
      : meta.approvalState === 'changes_requested'
        ? paint.composerWarn
        : state.doing
  const pillFg = isPending ? paint.panel : paint.ground

  const openOrigin = () => {
    if (record.issueId) navigate('/issues')
    else if (meta.sourceRoomId) navigate(`/chat/${meta.sourceRoomId}`)
  }

  return (
    <YStack
      data-testid="files-deliverable-card"
      p={16}
      gap={10}
      rounded={round.card}
      bg="$panel"
      borderWidth={1}
      borderColor="$edge"
    >
      <XStack items="center" justify="space-between" gap={8} flexWrap="wrap">
        <XStack items="center" gap={8} flex={1} minW={0}>
          {record.issueKey ? (
            <SizableText fontSize={rung.chip} fontWeight="700" color="$ink">
              {record.issueKey}
            </SizableText>
          ) : null}
          {meta.sourceRoomName ? (
            <SizableText fontSize={rung.chip} color="$dim">
              {meta.sourceRoomName}
            </SizableText>
          ) : null}
          <SizableText fontSize={rung.body} fontWeight="600" color="$ink" numberOfLines={1}>
            {record.title}
          </SizableText>
        </XStack>

        <XStack items="center" gap={8}>
          <XStack
            px={7}
            py={2}
            rounded={round.pill}
            items="center"
            gap={4}
            style={{ backgroundColor: pillBg }}
          >
            {isApproved ? (
              <CheckCircle2 size={11} color={pillFg} />
            ) : (
              <ShieldAlert size={11} color={pillFg} />
            )}
            <SizableText fontSize={rung.chip} fontWeight="700" style={{ color: pillFg }}>
              {approvalLabel(meta.approvalState)}
            </SizableText>
          </XStack>

          {record.issueId || meta.sourceRoomId ? (
            <Button size="xs" variant="outline" onPress={openOrigin}>
              <ExternalLink size={11} />
              <SizableText fontSize={rung.chip} color="$ink">
                Open
              </SizableText>
            </Button>
          ) : null}
        </XStack>
      </XStack>

      <XStack items="center" gap={8} flexWrap="wrap">
        <XStack
          px={7}
          py={2}
          rounded={round.field}
          bg="$raised"
          borderWidth={1}
          borderColor="$edge"
          items="center"
          gap={4}
        >
          {meta.owner.kind === 'bot' ? <Bot size={12} color="$ink" /> : <User size={12} color="$ink" />}
          <SizableText fontSize={rung.chip} fontWeight="600" color="$ink">
            {meta.owner.kind === 'bot' ? `@${meta.owner.name}` : meta.owner.name}
          </SizableText>
        </XStack>
        <SizableText fontSize={rung.chip} color="$soft">
          {`Next action: ${handoffNextAction(meta)}`}
        </SizableText>
      </XStack>

      <YStack
        p={12}
        gap={6}
        rounded={round.field}
        bg="$raised"
        borderWidth={1}
        borderColor="$edge"
      >
        <XStack items="center" justify="space-between" gap={8} flexWrap="wrap">
          <XStack items="center" gap={6}>
            <FileCheck2 size={13} color={current.verified ? state.done : paint.ink} />
            <XStack px={7} py={1} rounded={round.pill} bg="$panel" borderWidth={1} borderColor="$edge">
              <SizableText fontSize={rung.chip} fontWeight="700" color="$ink">
                {`Latest · v${current.version ?? 1}`}
              </SizableText>
            </XStack>
            <SizableText fontSize={rung.chip} color="$dim">
              {current.verified ? 'Verified' : 'Awaiting verification'}
            </SizableText>
          </XStack>
          <SizableText fontSize={rung.chip} color="$dim">
            {[current.completedBy, formatTimestamp(current.completedAt)].filter(Boolean).join(' · ')}
          </SizableText>
        </XStack>

        <SizableText fontSize={rung.small} color="$ink">
          {current.summary}
        </SizableText>

        {current.artifact ? <ArtifactLink artifact={current.artifact} /> : null}
      </YStack>

      {prior.length > 0 ? (
        <YStack gap={6}>
          <XStack
            role="button"
            tabIndex={0}
            cursor="pointer"
            items="center"
            gap={6}
            self="flex-start"
            px={8}
            py={4}
            rounded={round.field}
            bg="$raised"
            borderWidth={1}
            borderColor="$edge"
            focusVisibleStyle={ring}
            onPress={() => setExpanded((v) => !v)}
          >
            <History size={12} color="$soft" />
            <SizableText fontSize={rung.chip} fontWeight="600" color="$soft">
              {`Prior versions (${prior.length})`}
            </SizableText>
            <ChevronDown
              size={12}
              color="$soft"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </XStack>

          {expanded ? (
            <YStack gap={6} pl={10} borderLeftWidth={2} borderColor="$edge">
              {prior.map((item) => (
                <PriorVersionRow key={`${record.id}:v${item.version}`} item={item} />
              ))}
            </YStack>
          ) : null}
        </YStack>
      ) : null}
    </YStack>
  )
}

export function Files() {
  const { current } = useSpace()
  const handoffs = useHandoffs()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKind>('all')

  const withDeliverables = useMemo(
    () => handoffs.filter((h) => Boolean(h.meta.deliverable)),
    [handoffs],
  )

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return withDeliverables.filter((h) => {
      if (filter === 'verified' && !h.meta.deliverable?.verified) return false
      if (filter === 'pending' && h.meta.approvalState !== 'pending') return false
      if (filter === 'versioned' && !(h.meta.deliverableHistory && h.meta.deliverableHistory.length > 0)) {
        return false
      }
      if (!q) return true
      const haystack = [
        h.title,
        h.issueKey ?? '',
        h.meta.owner.name,
        h.meta.deliverable?.summary ?? '',
        h.meta.deliverable?.artifact ?? '',
        ...(h.meta.deliverableHistory?.map((d) => `${d.summary} ${d.artifact ?? ''}`) ?? []),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [withDeliverables, filter, query])

  const totalVersions = useMemo(
    () =>
      withDeliverables.reduce(
        (acc, h) => acc + 1 + (h.meta.deliverableHistory?.length ?? 0),
        0,
      ),
    [withDeliverables],
  )

  return (
    <ScrollArea data-testid="files-deliverables-view" flex={1} minH={0}>
      <YStack p={24} gap={20} maxW={960} width="100%">
        <XStack items="center" justify="space-between" flexWrap="wrap" gap={12}>
          <YStack gap={4}>
            <SizableText {...caps} fontSize={rung.chip} fontWeight="600" color="$soft">
              {`${current?.name ?? 'Hanzo Team'} · Deliverables & Files`}
            </SizableText>
            <SizableText fontSize={rung.title} fontWeight="600" color="$ink">
              {`Deliverables (${withDeliverables.length})`}
            </SizableText>
            <SizableText fontSize={rung.body} color="$quiet">
              {`Latest artifacts and version history across ${totalVersions} recorded submission${totalVersions === 1 ? '' : 's'}.`}
            </SizableText>
          </YStack>
        </XStack>

        <XStack gap={10} items="center" flexWrap="wrap">
          <Input
            flex={1}
            minW={220}
            height={32}
            fontSize={12}
            placeholder="Filter by title, issue key, owner, summary, or artifact..."
            value={query}
            onChangeText={setQuery}
            bg="$panel"
            borderColor="$edge"
          />
          <XStack gap={6} flexWrap="wrap">
            {(
              [
                ['all', `All (${withDeliverables.length})`],
                ['verified', 'Verified'],
                ['pending', 'Pending'],
                ['versioned', 'Multi-version'],
              ] as const
            ).map(([id, label]) => {
              const active = filter === id
              return (
                <XStack
                  key={id}
                  role="button"
                  tabIndex={0}
                  cursor="pointer"
                  px={10}
                  height={28}
                  rounded={round.pill}
                  items="center"
                  bg={active ? '$hover' : '$panel'}
                  borderWidth={1}
                  borderColor={active ? '$ink' : '$edge'}
                  focusVisibleStyle={ring}
                  onPress={() => setFilter(id)}
                >
                  <SizableText fontSize={rung.chip} fontWeight={active ? '700' : '500'} color={active ? '$ink' : '$soft'}>
                    {label}
                  </SizableText>
                </XStack>
              )
            })}
          </XStack>
        </XStack>

        {shown.length === 0 ? (
          <YStack
            items="center"
            gap={10}
            py={48}
            px={24}
            rounded={round.card}
            borderWidth={1}
            borderColor="$edge"
            bg="$panel"
          >
            <FileCheck2 size={22} color="$soft" />
            <SizableText fontSize={rung.row} fontWeight="600" color="$ink">
              {withDeliverables.length === 0 ? 'No deliverables recorded yet' : 'No matching deliverables'}
            </SizableText>
            <SizableText fontSize={rung.body} color="$quiet" text="center" maxW={440}>
              {withDeliverables.length === 0
                ? 'Submit a deliverable on any handed-off issue or chat handoff to track its versions and artifacts here.'
                : 'Try clearing the search query or switching filters.'}
            </SizableText>
          </YStack>
        ) : (
          <YStack gap={12}>
            {shown.map((rec) => (
              <DeliverableRow key={rec.id} record={rec} />
            ))}
          </YStack>
        )}
      </YStack>
    </ScrollArea>
  )
}
