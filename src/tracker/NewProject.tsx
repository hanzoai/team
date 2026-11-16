/**
 * Opening a project: a name, the key its issues carry, and what it is for.
 *
 * The key follows the name (`keyOf`) until the person types one of their own,
 * and is checked here against the projects this screen can see, so a clash is
 * said before anything is sent. The server checks it again inside the write
 * that opens the project (`start`), and that is the check that counts: a key
 * somebody else took a moment ago is refused there, and said here.
 */
import { Button, Dialog, DialogContent, DialogTitle, Input, SizableText, XStack, YStack } from '@hanzo/ui'
import { FolderKanban, X } from '@hanzogui/lucide-icons-2'
import { useState } from 'react'

import type { Project } from '~/data/model'
import type { Plane } from '~/data/socket'
import { KEY, keyOf, start } from '~/data/tracker'
import { caps, paint, round, rung } from '~/theme/theme'

/** What a typed key may hold: upper-case letters and digits, five at most. */
const keyed = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)

export function NewProject({
  open,
  plane,
  projects,
  onClose,
  onOpened,
}: {
  open: boolean
  /** The open space's plane; null while none is, and nothing can be sent. */
  plane: Plane | null
  /** The projects already in the space, to say a taken key before sending. */
  projects: readonly Project[]
  onClose: () => void
  onOpened: (id: string) => void
}) {
  const [name, setName] = useState('')
  /** The key the person typed; null while it follows the name. */
  const [typed, setTyped] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)

  const identifier = typed ?? keyOf(name)
  const taken = projects.some((p) => p.identifier.toUpperCase() === identifier)
  const problem = !name.trim()
    ? null
    : !identifier
      ? 'Give the project a key.'
      : !KEY.test(identifier)
        ? 'A key starts with a letter.'
        : taken
          ? `${identifier} is already another project's key.`
          : null
  const ready = !!plane && !!name.trim() && !problem && !busy

  const reset = () => {
    setName('')
    setTyped(null)
    setDescription('')
    setFailed(null)
  }

  const close = () => {
    if (busy) return
    reset()
    onClose()
  }

  const submit = async () => {
    if (!ready || !plane) return
    setBusy(true)
    setFailed(null)
    try {
      const id = await start(plane, plane.account ?? '', {
        name: name.trim(),
        identifier,
        description: description.trim() || undefined,
      })
      if (!id) {
        setFailed(`${identifier} was just taken by another project. Choose another key.`)
        return
      }
      reset()
      onOpened(id)
    } catch (e) {
      setFailed(`The project was not opened: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : close())}>
      <DialogContent showCloseButton={false} p={0} gap={0} bg="$panel" overflow="hidden">
        <XStack
          height={46}
          px={16}
          items="center"
          justify="space-between"
          borderBottomWidth={1}
          borderColor="$edge"
        >
          <XStack items="center" gap={8}>
            <FolderKanban size={15} color="$ink" />
            <DialogTitle fontSize={rung.body} fontWeight="700" color="$ink">
              New project
            </DialogTitle>
          </XStack>
          <Button variant="ghost" size="icon-sm" aria-label="Close" onPress={close}>
            <X size={15} color="$soft" />
          </Button>
        </XStack>

        <YStack p={16} gap={14}>
          <YStack gap={6}>
            <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
              Name
            </SizableText>
            <Input
              autoFocus
              aria-label="Project name"
              placeholder="e.g. Engineering"
              value={name}
              onChangeText={setName}
              onSubmitEditing={() => void submit()}
              fontSize={13}
              bg="$raised"
              borderColor="$edge"
            />
          </YStack>

          <YStack gap={6}>
            <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
              Key
            </SizableText>
            <Input
              aria-label="Project key"
              placeholder="ENG"
              value={identifier}
              onChangeText={(v: string) => setTyped(keyed(v))}
              onSubmitEditing={() => void submit()}
              autoCapitalize="characters"
              fontSize={13}
              bg="$raised"
              borderColor="$edge"
            />
            <SizableText fontSize={rung.small} color={problem ? '$ink' : '$soft'}>
              {problem ?? `Issues in this project are numbered ${identifier || 'KEY'}-1, ${identifier || 'KEY'}-2, …`}
            </SizableText>
          </YStack>

          <YStack gap={6}>
            <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
              Description
            </SizableText>
            <Input
              aria-label="Project description"
              placeholder="What this project is for (optional)"
              value={description}
              onChangeText={setDescription}
              onSubmitEditing={() => void submit()}
              fontSize={12}
              bg="$raised"
              borderColor="$edge"
            />
          </YStack>

          <SizableText fontSize={rung.small} color="$soft">
            It starts with four columns: Backlog, Todo, In Progress and Done. Everyone in this space can see it.
          </SizableText>

          {failed ? (
            <YStack p={10} rounded={round.field} borderWidth={1} borderColor="$edge" bg="$raised">
              <SizableText fontSize={rung.small} color="$ink" role="alert">
                {failed}
              </SizableText>
            </YStack>
          ) : null}
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
          <Button size="sm" variant="ghost" onPress={close} disabled={busy}>
            Cancel
          </Button>
          <Button
            size="sm"
            style={{ backgroundColor: paint.accent }}
            disabled={!ready}
            onPress={() => void submit()}
          >
            <SizableText fontSize={12} fontWeight="600" style={{ color: paint.ground }}>
              {busy ? 'Creating…' : 'Create project'}
            </SizableText>
          </Button>
        </XStack>
      </DialogContent>
    </Dialog>
  )
}
