/**
 * THE AGENT INSPECTOR PANE — Details, Library, and the agent's live 24/7
 * sandbox Computer screen (`<Name>'s screen`).
 *
 * When the reader is in an agent conversation (`/chat/dm-<id>`), the right
 * aside shows the agent's portrait, name, `Details | Library | Computer` tabs,
 * and the live or sleeping sandbox screen. In a channel room, it falls back to
 * the workspace Inbox.
 */
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { Clock, Code, FileText, Globe, Play, Moon, Sparkles, Terminal, X, Zap } from '@hanzogui/lucide-icons-2'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { HANZO_AGENTS, type AgentPreset } from '~/data/agents.ts'
import { Inbox } from '~/inbox'
import { press } from '~/shell'
import { hideAside } from '~/shell/aside.ts'
import { PAD } from '~/shell/measure.ts'
import { paint, ring, round, rung } from '~/theme/theme'

type InspectorTab = 'details' | 'library' | 'computer'
type ScreenState = 'asleep' | 'waking' | 'live'

const INITIAL_SCREEN_STATE: Record<string, ScreenState> = {
  dev: 'live',
  cyber: 'live',
  sci: 'live',
  data: 'live',
  mark: 'waking',
  rev: 'asleep',
}

export function AgentPane() {
  const { id } = useParams()
  const agent = id?.startsWith('dm-')
    ? HANZO_AGENTS.find((a) => `dm-${a.id}` === id)
    : undefined

  if (!agent) {
    return <Inbox />
  }

  return <AgentInspector key={agent.id} agent={agent} />
}

