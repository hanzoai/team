/**
 * Hanzo Spaces Workspace (`/spaces` & `/spaces/:id`)
 * Collaborative versioned interactive deliverables / artifacts with Executable Checkboxes.
 */
import { ScrollArea, SizableText, XStack, YStack } from '@hanzo/ui'
import { Layers } from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { useParams } from 'react-router'

import { press } from '~/shell/press.ts'
import { ExecutableTaskRow } from '~/tasks/ExecutableCheckboxes.tsx'
import { extractExecutableTasks } from '~/tasks/executable.ts'
import { paint } from '~/theme/theme.ts'
import { useWorkspace } from '~/workspace/store.ts'

export function SpacesWorkspace() {
  const { id } = useParams()
  const { spaces } = useWorkspace()
  const [selectedId, setSelectedId] = useState(id || spaces[0]?.id || '')
  const [activeVer, setActiveVer] = useState<'v1' | 'v2' | 'v3'>('v3')

  const doc = spaces.find((s) => s.id === (id || selectedId)) ?? spaces[0]!
  const tasks = extractExecutableTasks(doc.markdown)

  return (
    <YStack flex={1} minW={0} minH={0} style={{ backgroundColor: paint.panel }} data-testid="spaces-workspace">
      <XStack
        height={44}
        px={18}
        items="center"
        justify="space-between"
        borderBottomWidth={1}
        style={{ borderBottomColor: paint.rule }}
      >
        <XStack items="center" gap={8}>
          <Layers size={15} color={paint.ink} />
          <SizableText fontSize={14} fontWeight="700" style={{ color: paint.ink }}>
            Spaces
          </SizableText>
          <SizableText fontSize={12} style={{ color: paint.dim }}>
            Versioned interactive deliverables, specs &amp; benchmark artifacts
          </SizableText>
        </XStack>

        <XStack items="center" gap={4}>
          {(['v1', 'v2', 'v3'] as const).map((v) => {
            const on = activeVer === v
            return (
              <XStack
                key={v}
                {...press(() => setActiveVer(v), `Version ${v}`)}
                height={24}
                px={8}
                rounded={6}
                borderWidth={1}
                items="center"
                style={{
                  backgroundColor: on ? paint.rowActive : 'transparent',
                  borderColor: on ? paint.border : paint.rule,
                }}
              >
                <SizableText fontSize={11} fontWeight="700" style={{ color: on ? paint.ink : paint.mute, fontFamily: 'var(--font-mono)' }}>
                  {v}
                </SizableText>
              </XStack>
            )
          })}
        </XStack>
      </XStack>

      <XStack flex={1} minH={0}>
        <YStack width={240} shrink={0} borderRightWidth={1} style={{ borderRightColor: paint.rule }} p={10} gap={6}>
          {spaces.map((sp) => {
            const on = sp.id === doc.id
            return (
              <YStack
                key={sp.id}
                {...press(() => setSelectedId(sp.id), sp.title)}
                p={10}
                rounded={8}
                borderWidth={1}
                gap={3}
                style={{
                  backgroundColor: on ? paint.rowActive : paint.card,
                  borderColor: on ? paint.border : paint.rule,
                }}
              >
                <SizableText fontSize={12.5} fontWeight="600" style={{ color: paint.ink }} numberOfLines={2}>
                  {sp.title}
                </SizableText>
                <SizableText fontSize={11} style={{ color: paint.dim }}>
                  {`@${sp.authorHandle} · ${sp.updatedAt}`}
                </SizableText>
              </YStack>
            )
          })}
        </YStack>

        <ScrollArea flex={1} minH={0}>
          <YStack p={22} gap={18} maxW={720}>
            <YStack gap={6}>
              <SizableText fontSize={20} fontWeight="700" style={{ color: paint.ink }}>
                {`${doc.title} (${activeVer})`}
              </SizableText>
              <SizableText fontSize={13} lineHeight={20} style={{ color: paint.mute }}>
                {doc.summary}
              </SizableText>
            </YStack>

            <XStack gap={10} flexWrap="wrap">
              {doc.metrics.map((met) => (
                <YStack
                  key={met.label}
                  flex={1}
                  minW={150}
                  p={12}
                  rounded={10}
                  borderWidth={1}
                  gap={4}
                  style={{ backgroundColor: paint.card, borderColor: paint.border }}
                >
                  <SizableText fontSize={11} style={{ color: paint.dim }}>
                    {met.label}
                  </SizableText>
                  <SizableText fontSize={18} fontWeight="700" style={{ color: paint.ink, fontFamily: 'var(--font-mono)' }}>
                    {met.value}
                  </SizableText>
                  <SizableText fontSize={11} fontWeight="600" style={{ color: paint.speaking }}>
                    {met.delta}
                  </SizableText>
                </YStack>
              ))}
            </XStack>

            <YStack gap={6}>
              <SizableText fontSize={13} fontWeight="700" style={{ color: paint.ink }}>
                Executable Deliverables Checklist
              </SizableText>
              {tasks.map((t, idx) => (
                <ExecutableTaskRow
                  key={idx}
                  parsed={t}
                  sourceKind="space"
                  sourceId={doc.id}
                  sourceLabel={doc.title}
                  sourcePath={`/spaces/${doc.id}`}
                />
              ))}
            </YStack>
          </YStack>
        </ScrollArea>
      </XStack>
    </YStack>
  )
}
