/**
 * Mattermost × Hanzo Power Composer:
 * - Multi-line Markdown + code composer
 * - Toolbar: `[+]` attach, `[@]` mention human/bot, `[/]` slash commands
 *   (`/huddle`, `/issue`, `/deploy`, `/incident`, `/summon`), `[Aa]` Markdown/code,
 *   `[☑️]` executable task, `[enso-auto ⌄]` model selector, and `[↑]` send!
 */
import { Popover } from '@hanzo/gui'
import { SizableText, Textarea, XStack, YStack } from '@hanzo/ui'
import {
  ArrowUp,
  AtSign,
  Check,
  ChevronDown,
  Code2,
  Plus,
  Slash,
  SquareCheck,
} from '@hanzogui/lucide-icons-2'
import { useState, type ReactNode } from 'react'

import { MemberPortrait } from '~/shell/UnifiedSidebar.tsx'
import { press } from '~/shell/press.ts'
import { detectComposerExecutableHint } from '~/tasks/executable.ts'
import { paint, ring } from '~/theme/theme.ts'
import { localBoardSource } from '~/workspace/board.ts'
import {
  joinVoiceRoom,
  sendWorkspaceMessage,
  setComposerModel,
  useWorkspace,
  type ComposerModel,
} from '~/workspace/store.ts'

const SLASH_COMMANDS = [
  { cmd: '/huddle', desc: 'Start or join instant voice/screen-share huddle' },
  { cmd: '/issue', desc: 'Create a tracked Linear-grade issue on Work board' },
  { cmd: '/deploy', desc: 'Queue release candidate approval card via @dev' },
  { cmd: '/incident', desc: 'Declare SEV-2 incident & summon @cyber + @opera' },
  { cmd: '/summon', desc: 'Summon specialist agent (@vi, @dev, @sci, @cyber)' },
] as const

const MODELS: readonly { id: ComposerModel; label: string; desc: string }[] = [
  { id: 'enso-auto', label: 'enso-auto', desc: 'Dynamic specialist routing' },
  { id: 'zen6-coder', label: 'zen6-coder', desc: 'Systems, Rust/TS & diffs' },
  { id: 'zen6-ultra', label: 'zen6-ultra', desc: 'Deep architecture & research' },
]