function AgentInspector({ agent }: { agent: AgentPreset }) {
  const [tab, setTab] = useState<InspectorTab>('computer')
  const [screenState, setScreenState] = useState<ScreenState>(
    INITIAL_SCREEN_STATE[agent.id] ?? 'asleep',
  )

  useEffect(() => {
    setScreenState(INITIAL_SCREEN_STATE[agent.id] ?? 'asleep')
  }, [agent.id])

  const cycleScreen = () => {
    setScreenState((prev) =>
      prev === 'asleep' ? 'waking' : prev === 'waking' ? 'live' : 'asleep',
    )
  }

  return (
    <YStack data-parity-key="agent.panel" flex={1} minH={0} px={PAD} pt={14} pb={PAD} gap={14}>
      {/* Top close action */}
      <XStack items="center" justify="flex-end">
        <XStack
          {...press(hideAside, 'Close inspector')}
          width={24}
          height={24}
          items="center"
          justify="center"
          rounded={round.field}
          hoverStyle={{ background: paint.card }}
          focusVisibleStyle={ring}
        >
          <X size={14} color={paint.dim} />
        </XStack>
      </XStack>

      {/* Centered Agent Avatar & Name */}
      <YStack items="center" gap={8} mt={-10}>
        <YStack
          width={52}
          height={52}
          rounded={round.pill}
          overflow="hidden"
          bg="$background"
          borderWidth={1}
          borderColor="$edge"
          items="center"
          justify="center"
        >
          <img
            src={agent.avatar}
            alt={agent.name}
            width={52}
            height={52}
            style={{ width: 52, height: 52, objectFit: 'cover', display: 'block' }}
          />
        </YStack>
        <SizableText fontSize={rung.body} fontWeight="600" color="$ink">
          {agent.name}
        </SizableText>
      </YStack>

      {/* Centered Details | Library | Computer Tabs */}
      <XStack items="center" justify="center" gap={4}>
        {(
          [
            ['details', 'Details'],
            ['library', 'Library'],
            ['computer', 'Computer'],
          ] as const
        ).map(([key, label]) => {
          const active = tab === key
          return (
            <XStack
              key={key}
              {...press(() => setTab(key), label)}
              px={10}
              py={4}
              rounded={round.field}
              bg={active ? '$hover' : 'transparent'}
              hoverStyle={{ background: '$hover' }}
              focusVisibleStyle={ring}
            >
              <SizableText
                fontSize={rung.small}
                fontWeight={active ? '600' : '500'}
                color={active ? '$ink' : '$dim'}
              >
                {label}
              </SizableText>
            </XStack>
          )
        })}
      </XStack>

      {/* Tab Content */}
      {tab === 'computer' ? (
        <YStack gap={8} pt={4}>
          {/* 16:10 Sandbox Monitor */}
          <YStack
            {...press(cycleScreen, `${agent.name}'s sandbox computer`)}
            height={196}
            rounded={round.card}
            borderWidth={1}
            borderColor="$edge"
            bg="$background"
            overflow="hidden"
            position="relative"
            items="center"
            justify="center"
          >
            {screenState === 'live' ? (
              <LiveDesktopScreen agent={agent} />
            ) : (
              <SleepingDesktopScreen state={screenState} />
            )}
          </YStack>

          <SizableText
            fontSize={rung.chip}
            color="$dim"
            style={{ textAlign: 'center' }}
          >
            {`${agent.name}'s screen`}
          </SizableText>

          {/* Subtle status & wake control */}
          <XStack
            mt={8}
            px={12}
            py={10}
            rounded={round.card}
            borderWidth={1}
            borderColor="$edge"
            bg="$raised"
            items="center"
            justify="space-between"
          >
            <XStack items="center" gap={8} flex={1} minW={0}>
              {screenState === 'live' ? (
                <Zap size={13} color="$ink" />
              ) : screenState === 'waking' ? (
                <Sparkles size={13} color="$quiet" />
              ) : (
                <Moon size={13} color="$dim" />
              )}
              <YStack flex={1} minW={0}>
                <SizableText fontSize={rung.small} fontWeight="500" color="$ink" numberOfLines={1}>
                  {screenState === 'live'
                    ? 'Sandbox active'
                    : screenState === 'waking'
                      ? 'Waking sandbox...'
                      : 'Sandbox sleeping'}
                </SizableText>
                <SizableText fontSize={rung.chip} color="$dim" numberOfLines={1}>
                  {`Cron ${agent.schedule} · ${agent.triggers.join(', ')}`}
                </SizableText>
              </YStack>
            </XStack>

            <XStack
              {...press(cycleScreen, 'Toggle computer power state')}
              px={8}
              py={4}
              rounded={round.field}
              borderWidth={1}
              borderColor="$edge"
              bg="$panel"
              hoverStyle={{ background: '$hover' }}
            >
              <SizableText fontSize={rung.chip} fontWeight="500" color="$quiet">
                {screenState === 'asleep' ? 'Wake' : screenState === 'waking' ? 'Open' : 'Sleep'}
              </SizableText>
            </XStack>
          </XStack>
        </YStack>
      ) : null}

      {tab === 'details' ? (
        <YStack gap={10} pt={4}>
          <DetailCard label="Role & Department" value={`${agent.role} · ${agent.department}`} />
          <DetailCard label="24/7 Autonomous Schedule" value={`Cron: ${agent.schedule} (Proactive)`} />
          <DetailCard label="Event Triggers" value={agent.triggers.join(' · ')} />
          <DetailCard label="Latest Status" value={agent.status} />
        </YStack>
      ) : null}

      {tab === 'library' ? (
        <YStack gap={8} pt={4}>
          <LibraryItem
            title={`${agent.name} — Daily Run Summary`}
            meta={`Updated today · #hanzo-${agent.department.toLowerCase()}`}
          />
          <LibraryItem
            title={`${agent.role} Playbook & MCP Tools`}
            meta="hanzo-mcp · 13 unified tools enabled"
          />
          <LibraryItem
            title="Sandbox Workspace Snapshot"
            meta={`hanzo-sandbox/${agent.id} · clean`}
          />
        </YStack>
      ) : null}
    </YStack>
  )
}

