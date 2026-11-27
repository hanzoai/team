/**
 * ExecutableTaskRow — interactive task checkbox row rendered inside Chat messages,
 * Hanzo Spaces documents, and Work Agent Tasks whenever `- [ ] @<agent> <title>` appears.
 */
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { ArrowUpRight, Bot, Check, Play } from '@hanzogui/lucide-icons-2'
import { useNavigate } from 'react-router'

import { useSession } from '~/data/session.tsx'
import { press } from '~/shell'
import { paint, ring, round, rung, state } from '~/theme/theme.ts'
import { useWorkspace } from '~/workspace/store.ts'
import {
  delegateExecutableTask,
  executableTaskKey,
  toggleExecutableTaskDone,
  useExecutableTasks,
  type ExecutableTaskState,
  type ParsedExecutableLine,
  type TaskOriginKind,
} from './executable.ts'

const STATE_META: Record<ExecutableTaskState, { label: string; dot: string }> = {
  ready: { label: 'Ready', dot: state.todo },
  assigned: { label: 'Assigned', dot: state.backlog },
  running: { label: 'Running', dot: state.doing },
  done: { label: 'Done', dot: state.done },
  failed: { label: 'Failed', dot: paint.alert },
  unavailable: { label: 'Unavailable', dot: paint.dim },
}

export function ExecutableTaskRow({
  parsed,
  sourceKind,
  sourceId,
  sourceMessageId,
  sourceLabel,
  sourcePath,
  onAfterDelegate,
}: {
  parsed: ParsedExecutableLine
  sourceKind: TaskOriginKind
  sourceId: string
  sourceMessageId?: string
  sourceLabel: string
  sourcePath: string
  onAfterDelegate?: (agentHandle: string, title: string) => void
}) {
  const navigate = useNavigate()
  const { who } = useSession()
  const { activeSpaceUuid } = useWorkspace()
  const all = useExecutableTasks()
  const key = executableTaskKey(sourceKind, sourceId, parsed.agentHandle, parsed.title)
  const stored = all.find((r) => r.id === key)

  const currentState: ExecutableTaskState = stored
    ? stored.state
    : parsed.checked
      ? 'done'
      : 'ready'
  const isDone = currentState === 'done'
  const isRunning = currentState === 'running'
  const meta = STATE_META[currentState]

  const onToggle = () => {
    toggleExecutableTaskDone({
      sourceKind,
      sourceId,
      sourceLabel,
      sourcePath,
      agentHandle: parsed.agentHandle,
      title: parsed.title,
      initialChecked: parsed.checked,
    })
  }

  const onDelegate = () => {
    delegateExecutableTask({
      sourceKind,
      sourceId,
      sourceMessageId,
      spaceUuid: activeSpaceUuid || undefined,
      sourceLabel,
      sourcePath,
      agentHandle: parsed.agentHandle,
      title: parsed.title,
      handedOffBy: who?.label || who?.name || 'HQ Operator',
    })
    onAfterDelegate?.(parsed.agentHandle, parsed.title)
  }

  return (
    <YStack
      data-testid="executable-task-row"
      data-task-state={currentState}
      my={4}
      px={12}
      py={9}
      gap={6}
      rounded={round.card}
      borderWidth={1}
      style={{ backgroundColor: paint.card, borderColor: paint.border }}
    >
      <XStack gap={8} items="center" justify="space-between" flexWrap="wrap">
        <XStack items="center" gap={8} flex={1} minW={180}>
          <YStack
            {...press(onToggle, isDone ? `Mark "${parsed.title}" ready` : `Mark "${parsed.title}" done`)}
            aria-checked={isDone}
            role="checkbox"
            width={17}
            height={17}
            rounded={5}
            borderWidth={1.5}
            items="center"
            justify="center"
            shrink={0}
            style={{
              backgroundColor: isDone ? state.done : 'transparent',
              borderColor: isDone ? state.done : paint.secondary,
            }}
            focusVisibleStyle={ring}
          >
            {isDone ? <Check size={11} color={paint.ground} /> : null}
          </YStack>

          <XStack
            {...press(() => navigate(`/agents/${parsed.agentHandle}`), `Inspect @${parsed.agentHandle} desk`)}
            px={6}
            py={2}
            gap={4}
            rounded={round.field}
            borderWidth={1}
            items="center"
            shrink={0}
            style={{ backgroundColor: paint.surface, borderColor: paint.border }}
            hoverStyle={{ background: paint.hover }}
            focusVisibleStyle={ring}
          >
            <Bot size={11} color={paint.fg} />
            <SizableText fontSize={rung.chip} fontWeight="700" style={{ color: paint.fg }}>
              {`@${parsed.agentHandle}`}
            </SizableText>
          </XStack>

          <SizableText
            fontSize={rung.small}
            fontWeight="500"
            flex={1}
            style={{
              color: isDone ? paint.secondary : paint.fg,
              textDecorationLine: isDone ? 'line-through' : 'none',
            }}
          >
            {parsed.title}
          </SizableText>
        </XStack>

        <XStack items="center" gap={6} shrink={0}>
          {stored?.runId ? (
            <SizableText fontSize={10.5} style={{ color: paint.dim, fontFamily: 'var(--font-mono)' }}>
              {`run · ${stored.runId}`}
            </SizableText>
          ) : null}

          <XStack
            px={7}
            py={2}
            gap={5}
            rounded={round.pill}
            borderWidth={1}
            items="center"
            style={{ backgroundColor: paint.surface, borderColor: paint.border }}
          >
            <YStack width={6} height={6} rounded={round.pill} style={{ backgroundColor: meta.dot }} />
            <SizableText fontSize={rung.chip} fontWeight="600" style={{ color: paint.secondary }}>
              {meta.label}
            </SizableText>
          </XStack>

          {!isDone ? (
            <XStack
              {...press(onDelegate, `Delegate "${parsed.title}" to @${parsed.agentHandle}`)}
              data-testid={`delegate-task-${parsed.agentHandle}`}
              px={9}
              py={4}
              gap={4}
              rounded={round.field}
              items="center"
              style={{ backgroundColor: isRunning ? paint.surface : paint.accent, borderColor: paint.border }}
              borderWidth={isRunning ? 1 : 0}
              hoverStyle={{ opacity: 0.9 }}
              focusVisibleStyle={ring}
            >
              {isRunning ? (
                <>
                  <ArrowUpRight size={11} color={paint.fg} />
                  <SizableText fontSize={rung.chip} fontWeight="600" style={{ color: paint.fg }}>
                    Running…
                  </SizableText>
                </>
              ) : (
                <>
                  <Play size={10} color={paint.ground} />
                  <SizableText fontSize={rung.chip} fontWeight="700" style={{ color: paint.ground }}>
                    {currentState === 'failed' || currentState === 'unavailable' ? 'Retry' : 'Execute'}
                  </SizableText>
                </>
              )}
            </XStack>
          ) : null}
        </XStack>
      </XStack>

      {stored?.error ? (
        <SizableText fontSize={11.5} style={{ color: paint.alert }}>
          {stored.error}
        </SizableText>
      ) : null}
    </YStack>
  )
}
