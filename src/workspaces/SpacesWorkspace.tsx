/**
 * Hanzo Spaces / Documents Workspace (`/spaces` & `/spaces/:id`)
 *
 * Hydrated directly from `GET /v1/team/docs` with real document creation (`POST /v1/team/docs`).
 */
import { Input, ScrollArea, SizableText, XStack, YStack } from '@hanzo/ui'
import { FileText, Layers, Plus } from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { useParams } from 'react-router'

import { press } from '~/shell/press.ts'
import { paint } from '~/theme/theme.ts'
import { createWorkspaceDoc, useWorkspace } from '~/workspace/store.ts'

export function SpacesWorkspace() {
  const { id } = useParams()
  const { spaces, hydrating } = useWorkspace()
  const [selectedId, setSelectedId] = useState(id || '')
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)

  const doc = spaces.find((s) => s.id === (id || selectedId)) ?? spaces[0] ?? null

  const submitDoc = async () => {
    const clean = newTitle.trim()
    if (!clean || creating) return
    setCreating(true)
    setCreateErr(null)
    try {
      const created = await createWorkspaceDoc(clean)
      setNewTitle('')
      if (created) setSelectedId(created.id)
    } catch (err) {
      setCreateErr(err instanceof Error ? err.message : 'Failed to create document')
    } finally {
      setCreating(false)
    }
  }

  return (
    <YStack flex={1} minW={0} minH={0} style={{ backgroundColor: paint.panel }} data-testid="spaces-workspace">
      <XStack
        height={44}
        px={18}
        items="center"
        justify="space-between"
        gap={10}
        borderBottomWidth={1}
        style={{ borderBottomColor: paint.rule }}
      >
        <XStack items="center" gap={8}>
          <Layers size={15} color={paint.ink} />
          <SizableText fontSize={14} fontWeight="700" style={{ color: paint.ink }}>
            Spaces &amp; Docs
          </SizableText>
          <SizableText fontSize={12} style={{ color: paint.dim }}>
            {`${spaces.length} ${spaces.length === 1 ? 'document' : 'documents'}`}
          </SizableText>
        </XStack>

        <XStack items="center" gap={6}>
          <XStack
            width={200}
            height={26}
            px={8}
            rounded={6}
            borderWidth={1}
            items="center"
            style={{ backgroundColor: paint.composer, borderColor: paint.border }}
          >
            <Input
              flex={1}
              unstyled
              height={22}
              borderWidth={0}
              bg="transparent"
              fontSize={12}
              color={paint.ink}
              placeholder="New document title…"
              value={newTitle}
              onChangeText={setNewTitle}
              onKeyDown={(e: { key?: string; preventDefault?: () => void }) => {
                if (e.key === 'Enter') {
                  e.preventDefault?.()
                  void submitDoc()
                }
              }}
            />
          </XStack>
          <XStack
            {...press(() => void submitDoc(), 'New Document')}
            height={26}
            px={9}
            rounded={6}
            items="center"
            gap={4}
            opacity={creating || !newTitle.trim() ? 0.5 : 1}
            style={{ backgroundColor: paint.ink }}
          >
            <Plus size={11} color={paint.ground} />
            <SizableText fontSize={11.5} fontWeight="700" style={{ color: paint.ground }}>
              New Doc
            </SizableText>
          </XStack>
        </XStack>
      </XStack>

      {createErr ? (
        <XStack px={18} py={6} borderBottomWidth={1} style={{ borderBottomColor: paint.rule }}>
          <SizableText fontSize={12} style={{ color: paint.alert }}>
            {createErr}
          </SizableText>
        </XStack>
      ) : null}

      {hydrating && spaces.length === 0 ? (
        <YStack flex={1} items="center" justify="center" p={24}>
          <SizableText fontSize={13} style={{ color: paint.dim }}>
            Loading workspace documents…
          </SizableText>
        </YStack>
      ) : !doc ? (
        <YStack flex={1} items="center" justify="center" p={24} gap={8}>
          <FileText size={24} color={paint.dim} />
          <SizableText fontSize={15} fontWeight="600" style={{ color: paint.ink }}>
            No documents in this workspace yet
          </SizableText>
          <SizableText fontSize={12.5} style={{ color: paint.dim }}>
            Enter a title in the top bar and click "New Doc" to create your first document.
          </SizableText>
        </YStack>
      ) : (
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
                    {`${sp.teamspaceName} · ${sp.updatedAt}`}
                  </SizableText>
                </YStack>
              )
            })}
          </YStack>

          <ScrollArea flex={1} minH={0}>
            <YStack p={22} gap={16} maxW={720}>
              <YStack gap={6}>
                <SizableText fontSize={11} fontWeight="700" style={{ color: paint.dim, fontFamily: 'var(--font-mono)' }}>
                  {doc.teamspaceName.toUpperCase()}
                </SizableText>
                <SizableText fontSize={20} fontWeight="700" style={{ color: paint.ink }}>
                  {doc.title}
                </SizableText>
                <SizableText fontSize={12.5} style={{ color: paint.dim }}>
                  {`By @${doc.authorHandle} · Updated ${doc.updatedAt} · ${doc.comments} comments`}
                </SizableText>
              </YStack>

              <YStack p={14} rounded={10} borderWidth={1} gap={6} style={{ backgroundColor: paint.card, borderColor: paint.border }}>
                <SizableText fontSize={12} fontWeight="600" style={{ color: paint.ink }}>
                  Collaborative Document
                </SizableText>
                <SizableText fontSize={12} style={{ color: paint.dim, fontFamily: 'var(--font-mono)' }}>
                  {doc.collaborator}
                </SizableText>
              </YStack>
            </YStack>
          </ScrollArea>
        </XStack>
      )}
    </YStack>
  )
}
