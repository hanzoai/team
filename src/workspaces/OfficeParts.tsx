/**
 * Modular cards and dialogs for the Virtual Office HQ (`LiveRoomCard`,
 * `MemberDeskCard`, `CreateBotModal`, `RunBotModal`).
 */
import { Popover } from '@hanzo/gui'
import { Input, SizableText, Textarea, XStack, YStack } from '@hanzo/ui'
import {
  DoorOpen,
  Hand,
  MessageCircle,
  Play,
  Trash2,
  Volume2,
  X,
} from '@hanzogui/lucide-icons-2'
import { useState } from 'react'

import { bareAccount } from '~/data/model.ts'
import { MemberPortrait } from '~/shell/UnifiedSidebar.tsx'
import { press } from '~/shell/press.ts'
import { paint, ring, round, state } from '~/theme/theme.ts'
import type { RosterMember } from '~/workspace/store.ts'

export function LiveRoomCard({
  testId,
  title,
  subtitle,
  room,
  roster,
  connected,
  connecting,
  joinLabel,
  leaveLabel,
  onToggle,
}: {
  testId: string
  title: string
  subtitle: string
  room: { id: string; name: string; participants: readonly { memberId: string; name?: string; isLocal?: boolean; speaking?: boolean }[] }
  roster: readonly RosterMember[]
  connected: boolean
  connecting: boolean
  joinLabel: string
  leaveLabel: string
  onToggle: () => void
}) {
  return (
    <YStack
      p={14}
      rounded={12}
      borderWidth={1}
      justify="space-between"
      gap={12}
      style={{
        backgroundColor: paint.card,
        borderColor: connected ? paint.voiceEdge : paint.border,
      }}
      data-testid={testId}
    >
      <XStack items="center" justify="space-between" gap={8}>
        <YStack flex={1} minW={0}>
          <SizableText fontSize={13} fontWeight="700" style={{ color: paint.ink }}>
            {title}
          </SizableText>
          <SizableText fontSize={11} style={{ color: connected ? paint.speaking : paint.dim }} numberOfLines={1}>
            {subtitle}
          </SizableText>
        </YStack>
        <Volume2 size={14} color={connected ? paint.speaking : paint.mute} />
      </XStack>

      <XStack
        py={10}
        px={10}
        minH={58}
        rounded={10}
        items="center"
        justify={room.participants.length > 0 ? 'flex-start' : 'center'}
        gap={10}
        flexWrap="wrap"
        style={{ backgroundColor: paint.elevated }}
      >
        {room.participants.length === 0 ? (
          <SizableText fontSize={11.5} style={{ color: paint.dim }}>
            No live participants yet
          </SizableText>
        ) : (
          room.participants.map((p) => {
            const matched = roster.find(
              (r) => r.id === p.memberId || bareAccount(r.id) === bareAccount(p.memberId),
            )
            const displayName = matched?.name || p.name || p.memberId.slice(0, 8)
            return (
              <YStack key={p.memberId} items="center" gap={3}>
                <MemberPortrait
                  member={matched ?? { name: displayName, shortName: displayName, bot: false }}
                  size={36}
                  speaking={Boolean(p.speaking)}
                />
                <SizableText fontSize={10} style={{ color: p.speaking ? paint.speaking : paint.mute }} numberOfLines={1}>
                  {p.isLocal ? `${displayName} (You)` : displayName}
                </SizableText>
              </YStack>
            )
          })
        )}
      </XStack>

      <XStack
        {...press(onToggle, connected ? leaveLabel : joinLabel)}
        py={6}
        rounded={7}
        borderWidth={1}
        items="center"
        justify="center"
        style={{
          backgroundColor: connected ? paint.speakingBg : paint.elevated,
          borderColor: connected ? paint.voiceEdge : paint.border,
        }}
        hoverStyle={{ background: paint.hover }}
        focusVisibleStyle={ring}
      >
        <SizableText fontSize={11.5} fontWeight="600" style={{ color: connected ? paint.speaking : paint.ink }}>
          {connecting ? 'Connecting…' : connected ? leaveLabel : joinLabel}
        </SizableText>
      </XStack>
    </YStack>
  )
}