function SleepingDesktopScreen({ state }: { state: 'asleep' | 'waking' }) {
  return (
    <YStack items="center" justify="center" gap={8}>
      <YStack items="center" position="relative">
        {state === 'asleep' ? (
          <SizableText
            fontSize={9}
            fontWeight="700"
            color="$dim"
            style={{ position: 'absolute', top: -10, right: -8, letterSpacing: 1 }}
          >
            zZ
          </SizableText>
        ) : null}
        {/* Rounded pill bot visor matching the Hanzo Bot sleep icon */}
        <XStack
          width={28}
          height={18}
          rounded={9}
          bg="$soft"
          opacity={0.65}
          items="center"
          justify="center"
          gap={5}
        >
          <YStack width={4} height={4} rounded={2} bg="$background" />
          <YStack width={4} height={4} rounded={2} bg="$background" />
        </XStack>
      </YStack>
      <SizableText fontSize={rung.small} fontWeight="500" color="$quiet">
        {state === 'waking' ? 'Waking up...' : 'Computer is asleep'}
      </SizableText>
    </YStack>
  )
}

function LiveDesktopScreen({ agent }: { agent: AgentPreset }) {
  return (
    <YStack
      flex={1}
      width="100%"
      height="100%"
      justify="space-between"
      bg="$background"
    >
      {/* Subtle active window preview */}
      <YStack p={10} gap={6}>
        <XStack items="center" gap={5} opacity={0.8}>
          <YStack width={6} height={6} rounded={3} bg="$soft" />
          <SizableText fontSize={10} color="$quiet" numberOfLines={1}>
            {`hanzo-mcp — ${agent.id}@sandbox:~`}
          </SizableText>
        </XStack>
        <YStack
          p={8}
          gap={3}
          rounded={round.field}
          bg="$panel"
          borderWidth={1}
          borderColor="$edge"
        >
          <SizableText fontSize={9} color="$quiet" numberOfLines={1}>
            {`$ hanzo agent run --seat ${agent.id} --watch`}
          </SizableText>
          <SizableText fontSize={9} color="$dim" numberOfLines={1}>
            {`✓ 13 MCP tools connected · ${agent.schedule}`}
          </SizableText>
        </YStack>
      </YStack>

      {/* Bottom dock & status bar matching Dev's screen */}
      <XStack
        width="100%"
        px={8}
        py={4}
        items="center"
        justify="space-between"
        bg="$panel"
        borderTopWidth={1}
        borderColor="$edge"
      >
        <YStack width={32} />
        <XStack
          px={8}
          py={3}
          gap={8}
          rounded={round.pill}
          bg="$hover"
          items="center"
        >
          <Terminal size={10} color="$ink" />
          <Code size={10} color="$quiet" />
          <Globe size={10} color="$quiet" />
          <Play size={10} color="$quiet" />
        </XStack>
        <SizableText fontSize={9} color="$dim">
          24/7
        </SizableText>
      </XStack>
    </YStack>
  )
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <YStack
      p={10}
      gap={3}
      rounded={round.field}
      borderWidth={1}
      borderColor="$edge"
      bg="$raised"
    >
      <XStack items="center" gap={6}>
        <Clock size={12} color="$dim" />
        <SizableText fontSize={rung.chip} color="$dim">
          {label}
        </SizableText>
      </XStack>
      <SizableText fontSize={rung.small} color="$ink">
        {value}
      </SizableText>
    </YStack>
  )
}

function LibraryItem({ title, meta }: { title: string; meta: string }) {
  return (
    <XStack
      p={10}
      gap={8}
      rounded={round.field}
      borderWidth={1}
      borderColor="$edge"
      bg="$raised"
      items="center"
    >
      <FileText size={14} color="$quiet" />
      <YStack flex={1} minW={0}>
        <SizableText fontSize={rung.small} fontWeight="500" color="$ink" numberOfLines={1}>
          {title}
        </SizableText>
        <SizableText fontSize={rung.chip} color="$dim" numberOfLines={1}>
          {meta}
        </SizableText>
      </YStack>
    </XStack>
  )
}
