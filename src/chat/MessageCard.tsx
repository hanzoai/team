/**
 * High-density Mattermost × Discord engineering message row:
 * - Official portraits + role badges (`STAFF`, `BOT · @dev`, `BOT · @cyber`)
 * - Syntax-highlighted `Zen Mono` code & unified diff blocks (`-` / `+`)
 * - Interactive Executable Checkboxes (`- [ ] @cyber ...` -> `[Run @cyber]`)
 * - Inline Agent Approval & Deploy Cards (`[Approve & Deploy]`, `[Inspect Diff]`, `[Open Thread]`)
 * - Clickable reaction pills (`🔥 5`, `🚀 3`, `✅ 4`) & Mattermost Thread Summary bar
 */
import { SizableText, XStack, YStack } from '@hanzo/ui'
import {
  Check,
  CheckCircle2,
  Code2,
  Copy,
  MessageSquare,
  MoreHorizontal,
  Pin,
  Play,
  Rocket,
  SmilePlus,
  SquareCheck,
} from '@hanzogui/lucide-icons-2'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'

import { MemberPortrait } from '~/shell/UnifiedSidebar.tsx'
import { press } from '~/shell/press.ts'
import {
  delegateExecutableTask,
  executableTaskKey,
  parseExecutableTaskLine,
  toggleExecutableTaskDone,
  useExecutableTasks,
} from '~/tasks/executable.ts'
import { paint, ring, round, state } from '~/theme/theme.ts'
import { localBoardSource } from '~/workspace/board.ts'
import {
  approveDeployRelease,
  openThreadPane,
  toggleMessageReaction,
  togglePinMessage,
  type ChatMessageItem,
  type RosterMember,
} from '~/workspace/store.ts'

interface ContentBlock {
  kind: 'prose' | 'code' | 'task'
  lang?: string
  lines: string[]
}

function parseBodyBlocks(body: string): ContentBlock[] {
  const out: ContentBlock[] = []
  const rawLines = body.split('\n')
  let inCode = false
  let codeLang = ''
  let codeLines: string[] = []

  for (const line of rawLines) {
    const fence = /^```(\w*)\s*$/.exec(line)
    if (fence) {
      if (inCode) {
        out.push({ kind: 'code', lang: codeLang || 'code', lines: codeLines })
        inCode = false
        codeLang = ''
        codeLines = []
      } else {
        inCode = true
        codeLang = fence[1] || 'code'
      }
      continue
    }
    if (inCode) {
      codeLines.push(line)
      continue
    }
    if (parseExecutableTaskLine(line)) {
      out.push({ kind: 'task', lines: [line] })
    } else if (line.trim() !== '') {
      out.push({ kind: 'prose', lines: [line] })
    }
  }
  if (inCode && codeLines.length > 0) {
    out.push({ kind: 'code', lang: codeLang || 'code', lines: codeLines })
  }
  return out
}

function renderFormattedLine(line: string, renderMath = true): ReactNode[] {
  if (!renderMath) {
    return [<SizableText key={0} fontSize={13.5} style={{ color: paint.fg }}>{line}</SizableText>]
  }
  const tokens = line.split(/(\*\*[^*]+\*\*|`[^`]+`|\$[^$]+\$|@[a-zA-Z0-9_-]+)/g)
  return tokens.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <SizableText key={idx} fontSize={13.5} fontWeight="700" style={{ color: paint.ink }}>
          {part.slice(2, -2)}
        </SizableText>
      )
    }
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      return (
        <SizableText
          key={idx}
          fontSize={12.5}
          fontWeight="500"
          style={{
            color: paint.ink,
            backgroundColor: paint.elevated,
            fontFamily: 'var(--font-mono)',
            fontStyle: 'italic',
            paddingInline: 5,
            paddingBlock: 1,
            borderRadius: 4,
          }}
        >
          {part.slice(1, -1)}
        </SizableText>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <SizableText
          key={idx}
          fontSize={12}
          fontWeight="500"
          style={{
            color: paint.ink,
            backgroundColor: paint.elevated,
            fontFamily: 'var(--font-mono)',
            paddingInline: 5,
            paddingBlock: 1,
            borderRadius: 4,
          }}
        >
          {part.slice(1, -1)}
        </SizableText>
      )
    }
    if (part.startsWith('@') && part.length > 1) {
      return (
        <SizableText key={idx} fontSize={13.5} fontWeight="600" style={{ color: paint.alert }}>
          {part}
        </SizableText>
      )
    }
    return (
      <SizableText key={idx} fontSize={13.5} style={{ color: paint.fg }}>
        {part}
      </SizableText>
    )
  })
}