export function MemberDeskCard({
  member,
  onChat,
  onWave,
  onKnock,
  onRun,
  onDelete,
}: {
  member: RosterMember
  onChat: () => void
  onWave: () => void
  onKnock: () => void
  onRun?: () => void
  onDelete?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <YStack
      p={12}
      minH={116}
      rounded={11}
      borderWidth={1}
      justify="space-between"
      gap={8}
      style={{ backgroundColor: paint.card, borderColor: paint.border }}
      data-testid={`desk-card-${member.handle}`}
    >
      <XStack items="center" justify="space-between" gap={6}>
        <XStack items="center" gap={8} flex={1} minW={0}>
          <Popover open={menuOpen} onOpenChange={setMenuOpen} placement="top" allowFlip stayInFrame>
            <Popover.Trigger asChild>
              <YStack
                {...press(() => setMenuOpen((v) => !v), `${member.name} actions`)}
                position="relative"
                rounded={round.pill}
                data-testid={`office-head-${member.id}`}
              >
                <MemberPortrait member={member} size={34} />
                <YStack
                  position="absolute"
                  b={-1}
                  r={-1}
                  width={9}
                  height={9}
                  rounded={round.pill}
                  borderWidth={1.5}
                  style={{
                    backgroundColor: member.presence === 'online' || member.bot ? state.done : paint.dim,
                    borderColor: paint.card,
                  }}
                />
              </YStack>
            </Popover.Trigger>
            <Popover.Content
              role="menu"
              borderWidth={1}
              rounded={10}
              p={8}
              width={204}
              style={{ backgroundColor: paint.sidebar, borderColor: paint.paneEdge, zIndex: 100000 }}
            >
              <YStack gap={6}>
                <SizableText fontSize={12.5} fontWeight="700" style={{ color: paint.ink }}>
                  {member.name}
                </SizableText>
                <XStack gap={4}>
                  <XStack
                    {...press(() => {
                      setMenuOpen(false)
                      onWave()
                    }, 'Wave')}
                    flex={1}
                    py={5}
                    rounded={6}
                    borderWidth={1}
                    items="center"
                    justify="center"
                    gap={4}
                    style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
                  >
                    <Hand size={11} color={paint.sevInk} />
                    <SizableText fontSize={11} fontWeight="600" style={{ color: paint.ink }}>
                      Wave
                    </SizableText>
                  </XStack>
                  <XStack
                    {...press(() => {
                      setMenuOpen(false)
                      onKnock()
                    }, 'Knock')}
                    flex={1}
                    py={5}
                    rounded={6}
                    borderWidth={1}
                    items="center"
                    justify="center"
                    gap={4}
                    style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
                  >
                    <DoorOpen size={11} color={paint.mute} />
                    <SizableText fontSize={11} fontWeight="600" style={{ color: paint.ink }}>
                      Knock
                    </SizableText>
                  </XStack>
                </XStack>
              </YStack>
            </Popover.Content>
          </Popover>

          <YStack flex={1} minW={0}>
            <SizableText fontSize={12.5} fontWeight="700" style={{ color: paint.ink }} numberOfLines={1}>
              {member.bot ? `@${member.handle}` : member.name}
            </SizableText>
            <SizableText fontSize={10.5} style={{ color: paint.dim }} numberOfLines={1}>
              {member.bot ? member.model || 'AI Agent' : member.presence === 'online' ? 'Online' : 'Offline'}
            </SizableText>
          </YStack>
        </XStack>

        {member.bot ? (
          <XStack px={5} py={1} rounded={4} style={{ backgroundColor: paint.elevated }}>
            <SizableText fontSize={9.5} fontWeight="700" style={{ color: paint.mute, fontFamily: 'var(--font-mono)' }}>
              BOT
            </SizableText>
          </XStack>
        ) : null}
      </XStack>

      <SizableText fontSize={11} style={{ color: paint.dim }} numberOfLines={2}>
        {member.activity || (member.bot ? 'Ready' : member.role || 'Member')}
      </SizableText>

      <XStack items="center" gap={5}>
        <XStack
          {...press(onChat, `Chat with ${member.name}`)}
          flex={1}
          py={4}
          px={7}
          rounded={6}
          borderWidth={1}
          items="center"
          justify="center"
          gap={4}
          style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
          hoverStyle={{ background: paint.hover }}
        >
          <MessageCircle size={11} color={paint.speaking} />
          <SizableText fontSize={11} fontWeight="600" style={{ color: paint.ink }}>
            Chat
          </SizableText>
        </XStack>

        {onRun ? (
          <XStack
            {...press(onRun, `Run @${member.handle}`)}
            flex={1}
            py={4}
            px={7}
            rounded={6}
            borderWidth={1}
            items="center"
            justify="center"
            gap={4}
            style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
            hoverStyle={{ background: paint.hover }}
            data-testid={`desk-run-${member.handle}`}
          >
            <Play size={10} color={paint.ink} />
            <SizableText fontSize={11} fontWeight="600" style={{ color: paint.ink }}>
              Run
            </SizableText>
          </XStack>
        ) : null}

        {onDelete ? (
          <XStack
            {...press(onDelete, `Delete @${member.handle}`)}
            width={26}
            height={24}
            rounded={6}
            borderWidth={1}
            items="center"
            justify="center"
            style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
            hoverStyle={{ background: paint.hover }}
            data-testid={`desk-delete-${member.handle}`}
          >
            <Trash2 size={11} color={paint.alert} />
          </XStack>
        ) : null}
      </XStack>
    </YStack>
  )
}

