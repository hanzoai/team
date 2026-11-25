/**
 * Work Workspace (`/issues`) — Linear-grade Issues, Kanban Board, List, Timeline
 * + Programmable YAML Objectives & Executable Checkboxes!
 */
import { ScrollArea, SizableText, XStack, YStack } from '@hanzo/ui'
import { Code2, SquareCheck } from '@hanzogui/lucide-icons-2'
import { useState } from 'react'

import { press } from '~/shell/press.ts'
import { ExecutableTaskRow } from '~/tasks/ExecutableCheckboxes.tsx'
import { extractExecutableTasks } from '~/tasks/executable.ts'
import { paint } from '~/theme/theme.ts'
import { Tracker } from '~/tracker'

const OBJECTIVES_YAML = [
  '# hanzo-v8.8-q4.objectives.yaml',
  'cycle: v1.1.0-ga',
  'owner: "@mana"',
  'gates:',
  '  max_file_loc: 1000',
  '  theme: zen-obsidian-dark',
  '  event_sdk: "@hanzo/event@0.3.73"',
].join('\n')

const OBJECTIVES_TASKS = [
  '- [x] @dev Ship 4-column Discord × Mattermost shell + Thread RHS',
  '- [x] @des Enforce pure Zen Obsidian Dark tokens across all four columns',
  '- [ ] @cyber Audit supply-chain lockfile & sign v1.1.0 desktop binaries',
  '- [ ] @qa Verify X11 1440x900 12px RGBA outer corners over desktop wallpaper',
].join('\n')

export function WorkWorkspace({ mine = false }: { mine?: boolean }) {
  const [mode, setMode] = useState<'tracker' | 'objectives'>('tracker')
  const parsedTasks = extractExecutableTasks(OBJECTIVES_TASKS)

  return (
    <YStack flex={1} minW={0} minH={0} style={{ backgroundColor: paint.panel }}>
      <XStack
        height={38}
        px={16}
        items="center"
        justify="space-between"
        borderBottomWidth={1}
        style={{ borderBottomColor: paint.rule }}
      >
        <XStack items="center" gap={6}>
          <XStack
            {...press(() => setMode('tracker'), 'Issues & Kanban Board')}
            height={25}
            px={10}
            rounded={6}
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
            {...press(() => setMode('objectives'), 'Programmable YAML Objectives')}
            height={25}
            px={10}
            rounded={6}
            borderWidth={1}
            items="center"
            gap={5}
            style={{
              backgroundColor: mode === 'objectives' ? paint.rowActive : 'transparent',
              borderColor: mode === 'objectives' ? paint.border : paint.rule,
            }}
          >
            <Code2 size={12} color={mode === 'objectives' ? paint.ink : paint.mute} />
            <SizableText fontSize={12} fontWeight="600" style={{ color: mode === 'objectives' ? paint.ink : paint.mute }}>
              YAML Objectives
            </SizableText>
          </XStack>
        </XStack>
      </XStack>

      {mode === 'tracker' ? (
        <Tracker mine={mine} />
      ) : (
        <ScrollArea flex={1} minH={0}>
          <YStack p={20} gap={14} maxW={760}>
            <YStack
              p={14}
              rounded={10}
              borderWidth={1}
              gap={4}
              style={{ backgroundColor: paint.code, borderColor: paint.codeEdge }}
            >
              {OBJECTIVES_YAML.split('\n').map((ln, idx) => (
                <SizableText
                  key={idx}
                  fontSize={12}
                  lineHeight={19}
                  style={{ color: ln.startsWith('#') ? paint.dim : paint.fg, fontFamily: 'var(--font-mono)' }}
                >
                  {ln}
                </SizableText>
              ))}
            </YStack>

            <YStack gap={6}>
              <SizableText fontSize={13} fontWeight="700" style={{ color: paint.ink }}>
                Executable Cycle Checkpoints
              </SizableText>
              {parsedTasks.map((t, idx) => (
                <ExecutableTaskRow
                  key={idx}
                  parsed={t}
                  sourceKind="space"
                  sourceId="yaml-objectives"
                  sourceLabel="Q4 YAML Objectives"
                  sourcePath="/issues"
                />
              ))}
            </YStack>
          </YStack>
        </ScrollArea>
      )}
    </YStack>
  )
}
