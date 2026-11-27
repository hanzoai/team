/**
 * Work Workspace (`/issues`) — Linear-grade Issues, Kanban Board, List, Timeline
 * + Live Executable Tasks extracted from real workspace channels and documents.
 */
import { ScrollArea, SizableText, XStack, YStack } from '@hanzo/ui'
import { Bot, SquareCheck } from '@hanzogui/lucide-icons-2'
import { useMemo, useState } from 'react'

import { decodeMentionsForDisplay } from '~/data/teamRest.ts'
import { press } from '~/shell/press.ts'
import { ExecutableTaskRow } from '~/tasks/ExecutableCheckboxes.tsx'
import { extractExecutableTasks, useExecutableTasks, type ParsedExecutableLine, type TaskOriginKind } from '~/tasks/executable.ts'
import { paint } from '~/theme/theme.ts'
import { Tracker } from '~/tracker'
import { useWorkspace } from '~/workspace/store.ts'

interface DiscoveredTask {
  key: string
  parsed: ParsedExecutableLine
  sourceKind: TaskOriginKind
  sourceId: string
  sourceLabel: string
  sourcePath: string
  sourceMessageId?: string
}

export function WorkWorkspace({ mine = false }: { mine?: boolean }) {
  const [mode, setMode] = useState<'tracker' | 'tasks'>('tracker')
  const { messages, channels, spaces, roster, hydrating } = useWorkspace()
  const recordedTasks = useExecutableTasks()

  const liveTasks = useMemo<DiscoveredTask[]>(() => {
    const out: DiscoveredTask[] = []
    const seen = new Set<string>()

    for (const msg of messages) {
      const decoded = decodeMentionsForDisplay(msg.body, roster)
      const parsedList = extractExecutableTasks(decoded)
      if (parsedList.length === 0) continue
      const ch = channels.find((c) => c.id === msg.roomId)
      const label = ch ? (ch.kind === 'dm' ? ch.name : `#${ch.name}`) : 'Channel'
      for (const p of parsedList) {
        const k = `chat:${msg.roomId}:${msg.id}:${p.agentHandle}:${p.title}`
        if (seen.has(k)) continue
        seen.add(k)
        out.push({
          key: k,
          parsed: p,
          sourceKind: 'chat',
          sourceId: msg.roomId,
          sourceLabel: label,
          sourcePath: `/chat/${msg.roomId}`,
          sourceMessageId: msg.id,
        })
      }
    }

    for (const sp of spaces) {
      if (!sp.markdown) continue
      const parsedList = extractExecutableTasks(sp.markdown)
      for (const p of parsedList) {
        const k = `space:${sp.id}:${p.agentHandle}:${p.title}`
        if (seen.has(k)) continue
        seen.add(k)
        out.push({
          key: k,
          parsed: p,
          sourceKind: 'space',
          sourceId: sp.id,
          sourceLabel: sp.title,
          sourcePath: `/spaces/${sp.id}`,
        })
      }
    }

    for (const rec of recordedTasks) {
      const k = `rec:${rec.id}`
      const already = out.some(
        (d) =>
          d.sourceKind === rec.sourceKind &&
          d.sourceId === rec.sourceId &&
          d.parsed.agentHandle === rec.agentHandle &&
          d.parsed.title === rec.title,
      )
      if (already || seen.has(k)) continue
      seen.add(k)
      out.push({
        key: k,
        parsed: {
          checked: rec.state === 'done',
          agentHandle: rec.agentHandle,
          title: rec.title,
          raw: `- [${rec.state === 'done' ? 'x' : ' '}] @${rec.agentHandle} ${rec.title}`,
        },
        sourceKind: rec.sourceKind,
        sourceId: rec.sourceId,
        sourceLabel: rec.sourceLabel,
        sourcePath: rec.sourcePath,
        sourceMessageId: rec.sourceMessageId,
      })
    }

    return out
  }, [messages, channels, spaces, roster, recordedTasks])

  return (
    <YStack flex={1} minW={0} minH={0} style={{ backgroundColor: paint.panel }} data-testid="work-workspace">
      <XStack
        height={42}
        px={18}
        items="center"
        justify="space-between"
        borderBottomWidth={1}
        style={{ borderBottomColor: paint.rule }}
      >
        <XStack items="center" gap={6}>
          <XStack
            {...press(() => setMode('tracker'), 'Issues & Kanban Board')}
            height={26}
            px={11}
            rounded={7}
            borderWidth={1}
            items="center"
            gap={5}
            style={{
              backgroundColor: mode === 'tracker' ? paint.rowActive : 'transparent',
              borderColor: mode === 'tracker' ? paint.border : paint.rule,
            }}
          >
            <SquareCheck size={12} color={mode === 'tracker' ? paint.ink : paint.mute} />
            <SizableText fontSize={12} fontWeight="600" style={{ color: mode === 'tracker' ? paint.ink : paint.mute }}>
              Issues &amp; Board
            </SizableText>
          </XStack>

          <XStack
            {...press(() => setMode('tasks'), 'Agent Tasks')}
            height={26}
            px={11}
            rounded={7}
            borderWidth={1}
            items="center"
            gap={5}
            style={{
              backgroundColor: mode === 'tasks' ? paint.rowActive : 'transparent',
              borderColor: mode === 'tasks' ? paint.border : paint.rule,
            }}
            data-testid="work-agent-tasks-tab"
          >
            <Bot size={12} color={mode === 'tasks' ? paint.ink : paint.mute} />
            <SizableText fontSize={12} fontWeight="600" style={{ color: mode === 'tasks' ? paint.ink : paint.mute }}>
              {`Agent Tasks (${liveTasks.length})`}
            </SizableText>
          </XStack>
        </XStack>
      </XStack>

      {mode === 'tracker' ? (
        <Tracker mine={mine} />
      ) : (
        <ScrollArea flex={1} minH={0}>
          <YStack p={24} gap={14} maxW={780}>
            {hydrating && liveTasks.length === 0 ? (
              <YStack p={20} rounded={12} borderWidth={1} style={{ backgroundColor: paint.card, borderColor: paint.border }}>
                <SizableText fontSize={13} style={{ color: paint.dim }}>
                  Loading live agent tasks…
                </SizableText>
              </YStack>
            ) : liveTasks.length === 0 ? (
              <YStack p={24} rounded={12} borderWidth={1} gap={8} style={{ backgroundColor: paint.card, borderColor: paint.border }}>
                <SizableText fontSize={14} fontWeight="600" style={{ color: paint.ink }}>
                  No executable agent tasks yet
                </SizableText>
                <SizableText fontSize={12.5} style={{ color: paint.dim }}>
                  Post a markdown task line such as `- [ ] @dev Audit build output` in any channel or Space document to delegate work to a live workspace bot.
                </SizableText>
              </YStack>
            ) : (
              <YStack gap={8}>
                {liveTasks.map((t) => (
                  <ExecutableTaskRow
                    key={t.key}
                    parsed={t.parsed}
                    sourceKind={t.sourceKind}
                    sourceId={t.sourceId}
                    sourceMessageId={t.sourceMessageId}
                    sourceLabel={t.sourceLabel}
                    sourcePath={t.sourcePath}
                  />
                ))}
              </YStack>
            )}
          </YStack>
        </ScrollArea>
      )}
    </YStack>
  )
}