export function CreateBotModal({
  botName,
  setBotName,
  botModel,
  setBotModel,
  botDesc,
  setBotDesc,
  botInstructions,
  setBotInstructions,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  botName: string
  setBotName: (v: string) => void
  botModel: string
  setBotModel: (v: string) => void
  botDesc: string
  setBotDesc: (v: string) => void
  botInstructions: string
  setBotInstructions: (v: string) => void
  busy: boolean
  error: string | null
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <YStack
      position="fixed"
      t={0}
      r={0}
      b={0}
      l={0}
      items="center"
      justify="center"
      px={16}
      style={{ backgroundColor: paint.backdrop, zIndex: 100001 }}
      onPress={onClose}
    >
      <YStack
        role="dialog"
        aria-label="Create Bot"
        width="100%"
        maxW={420}
        p={18}
        gap={12}
        rounded={12}
        borderWidth={1}
        style={{ backgroundColor: paint.sidebar, borderColor: paint.paneEdge }}
        onPress={(e: { stopPropagation?: () => void }) => e.stopPropagation?.()}
        data-testid="create-bot-modal"
      >
        <XStack items="center" justify="space-between">
          <SizableText fontSize={14} fontWeight="700" style={{ color: paint.ink }}>
            Create Workspace Bot
          </SizableText>
          <XStack {...press(onClose, 'Close')} width={24} height={24} items="center" justify="center" rounded={6}>
            <X size={14} color={paint.dim} />
          </XStack>
        </XStack>

        <YStack gap={4}>
          <SizableText fontSize={11.5} fontWeight="600" style={{ color: paint.mute }}>
            Handle / Name
          </SizableText>
          <Input
            height={34}
            px={10}
            rounded={7}
            borderWidth={1}
            fontSize={13}
            color={paint.ink}
            placeholder="e.g. reviewer"
            value={botName}
            onChangeText={setBotName}
            style={{ backgroundColor: paint.panel, borderColor: paint.border }}
            data-testid="create-bot-name-input"
          />
        </YStack>

        <YStack gap={4}>
          <SizableText fontSize={11.5} fontWeight="600" style={{ color: paint.mute }}>
            Model
          </SizableText>
          <Input
            height={34}
            px={10}
            rounded={7}
            borderWidth={1}
            fontSize={13}
            color={paint.ink}
            placeholder="zen6-coder"
            value={botModel}
            onChangeText={setBotModel}
            style={{ backgroundColor: paint.panel, borderColor: paint.border }}
            data-testid="create-bot-model-input"
          />
        </YStack>

        <YStack gap={4}>
          <SizableText fontSize={11.5} fontWeight="600" style={{ color: paint.mute }}>
            Description
          </SizableText>
          <Input
            height={34}
            px={10}
            rounded={7}
            borderWidth={1}
            fontSize={13}
            color={paint.ink}
            placeholder="Reviews PRs and answers engineering questions"
            value={botDesc}
            onChangeText={setBotDesc}
            style={{ backgroundColor: paint.panel, borderColor: paint.border }}
            data-testid="create-bot-desc-input"
          />
        </YStack>

        <YStack gap={4}>
          <SizableText fontSize={11.5} fontWeight="600" style={{ color: paint.mute }}>
            System Instructions
          </SizableText>
          <Textarea
            minH={72}
            p={10}
            rounded={7}
            borderWidth={1}
            fontSize={12.5}
            color={paint.ink}
            placeholder="Be concise, accurate, and cite code paths."
            value={botInstructions}
            onChangeText={setBotInstructions}
            style={{ backgroundColor: paint.panel, borderColor: paint.border }}
            data-testid="create-bot-instructions-input"
          />
        </YStack>

        {error ? (
          <SizableText fontSize={12} style={{ color: paint.alert }}>
            {error}
          </SizableText>
        ) : null}

        <XStack justify="flex-end" gap={8}>
          <XStack {...press(onClose, 'Cancel')} px={12} py={7} rounded={7} borderWidth={1} style={{ borderColor: paint.border }}>
            <SizableText fontSize={12.5} style={{ color: paint.mute }}>
              Cancel
            </SizableText>
          </XStack>
          <XStack
            {...press(onSubmit, 'Create Bot')}
            px={14}
            py={7}
            rounded={7}
            opacity={busy || !botName.trim() ? 0.5 : 1}
            style={{ backgroundColor: paint.ink }}
            data-testid="create-bot-submit"
          >
            <SizableText fontSize={12.5} fontWeight="700" style={{ color: paint.ground }}>
              {busy ? 'Creating…' : 'Create Bot'}
            </SizableText>
          </XStack>
        </XStack>
      </YStack>
    </YStack>
  )
}