export function MessageCard({
  message,
  author,
  roster,
  roomLabel,
  density = 'cozy',
  renderMath = true,
}: {
  message: ChatMessageItem
  author: RosterMember
  roster: readonly RosterMember[]
  roomLabel: string
  density?: 'cozy' | 'compact'
  renderMath?: boolean
}) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [diffOpen, setDiffOpen] = useState(false)
  const [issueCreated, setIssueCreated] = useState(false)
  const execTasks = useExecutableTasks()
  const blocks = parseBodyBlocks(message.body)
  const isCompact = density === 'compact'

  const handleCreateIssue = () => {
    void localBoardSource.add?.('todo', message.body.split('\n')[0]?.slice(0, 72) || 'Follow-up from chat')
    setIssueCreated(true)
  }

  return (
    <XStack
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      px={18}
      py={isCompact ? 4 : 9}
      gap={isCompact ? 8 : 11}
      items="flex-start"
      position="relative"
      style={{ backgroundColor: hovered ? paint.rowHover : 'transparent' }}
      data-testid={`message-row-${message.id}`}
    >
      <YStack pt={isCompact ? 1 : 2}>
        <MemberPortrait member={author} size={isCompact ? 22 : 34} speaking={Boolean(author.speaking)} />
      </YStack>

      <YStack flex={1} minW={0} gap={isCompact ? 3 : 5}>
        {/* Author Header: Name + Role Badge + Timestamp + Pin tag */}
        <XStack items="center" gap={7} flexWrap="wrap">
          <SizableText fontSize={13.5} fontWeight="700" style={{ color: paint.ink }}>
            {author.name}
          </SizableText>
          {author.badge ? (
            <XStack
              px={5}
              py={1}
              rounded={4}
              borderWidth={1}
              style={{
                backgroundColor: author.bot ? paint.elevated : paint.surface,
                borderColor: paint.border,
              }}
            >
              <SizableText
                fontSize={9.5}
                fontWeight="700"
                style={{ color: author.bot ? paint.ink : paint.mute, fontFamily: 'var(--font-mono)' }}
              >
                {author.badge}
              </SizableText>
            </XStack>
          ) : null}
          <SizableText fontSize={11} style={{ color: paint.dim, fontFamily: 'var(--font-mono)' }}>
            {message.at}
          </SizableText>
          {message.pinned ? (
            <XStack items="center" gap={3} px={5} py={1} rounded={4} style={{ backgroundColor: paint.elevated }}>
              <Pin size={10} color={paint.mute} />
              <SizableText fontSize={9.5} fontWeight="600" style={{ color: paint.mute }}>
                Pinned
              </SizableText>
            </XStack>
          ) : null}
        </XStack>

        {/* Rich Content Blocks (Prose, Code/Diff, Executable Checkboxes) */}
        <YStack gap={6}>
          {blocks.map((b, idx) => {
            if (b.kind === 'prose') {
              return (
                <SizableText key={idx} fontSize={isCompact ? 13 : 13.5} lineHeight={isCompact ? 18 : 20} style={{ color: paint.fg }}>
                  {renderFormattedLine(b.lines[0] ?? '', renderMath)}
                </SizableText>
              )
            }

            if (b.kind === 'code') {
              const isDiff = b.lang === 'diff'
              return (
                <YStack
                  key={idx}
                  rounded={8}
                  borderWidth={1}
                  overflow="hidden"
                  style={{ backgroundColor: paint.code, borderColor: paint.codeEdge }}
                >
                  <XStack
                    px={10}
                    py={5}
                    items="center"
                    justify="space-between"
                    borderBottomWidth={1}
                    style={{ backgroundColor: paint.card, borderBottomColor: paint.codeEdge }}
                  >
                    <XStack items="center" gap={6}>
                      <Code2 size={12} color={paint.dim} />
                      <SizableText fontSize={10.5} fontWeight="600" style={{ color: paint.mute, fontFamily: 'var(--font-mono)' }}>
                        {b.lang}
                      </SizableText>
                    </XStack>
                    <XStack
                      {...press(() => {
                        void navigator.clipboard?.writeText(b.lines.join('\n'))
                        setCopiedIdx(idx)
                        setTimeout(() => setCopiedIdx(null), 1200)
                      }, 'Copy code')}
                      px={6}
                      py={2}
                      rounded={4}
                      items="center"
                      gap={4}
                      hoverStyle={{ background: paint.hover }}
                    >
                      <Copy size={10} color={paint.dim} />
                      <SizableText fontSize={10} style={{ color: paint.dim }}>
                        {copiedIdx === idx ? 'Copied' : 'Copy'}
                      </SizableText>
                    </XStack>
                  </XStack>
                  <YStack py={6}>
                    {b.lines.map((codeLine, ln) => {
                      const add = isDiff && codeLine.startsWith('+')
                      const del = isDiff && codeLine.startsWith('-')
                      return (
                        <XStack
                          key={ln}
                          px={12}
                          py={1.5}
                          style={{
                            backgroundColor: add ? paint.diffAddBg : del ? paint.diffDelBg : 'transparent',
                          }}
                        >
                          <SizableText
                            fontSize={12}
                            lineHeight={18}
                            style={{
                              color: add ? paint.diffAddInk : del ? paint.diffDelInk : paint.fg,
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {codeLine}
                          </SizableText>
                        </XStack>
                      )
                    })}
                  </YStack>
                </YStack>
              )
            }

            // Executable Checkbox Line
            const parsed = parseExecutableTaskLine(b.lines[0] ?? '')
            if (!parsed) return null
            const taskKey = executableTaskKey('chat', message.roomId, parsed.agentHandle, parsed.title)
            const stored = execTasks.find((r) => r.id === taskKey)
            const done = stored ? stored.state === 'done' : parsed.checked
            const running = stored?.state === 'running'

            return (
              <XStack
                key={idx}
                px={10}
                py={6}
                rounded={7}
                borderWidth={1}
                items="center"
                justify="space-between"
                gap={8}
                style={{ backgroundColor: paint.card, borderColor: paint.border }}
                data-testid="inline-exec-checkbox"
              >
                <XStack items="center" gap={8} flex={1} minW={0}>
                  <YStack
                    {...press(() => {
                      toggleExecutableTaskDone({
                        sourceKind: 'chat',
                        sourceId: message.roomId,
                        sourceLabel: roomLabel,
                        sourcePath: `/chat/${message.roomId}`,
                        agentHandle: parsed.agentHandle,
                        title: parsed.title,
                        initialChecked: parsed.checked,
                      })
                    }, `Toggle ${parsed.title}`)}
                    width={16}
                    height={16}
                    rounded={4}
                    borderWidth={1.5}
                    items="center"
                    justify="center"
                    shrink={0}
                    style={{
                      backgroundColor: done ? state.done : 'transparent',
                      borderColor: done ? state.done : paint.mute,
                    }}
                  >
                    {done ? <Check size={10} color={paint.ground} /> : null}
                  </YStack>
                  <XStack
                    {...press(() => navigate(`/chat/dm-${parsed.agentHandle}`), `@${parsed.agentHandle}`)}
                    px={5}
                    py={1}
                    rounded={4}
                    borderWidth={1}
                    style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
                  >
                    <SizableText fontSize={11} fontWeight="700" style={{ color: paint.ink, fontFamily: 'var(--font-mono)' }}>
                      {`@${parsed.agentHandle}`}
                    </SizableText>
                  </XStack>
                  <SizableText
                    fontSize={12.5}
                    flex={1}
                    numberOfLines={1}
                    style={{
                      color: done ? paint.dim : paint.ink,
                      textDecorationLine: done ? 'line-through' : 'none',
                    }}
                  >
                    {parsed.title}
                  </SizableText>
                </XStack>

                {done && message.mergedRef ? (
                  <XStack px={6} py={1.5} rounded={4} style={{ backgroundColor: paint.speakingBg }}>
                    <SizableText fontSize={10.5} fontWeight="600" style={{ color: paint.speaking, fontFamily: 'var(--font-mono)' }}>
                      {`✓ Merged ${message.mergedRef}`}
                    </SizableText>
                  </XStack>
                ) : !done ? (
                  <XStack
                    {...press(() => {
                      delegateExecutableTask({
                        sourceKind: 'chat',
                        sourceId: message.roomId,
                        sourceLabel: roomLabel,
                        sourcePath: `/chat/${message.roomId}`,
                        agentHandle: parsed.agentHandle,
                        title: parsed.title,
                        handedOffBy: 'Zach Kelling',
                      })
                    }, `Run @${parsed.agentHandle}`)}
                    px={8}
                    py={3}
                    rounded={5}
                    items="center"
                    gap={4}
                    style={{ backgroundColor: running ? paint.speakingBg : paint.ink }}
                  >
                    <Play size={9.5} color={running ? paint.speaking : paint.ground} />
                    <SizableText
                      fontSize={10.5}
                      fontWeight="700"
                      style={{ color: running ? paint.speaking : paint.ground }}
                    >
                      {running ? `Running @${parsed.agentHandle}…` : `Run @${parsed.agentHandle}`}
                    </SizableText>
                  </XStack>
                ) : null}
              </XStack>
            )
          })}
        </YStack>

        {/* Inline Agent Approval & Deploy Card */}
        {message.deployCard ? (
          <YStack
            mt={2}
            p={11}
            rounded={9}
            borderWidth={1}
            gap={7}
            style={{ backgroundColor: paint.card, borderColor: paint.border }}
            data-testid={`deploy-card-${message.deployCard.id}`}
          >
            <XStack items="center" justify="space-between" gap={8} flexWrap="wrap">
              <XStack items="center" gap={7}>
                <Rocket size={14} color={message.deployCard.approvedBy ? paint.speaking : paint.ink} />
                <SizableText fontSize={13} fontWeight="700" style={{ color: paint.ink }}>
                  {`Release Candidate · ${message.deployCard.version}`}
                </SizableText>
              </XStack>
              <XStack
                px={7}
                py={2}
                rounded={round.pill}
                style={{
                  backgroundColor: message.deployCard.approvedBy ? paint.speakingBg : paint.sevBg,
                }}
              >
                <SizableText
                  fontSize={10.5}
                  fontWeight="700"
                  style={{ color: message.deployCard.approvedBy ? paint.speaking : paint.sevInk }}
                >
                  {message.deployCard.approvedBy
                    ? `✓ Deployed by ${message.deployCard.approvedBy}`
                    : 'Awaiting Approval'}
                </SizableText>
              </XStack>
            </XStack>

            <SizableText fontSize={12} style={{ color: paint.mute }}>
              {`${message.deployCard.summary} — ${message.deployCard.checks}`}
            </SizableText>

            {diffOpen ? (
              <XStack px={9} py={5} rounded={6} style={{ backgroundColor: paint.code }}>
                <SizableText fontSize={11} style={{ color: paint.diffAddInk, fontFamily: 'var(--font-mono)' }}>
                  {message.deployCard.diffPreview}
                </SizableText>
              </XStack>
            ) : null}

            <XStack items="center" gap={7} flexWrap="wrap">
              {!message.deployCard.approvedBy ? (
                <XStack
                  {...press(() => approveDeployRelease(message.id), 'Approve and deploy release')}
                  px={10}
                  py={5}
                  rounded={6}
                  items="center"
                  gap={5}
                  style={{ backgroundColor: paint.ink }}
                  focusVisibleStyle={ring}
                  data-testid="approve-deploy-btn"
                >
                  <CheckCircle2 size={12} color={paint.ground} />
                  <SizableText fontSize={11.5} fontWeight="700" style={{ color: paint.ground }}>
                    Approve &amp; Deploy
                  </SizableText>
                </XStack>
              ) : null}
              <XStack
                {...press(() => setDiffOpen((v) => !v), 'Inspect diff')}
                px={9}
                py={5}
                rounded={6}
                borderWidth={1}
                style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
                hoverStyle={{ background: paint.hover }}
              >
                <SizableText fontSize={11.5} fontWeight="600" style={{ color: paint.ink }}>
                  {diffOpen ? 'Hide Diff' : 'Inspect Diff'}
                </SizableText>
              </XStack>
              <XStack
                {...press(() => openThreadPane(message.roomId, message.id), 'Open thread')}
                px={9}
                py={5}
                rounded={6}
                borderWidth={1}
                style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
                hoverStyle={{ background: paint.hover }}
              >
                <SizableText fontSize={11.5} fontWeight="600" style={{ color: paint.mute }}>
                  Open Thread
                </SizableText>
              </XStack>
            </XStack>
          </YStack>
        ) : null}

        {/* Reaction Pills (`🔥 5`, `🚀 3`, `✅ 4` — clickable to toggle!) */}
        {message.reactions.length > 0 ? (
          <XStack items="center" gap={5} pt={2} flexWrap="wrap">
            {message.reactions.map((r) => (
              <XStack
                key={r.emoji}
                {...press(() => toggleMessageReaction(message.id, r.emoji), `Toggle ${r.emoji}`)}
                aria-pressed={r.mine}
                height={23}
                px={7}
                rounded={12}
                borderWidth={1}
                items="center"
                gap={4}
                style={{
                  backgroundColor: r.mine ? paint.rowActive : paint.card,
                  borderColor: r.mine ? paint.mute : paint.border,
                }}
                hoverStyle={{ background: paint.hover }}
              >
                <SizableText fontSize={12}>{r.emoji}</SizableText>
                <SizableText fontSize={11} fontWeight="600" style={{ color: r.mine ? paint.ink : paint.mute }}>
                  {r.count}
                </SizableText>
              </XStack>
            ))}
            <XStack
              {...press(() => toggleMessageReaction(message.id, '✅'), 'Add check reaction')}
              width={23}
              height={23}
              rounded={12}
              borderWidth={1}
              items="center"
              justify="center"
              style={{ backgroundColor: paint.card, borderColor: paint.border }}
              hoverStyle={{ background: paint.hover }}
            >
              <SmilePlus size={11} color={paint.dim} />
            </XStack>
          </XStack>
        ) : null}

        {/* Mattermost Simultaneous Thread Summary Bar (`3 replies · Last reply 2m ago -> View thread`) */}
        {message.replies.length > 0 ? (
          <XStack
            {...press(() => openThreadPane(message.roomId, message.id), 'Open thread in right pane')}
            mt={2}
            py={4}
            px={8}
            rounded={6}
            self="flex-start"
            items="center"
            gap={7}
            style={{ backgroundColor: paint.surface }}
            hoverStyle={{ background: paint.elevated }}
            focusVisibleStyle={ring}
            data-testid={`open-thread-bar-${message.id}`}
          >
            <XStack items="center" gap={-4}>
              {message.replies.slice(0, 3).map((rep) => {
                const repMember = roster.find((m) => m.id === rep.authorId) ?? roster[0]!
                return <MemberPortrait key={rep.id} member={repMember} size={18} />
              })}
            </XStack>
            <SizableText fontSize={12} fontWeight="600" style={{ color: paint.ink }}>
              {`${message.replies.length} ${message.replies.length === 1 ? 'reply' : 'replies'}`}
            </SizableText>
            <SizableText fontSize={11.5} style={{ color: paint.dim }}>
              Last reply 2m ago → View thread
            </SizableText>
          </XStack>
        ) : null}
      </YStack>

      {/* Hover Action Bar (`😀 React`, `🧵 Reply in thread`, `📌 Pin`, `☑️ Create Issue`, `⋯`) */}
      {hovered ? (
        <XStack
          position="absolute"
          t={-10}
          r={16}
          px={4}
          py={3}
          rounded={7}
          borderWidth={1}
          gap={2}
          items="center"
          style={{ backgroundColor: paint.sidebar, borderColor: paint.border, zIndex: 20 }}
          data-testid={`hover-actions-${message.id}`}
        >
          <HoverIconBtn label="React" onPress={() => toggleMessageReaction(message.id, '🔥')}>
            <SmilePlus size={13} color={paint.mute} />
          </HoverIconBtn>
          <HoverIconBtn label="Reply in thread" onPress={() => openThreadPane(message.roomId, message.id)}>
            <MessageSquare size={13} color={paint.mute} />
          </HoverIconBtn>
          <HoverIconBtn label="Pin message" onPress={() => togglePinMessage(message.id)}>
            <Pin size={13} color={message.pinned ? paint.ink : paint.mute} />
          </HoverIconBtn>
          <HoverIconBtn label={issueCreated ? 'Issue created' : 'Create Issue'} onPress={handleCreateIssue}>
            <SquareCheck size={13} color={issueCreated ? paint.speaking : paint.mute} />
          </HoverIconBtn>
          <HoverIconBtn label="More actions" onPress={() => openThreadPane(message.roomId, message.id)}>
            <MoreHorizontal size={13} color={paint.mute} />
          </HoverIconBtn>
        </XStack>
      ) : null}
    </XStack>
  )
}

function HoverIconBtn({
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
      width={25}
      height={25}
      rounded={5}
      items="center"
      justify="center"
      hoverStyle={{ background: paint.hover }}
    >
      {children}
    </XStack>
  )
}
