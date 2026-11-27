/**
 * Hanzo Memory Workspace (`/memory`)
 *
 * Aggregates real workspace documents and active workspace agents from live backends.
 */
import { Input, ScrollArea, SizableText, XStack, YStack } from '@hanzo/ui'
import { Brain, Search } from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { press } from '~/shell/press.ts'
import { paint } from '~/theme/theme.ts'
import { useWorkspace } from '~/workspace/store.ts'

export function MemoryWorkspace() {
  const navigate = useNavigate()
  const { memory, hydrating } = useWorkspace()
  const [filter, setFilter] = useState('')

  const q = filter.trim().toLowerCase()
  const shown = memory.filter(
    (m) =>
      !q ||
      m.title.toLowerCase().includes(q) ||
      m.summary.toLowerCase().includes(q) ||
      m.tags.some((t) => t.toLowerCase().includes(q)),
  )

  return (
    <YStack flex={1} minW={0} minH={0} style={{ backgroundColor: paint.panel }} data-testid="memory-workspace">
      <XStack
        height={44}
        px={18}
        items="center"
        justify="space-between"
        borderBottomWidth={1}
        style={{ borderBottomColor: paint.rule }}
      >
        <XStack items="center" gap={8}>
          <Brain size={15} color={paint.ink} />
          <SizableText fontSize={14} fontWeight="700" style={{ color: paint.ink }}>
            Memory
          </SizableText>
          <SizableText fontSize={12} style={{ color: paint.dim }}>
            Workspace documents &amp; active agent context
          </SizableText>
        </XStack>

        <XStack
          width={220}
          height={28}
          px={9}
          rounded={7}
          borderWidth={1}
          items="center"
          gap={6}
          style={{ backgroundColor: paint.omnibox, borderColor: paint.omniboxEdge }}
        >
          <Search size={12} color={paint.dim} />
          <Input
            flex={1}
            unstyled
            height={24}
            borderWidth={0}
            bg="transparent"
            fontSize={12}
            color={paint.ink}
            placeholder="Filter docs & agents…"
            value={filter}
            onChangeText={setFilter}
          />
        </XStack>
      </XStack>

      <ScrollArea flex={1} minH={0}>
        <YStack p={24} gap={12} maxW={780}>
          {hydrating && shown.length === 0 ? (
            <YStack p={20} rounded={14} borderWidth={1} style={{ backgroundColor: paint.card, borderColor: paint.border }}>
              <SizableText fontSize={13} style={{ color: paint.dim }}>
                Loading workspace knowledge…
              </SizableText>
            </YStack>
          ) : shown.length === 0 ? (
            <YStack p={24} rounded={14} borderWidth={1} gap={6} style={{ backgroundColor: paint.card, borderColor: paint.border }}>
              <SizableText fontSize={14} fontWeight="600" style={{ color: paint.ink }}>
                {q ? 'No matching items' : 'No documents or agents indexed yet'}
              </SizableText>
              <SizableText fontSize={12.5} style={{ color: paint.dim }}>
                Create documents in Spaces or bots in the Virtual Office to populate workspace memory.
              </SizableText>
            </YStack>
          ) : (
            shown.map((node) => (
              <YStack
                key={node.id}
                p={16}
                rounded={14}
                borderWidth={1}
                gap={8}
                style={{ backgroundColor: paint.card, borderColor: paint.border }}
              >
                <XStack items="center" justify="space-between" gap={8}>
                  <XStack items="center" gap={8}>
                    <XStack px={6} py={1.5} rounded={4} style={{ backgroundColor: paint.elevated }}>
                      <SizableText fontSize={10} fontWeight="700" style={{ color: paint.ink, fontFamily: 'var(--font-mono)' }}>
                        {node.category}
                      </SizableText>
                    </XStack>
                    <SizableText fontSize={13.5} fontWeight="700" style={{ color: paint.ink }}>
                      {node.title}
                    </SizableText>
                  </XStack>
                  <SizableText fontSize={11} style={{ color: paint.dim }}>
                    {`@${node.ownerHandle} · ${node.updatedAt}`}
                  </SizableText>
                </XStack>

                <SizableText fontSize={12.5} lineHeight={19} style={{ color: paint.fg }}>
                  {node.summary}
                </SizableText>

                <XStack items="center" justify="space-between">
                  <XStack gap={5} flexWrap="wrap">
                    {node.tags.map((tg) => (
                      <XStack key={tg} px={6} py={1} rounded={4} style={{ backgroundColor: paint.surface }}>
                        <SizableText fontSize={10.5} style={{ color: paint.mute, fontFamily: 'var(--font-mono)' }}>
                          {`#${tg}`}
                        </SizableText>
                      </XStack>
                    ))}
                  </XStack>

                  {node.targetPath ? (
                    <XStack
                      {...press(() => navigate(node.targetPath!), `Open ${node.title}`)}
                      px={9}
                      py={4}
                      rounded={6}
                      borderWidth={1}
                      style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
                      hoverStyle={{ background: paint.hover }}
                    >
                      <SizableText fontSize={11} fontWeight="600" style={{ color: paint.ink }}>
                        Open →
                      </SizableText>
                    </XStack>
                  ) : null}
                </XStack>
              </YStack>
            ))
          )}
        </YStack>
      </ScrollArea>
    </YStack>
  )
}