export function RunBotModal({
  target,
  prompt,
  setPrompt,
  busy,
  result,
  onClose,
  onRun,
}: {
  target: RosterMember
  prompt: string
  setPrompt: (v: string) => void
  busy: boolean
  result: { status: string; output?: string; error?: string } | null
  onClose: () => void
  onRun: () => void
}) {
  return (
    <YStack
      position="fixed"
      t={0}
      r={0}
      b={0}
      l={0}
      items="center"
      justify="center"
      px={16}
      style={{ backgroundColor: paint.backdrop, zIndex: 100001 }}
      onPress={onClose}
    >
      <YStack
        role="dialog"
        aria-label={`Run @${target.handle}`}
        width="100%"
        maxW={460}
        p={18}
        gap={12}
        rounded={12}
        borderWidth={1}
        style={{ backgroundColor: paint.sidebar, borderColor: paint.paneEdge }}
        onPress={(e: { stopPropagation?: () => void }) => e.stopPropagation?.()}
        data-testid="run-bot-modal"
      >
        <XStack items="center" justify="space-between">
          <SizableText fontSize={14} fontWeight="700" style={{ color: paint.ink }}>
            {`Run @${target.handle}`}
          </SizableText>
          <XStack {...press(onClose, 'Close')} width={24} height={24} items="center" justify="center" rounded={6}>
            <X size={14} color={paint.dim} />
          </XStack>
        </XStack>

        <Textarea
          minH={76}
          p={10}
          rounded={7}
          borderWidth={1}
          fontSize={13}
          color={paint.ink}
          placeholder={`Ask @${target.handle} to execute a task…`}
          value={prompt}
          onChangeText={setPrompt}
          style={{ backgroundColor: paint.panel, borderColor: paint.border }}
          data-testid="run-bot-prompt-input"
        />

        {result ? (
          <YStack p={10} rounded={8} borderWidth={1} gap={4} style={{ backgroundColor: paint.card, borderColor: paint.border }} data-testid="run-bot-result">
            <SizableText fontSize={11} fontWeight="700" style={{ color: result.error ? paint.alert : paint.speaking }}>
              {result.error ? 'Run Error' : `Status: ${result.status || 'ok'}`}
            </SizableText>
            <SizableText fontSize={12.5} lineHeight={18} style={{ color: paint.fg }}>
              {result.error || result.output || '(Empty response)'}
            </SizableText>
          </YStack>
        ) : null}

        <XStack justify="flex-end" gap={8}>
          <XStack {...press(onClose, 'Close')} px={12} py={7} rounded={7} borderWidth={1} style={{ borderColor: paint.border }}>
            <SizableText fontSize={12.5} style={{ color: paint.mute }}>
              Close
            </SizableText>
          </XStack>
          <XStack
            {...press(onRun, 'Execute')}
            px={14}
            py={7}
            rounded={7}
            items="center"
            gap={5}
            opacity={busy || !prompt.trim() ? 0.5 : 1}
            style={{ backgroundColor: paint.ink }}
            data-testid="run-bot-submit"
          >
            <Play size={11} color={paint.ground} />
            <SizableText fontSize={12.5} fontWeight="700" style={{ color: paint.ground }}>
              {busy ? 'Running…' : 'Run Agent'}
            </SizableText>
          </XStack>
        </XStack>
      </YStack>
    </YStack>
  )
}