export function PowerComposer({
  roomId,
  roomName,
  isDm = false,
}: {
  roomId: string
  roomName: string
  isDm?: boolean
}) {
  const { roster, composerModel } = useWorkspace()
  const [text, setText] = useState('')
  const [mentionOpen, setMentionOpen] = useState(false)
  const [slashOpen, setSlashOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)

  const execHint = detectComposerExecutableHint(text)
  const ready = text.trim().length > 0

  const handleSend = () => {
    const clean = text.trim()
    if (!clean) return
    if (clean.startsWith('/huddle')) {
      joinVoiceRoom('eng-pairing')
      sendWorkspaceMessage(roomId, 'Started voice huddle in **Eng Pairing** — hop in!')
      setText('')
      return
    }
    if (clean.startsWith('/issue')) {
      const title = clean.replace(/^\/issue\s*/, '').trim() || 'Follow-up engineering task'
      void localBoardSource.add?.('todo', title)
      sendWorkspaceMessage(roomId, `Created tracker issue: **${title}**`)
      setText('')
      return
    }
    sendWorkspaceMessage(roomId, clean)
    setText('')
  }

  const placeholder = isDm
    ? `Message ${roomName} — @mention, /command, or - [ ] to assign work…`
    : `Message #${roomName} — @mention humans or bots, /command, or - [ ] to assign work…`

  return (
    <YStack px={16} pb={14} pt={6} gap={6}>
      {execHint ? (
        <XStack
          px={10}
          py={4}
          rounded={6}
          borderWidth={1}
          items="center"
          justify="space-between"
          style={{ backgroundColor: paint.card, borderColor: paint.border }}
        >
          <SizableText fontSize={11.5} style={{ color: paint.mute }}>
            {`Executable task ready for @${execHint.agentHandle}: "${execHint.title || '…'}"`}
          </SizableText>
          <SizableText fontSize={10.5} fontWeight="600" style={{ color: paint.speaking }}>
            1-click runnable on send
          </SizableText>
        </XStack>
      ) : null}

      <YStack
        px={12}
        py={8}
        gap={6}
        rounded={12}
        borderWidth={1}
        style={{ backgroundColor: paint.composer, borderColor: paint.composerRule }}
        data-testid="team-composer"
      >
        <Textarea
          unstyled
          rows={1}
          minH={26}
          maxH={132}
          py={2}
          px={2}
          borderWidth={0}
          bg="transparent"
          fontSize={13.5}
          lineHeight={20}
          color={paint.ink}
          placeholder={placeholder}
          value={text}
          onChangeText={setText}
          onKeyDown={(e: { nativeEvent?: { key?: string }; key?: string; shiftKey?: boolean; preventDefault?: () => void }) => {
            const k = e.nativeEvent?.key ?? e.key
            if (k === 'Enter' && !e.shiftKey) {
              e.preventDefault?.()
              handleSend()
            }
          }}
        />

        <XStack items="center" justify="space-between" gap={6} flexWrap="wrap">
          {/* Left Power Tools: [+], [@], [/], [Aa], [☑️] */}
          <XStack items="center" gap={3}>
            <ComposerToolBtn
              label="Attach snippet"
              onPress={() => setText((prev) => `${prev}${prev ? '\n' : ''}Attached build artifact: \`hanzo-team-v1.1.0\``)}
            >
              <Plus size={14} color={paint.mute} />
            </ComposerToolBtn>

            {/* [@] Mention Picker */}
            <Popover open={mentionOpen} onOpenChange={setMentionOpen} placement="top-start" allowFlip stayInFrame>
              <Popover.Trigger asChild>
                <XStack
                  {...press(() => setMentionOpen((v) => !v), 'Mention human or bot')}
                  width={26}
                  height={26}
                  rounded={6}
                  items="center"
                  justify="center"
                  hoverStyle={{ background: paint.hover }}
                  data-testid="composer-mention-toggle"
                >
                  <AtSign size={14} color={paint.mute} />
                </XStack>
              </Popover.Trigger>
              <Popover.Content
                role="menu"
                borderWidth={1}
                rounded={10}
                p={6}
                width={220}
                style={{ backgroundColor: paint.sidebar, borderColor: paint.paneEdge, zIndex: 100000 }}
              >
                <YStack gap={2}>
                  {roster.slice(0, 8).map((m) => (
                    <XStack
                      key={m.id}
                      {...press(() => {
                        setMentionOpen(false)
                        setText((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}@${m.handle} `)
                      }, `Mention @${m.handle}`)}
                      px={8}
                      py={5}
                      rounded={6}
                      items="center"
                      gap={8}
                      hoverStyle={{ background: paint.hover }}
                    >
                      <MemberPortrait member={m} size={20} />
                      <SizableText fontSize={12.5} fontWeight="500" style={{ color: paint.ink }} flex={1}>
                        {m.bot ? `@${m.handle}` : m.name}
                      </SizableText>
                    </XStack>
                  ))}
                </YStack>
              </Popover.Content>
            </Popover>

            {/* [/] Slash Commands */}
            <Popover open={slashOpen} onOpenChange={setSlashOpen} placement="top-start" allowFlip stayInFrame>
              <Popover.Trigger asChild>
                <XStack
                  {...press(() => setSlashOpen((v) => !v), 'Slash commands')}
                  width={26}
                  height={26}
                  rounded={6}
                  items="center"
                  justify="center"
                  hoverStyle={{ background: paint.hover }}
                  data-testid="composer-slash-toggle"
                >
                  <Slash size={13} color={paint.mute} />
                </XStack>
              </Popover.Trigger>
              <Popover.Content
                role="menu"
                borderWidth={1}
                rounded={10}
                p={6}
                width={264}
                style={{ backgroundColor: paint.sidebar, borderColor: paint.paneEdge, zIndex: 100000 }}
              >
                <YStack gap={2}>
                  {SLASH_COMMANDS.map((sc) => (
                    <XStack
                      key={sc.cmd}
                      {...press(() => {
                        setSlashOpen(false)
                        setText(`${sc.cmd} `)
                      }, sc.cmd)}
                      px={8}
                      py={5}
                      rounded={6}
                      items="center"
                      justify="space-between"
                      gap={8}
                      hoverStyle={{ background: paint.hover }}
                    >
                      <SizableText fontSize={12} fontWeight="700" style={{ color: paint.ink, fontFamily: 'var(--font-mono)' }}>
                        {sc.cmd}
                      </SizableText>
                      <SizableText fontSize={11} style={{ color: paint.dim }} numberOfLines={1} flex={1}>
                        {sc.desc}
                      </SizableText>
                    </XStack>
                  ))}
                </YStack>
              </Popover.Content>
            </Popover>

            {/* [Aa] Code / Markdown block */}
            <ComposerToolBtn
              label="Insert code block"
              onPress={() => setText((prev) => `${prev}${prev ? '\n' : ''}\`\`\`ts\n\n\`\`\``)}
            >
              <Code2 size={14} color={paint.mute} />
            </ComposerToolBtn>

            {/* [☑️] Executable Task */}
            <ComposerToolBtn
              label="Insert executable @agent task"
              onPress={() => setText((prev) => `${prev}${prev ? '\n' : ''}- [ ] @dev `)}
            >
              <SquareCheck size={14} color={paint.mute} />
            </ComposerToolBtn>
          </XStack>

          {/* Right Controls: `[enso-auto ⌄]` model selector + `[↑]` send */}
          <XStack items="center" gap={8}>
            <Popover open={modelOpen} onOpenChange={setModelOpen} placement="top-end" allowFlip stayInFrame>
              <Popover.Trigger asChild>
                <XStack
                  {...press(() => setModelOpen((v) => !v), 'Select specialist model')}
                  height={25}
                  px={9}
                  rounded={12}
                  borderWidth={1}
                  items="center"
                  gap={5}
                  style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
                  hoverStyle={{ background: paint.hover }}
                  data-testid="composer-model-selector"
                >
                  <SizableText fontSize={11.5} fontWeight="500" style={{ color: paint.mute, fontFamily: 'var(--font-mono)' }}>
                    {composerModel}
                  </SizableText>
                  <ChevronDown size={11} color={paint.dim} />
                </XStack>
              </Popover.Trigger>
              <Popover.Content
                role="menu"
                borderWidth={1}
                rounded={10}
                p={6}
                width={228}
                style={{ backgroundColor: paint.sidebar, borderColor: paint.paneEdge, zIndex: 100000 }}
              >
                <YStack gap={2}>
                  {MODELS.map((m) => {
                    const active = m.id === composerModel
                    return (
                      <XStack
                        key={m.id}
                        {...press(() => {
                          setComposerModel(m.id)
                          setModelOpen(false)
                        }, m.label)}
                        px={8}
                        py={6}
                        rounded={6}
                        items="center"
                        justify="space-between"
                        hoverStyle={{ background: paint.hover }}
                      >
                        <YStack>
                          <SizableText fontSize={12} fontWeight="600" style={{ color: paint.ink, fontFamily: 'var(--font-mono)' }}>
                            {m.label}
                          </SizableText>
                          <SizableText fontSize={10.5} style={{ color: paint.dim }}>
                            {m.desc}
                          </SizableText>
                        </YStack>
                        {active ? <Check size={13} color={paint.ink} /> : null}
                      </XStack>
                    )
                  })}
                </YStack>
              </Popover.Content>
            </Popover>

            <SizableText fontSize={11.5} style={{ color: paint.dim }}>
              Auto
            </SizableText>

            <YStack
              {...press(handleSend, 'Send message')}
              width={28}
              height={28}
              rounded={14}
              items="center"
              justify="center"
              opacity={ready ? 1 : 0.85}
              style={{ backgroundColor: paint.composerAccent }}
              focusVisibleStyle={ring}
              data-testid="composer-send-btn"
            >
              <ArrowUp size={15} color={paint.composerAccentInk} />
            </YStack>
          </XStack>
        </XStack>
      </YStack>
    </YStack>
  )
}

function ComposerToolBtn({
  label,
  onPress,
  children,
}: {
  label: string
  onPress: () => void
  children: ReactNode
}) {
  return (
    <XStack
      {...press(onPress, label)}
      width={26}
      height={26}
      rounded={6}
      items="center"
      justify="center"
      hoverStyle={{ background: paint.hover }}
    >
      {children}
    </XStack>
  )
}
