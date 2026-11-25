'use client'

/**
 * Top 38px `#000000` Frameless Desktop Bar + Centered `#141417` Omnibox (`Ctrl+K`)
 *
 * Left:   [F-menu], [PanelLeft], [<], [>]
 * Center: Sleek `#141417` `Search or ask anything` omnibox (channels, threads, issues, spaces, memory, or @vi)
 * Right:  `— □ ×` native Tauri window controls
 */
import { DESKTOP_INSET, isDesktopApp, isMacDesktop } from '~/data/desktop.ts'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Input, Popover, Separator, Text, XStack, YStack } from '@hanzo/gui'
import {
  ArrowRight,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Hash,
  PanelLeft,
  Search,
  Settings,
  Smartphone,
  Sparkles,
  SquareCheck,
  X,
} from '@hanzogui/lucide-icons-2'
import { OrgMark, ThemeToggle } from '@hanzo/ui/product'
import { paint, ring } from '~/theme/theme.ts'
import {
  sendWorkspaceMessage,
  setPhoneModalOpen,
  useWorkspace,
} from '~/workspace/store.ts'
import { DesktopAppMenu, DesktopWindowControls, dragDesktopWindow, toggleDesktopMaximize } from './DesktopWindowChrome.tsx'
import { STEP } from './measure.ts'
import { press } from './press.ts'
import { matchTeamShortcut } from './unified.ts'

export type BusinessHeaderAccount = {
  sub: string
  owner: string
  name: string
  email?: string
  avatar?: string
}

export type BusinessHeaderOrg = {
  name: string
  displayName?: string
  logo?: string
}

export type BusinessHeaderProps = {
  currentOrg?: BusinessHeaderOrg
  navSpan?: number
  navOpen?: boolean
  onToggleNav?: () => void
  surfaceTitle?: string
  leftSlot?: ReactNode
  children?: ReactNode
  rightSlot?: ReactNode
  onNavigate?: (path: string) => void
}

const OMNIBOX_WORKSPACES = [
  { id: 'ws-home', kind: 'surface' as const, label: 'Home — Executive Briefing', desc: '12 completed · 6 in progress · 4 need attention', path: '/home' },
  { id: 'ws-inbox', kind: 'surface' as const, label: 'Inbox — Mentions & Agent Approvals', desc: 'Unified approvals, thread replies & PR gates', path: '/inbox' },
  { id: 'ws-threads', kind: 'surface' as const, label: 'Threads — Followed Discussions', desc: 'Active engineering & incident threads', path: '/threads' },
  { id: 'ws-office', kind: 'surface' as const, label: 'Office — Virtual HQ & Skyscraper Elevator', desc: 'F4 Exec · F3 Eng · F2 Research · F1 GTM', path: '/office' },
  { id: 'ws-work', kind: 'surface' as const, label: 'Work — Issues, Kanban & YAML Objectives', desc: 'TEAM-101..TEAM-106 & executable tasks', path: '/issues' },
  { id: 'ws-spaces', kind: 'surface' as const, label: 'Spaces — Interactive Deliverables', desc: 'Versioned specs, benchmarks & release checklists', path: '/spaces' },
  { id: 'ws-memory', kind: 'surface' as const, label: 'Memory — Organizational Knowledge Graph', desc: 'ADRs, runbooks & shared cross-agent context', path: '/memory' },
]

export function BusinessHeader({
  navOpen = false,
  onToggleNav,
  leftSlot,
  rightSlot,
  onNavigate,
}: BusinessHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [viAnswer, setViAnswer] = useState<string | null>(null)
  const { channels, roster, spaces, memory, phoneModalOpen } = useWorkspace()
  const isDesktop = isDesktopApp()
  const isMac = isMacDesktop()
  const inset = isDesktop && isMac ? DESKTOP_INSET : 0

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (searchOpen || phoneModalOpen)) {
        e.preventDefault()
        setSearchOpen(false)
        setPhoneModalOpen(false)
        return
      }
      const action = matchTeamShortcut({
        key: e.key,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        repeat: e.repeat,
        defaultPrevented: e.defaultPrevented,
        isComposing: e.isComposing,
      })
      if (action === 'command-palette') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
    }
    const onOpenPalette = () => setSearchOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('hanzo:team-open-command-palette', onOpenPalette)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('hanzo:team-open-command-palette', onOpenPalette)
    }
  }, [searchOpen, phoneModalOpen])

  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    const chItems = channels
      .filter((c) => c.kind === 'channel')
      .map((c) => ({
        id: `ch-${c.id}`,
        kind: 'channel' as const,
        label: `# ${c.name}`,
        desc: c.topic,
        path: `/chat/${c.id}`,
      }))
    const botItems = roster
      .filter((m) => m.bot)
      .map((m) => ({
        id: `bot-${m.id}`,
        kind: 'bot' as const,
        label: `@${m.handle} (${m.name})`,
        desc: m.activity,
        path: `/chat/dm-${m.handle}`,
      }))
    const docItems = [
      ...spaces.map((s) => ({
        id: `sp-${s.id}`,
        kind: 'doc' as const,
        label: s.title,
        desc: `Space · ${s.version}`,
        path: `/spaces/${s.id}`,
      })),
      ...memory.map((m) => ({
        id: `mem-${m.id}`,
        kind: 'doc' as const,
        label: m.title,
        desc: `Memory · ${m.category}`,
        path: '/memory',
      })),
    ]
    const all = [...OMNIBOX_WORKSPACES, ...chItems, ...botItems, ...docItems]
    if (!q) return all.slice(0, 12)
    return all
      .filter((item) => item.label.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q))
      .slice(0, 12)
  }, [query, channels, roster, spaces, memory])

  const jumpTo = (path: string) => {
    setSearchOpen(false)
    setQuery('')
    setViAnswer(null)
    if (onNavigate) onNavigate(path)
    else if (typeof window !== 'undefined') window.location.assign(path)
  }

  const askViNow = () => {
    const clean = query.trim()
    if (!clean) return
    sendWorkspaceMessage('dm-vi', clean)
    setViAnswer(
      `@vi: Processed "${clean}" — 12 tasks completed today, v1.1.0 RC is green in #engineering, and 3 Zen 6 router evals are ready in Spaces.`,
    )
  }

  return (
    <XStack
      render="header"
      height={38}
      px={8}
      items="center"
      justify="space-between"
      shrink={0}
      borderBottomWidth={1}
      data-slot="title-bar"
      data-tauri-drag-region={isDesktop ? '' : undefined}
      onMouseDown={isDesktop ? dragDesktopWindow : undefined}
      onDoubleClick={isDesktop ? toggleDesktopMaximize : undefined}
      style={{
        backgroundColor: paint.ground,
        borderBottomColor: paint.barRule,
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      }}
      data-testid="hanzo-business-header"
    >
      {/* LEFT: [F-menu], [PanelLeft], [<], [>] */}
      <XStack
        items="center"
        gap={3}
        pl={inset}
        minW={148}
        shrink={0}
        data-tauri-drag-region={isDesktop ? '' : undefined}
      >
        <DesktopAppMenu onNavigate={jumpTo} />
        {leftSlot}
        {onToggleNav ? (
          <XStack
            {...press(onToggleNav, navOpen ? 'Collapse sidebar (Ctrl+B)' : 'Expand sidebar (Ctrl+B)')}
            width={26}
            height={26}
            rounded={6}
            items="center"
            justify="center"
            hoverStyle={{ background: paint.hover }}
            data-testid="toggle-team-sidebar"
            data-tauri-drag-region="false"
          >
            <PanelLeft size={14} color={paint.mute} />
          </XStack>
        ) : null}
        <XStack
          {...press(() => {
            if (typeof window !== 'undefined') window.history.back()
          }, 'Go back')}
          width={24}
          height={24}
          rounded={6}
          items="center"
          justify="center"
          hoverStyle={{ background: paint.hover }}
          data-tauri-drag-region="false"
        >
          <ChevronLeft size={14} color={paint.dim} />
        </XStack>
        <XStack
          {...press(() => {
            if (typeof window !== 'undefined') window.history.forward()
          }, 'Go forward')}
          width={24}
          height={24}
          rounded={6}
          items="center"
          justify="center"
          hoverStyle={{ background: paint.hover }}
          data-tauri-drag-region="false"
        >
          <ChevronRight size={14} color={paint.dim} />
        </XStack>
      </XStack>

      {/* CENTER: Sleek omnibox (`Search or ask anything` · Ctrl+K) */}
      <XStack
        flex={1}
        items="center"
        justify="center"
        px={12}
        minW={0}
        data-tauri-drag-region={isDesktop ? '' : undefined}
      >
        <XStack
          {...press(() => setSearchOpen(true), 'Search or ask anything (Ctrl+K)')}
          width="100%"
          maxW={420}
          height={26}
          px={10}
          rounded={7}
          borderWidth={1}
          items="center"
          justify="center"
          gap={7}
          style={{
            backgroundColor: paint.omnibox,
            borderColor: paint.omniboxEdge,
          }}
          hoverStyle={{ borderColor: paint.border }}
          focusVisibleStyle={ring}
          data-testid="top-omnibox-trigger"
          data-tauri-drag-region="false"
        >
          <Search size={12} color={paint.dim} />
          <Text fontSize={12} color={paint.mute} numberOfLines={1}>
            Search or ask anything
          </Text>
          <Text fontSize={10.5} color={paint.dim} style={{ marginLeft: 4 }}>
            Ctrl+K
          </Text>
        </XStack>
      </XStack>

      {/* RIGHT: Window controls */}
      <XStack
        items="center"
        justify="flex-end"
        gap={6}
        minW={148}
        shrink={0}
        data-tauri-drag-region={isDesktop ? '' : undefined}
      >
        {rightSlot}
        <DesktopWindowControls />
      </XStack>

      {/* OMNIBOX MODAL */}
      {searchOpen ? (
        <YStack
          position="fixed"
          t={0}
          r={0}
          b={0}
          l={0}
          items="center"
          pt={64}
          px={16}
          style={{ backgroundColor: paint.backdrop, zIndex: 100000 }}
          onPress={() => setSearchOpen(false)}
          data-testid="team-command-palette-backdrop"
        >
          <YStack
            role="dialog"
            aria-label="Search or ask anything"
            width="100%"
            maxW={520}
            p={10}
            gap={8}
            rounded={12}
            borderWidth={1}
            style={{ backgroundColor: paint.sidebar, borderColor: paint.paneEdge }}
            onPress={(e: { stopPropagation?: () => void }) => e.stopPropagation?.()}
            data-testid="team-command-palette"
          >
            <XStack
              height={36}
              px={10}
              items="center"
              gap={8}
              rounded={8}
              borderWidth={1}
              style={{ backgroundColor: paint.omnibox, borderColor: paint.omniboxEdge }}
            >
              <Search size={14} color={paint.mute} />
              <Input
                flex={1}
                height={32}
                fontSize={13}
                borderWidth={0}
                bg="transparent"
                color={paint.ink}
                placeholder="Search channels, threads, issues, spaces, memory, or ask @vi…"
                value={query}
                onChangeText={(v: string) => {
                  setQuery(v)
                  setViAnswer(null)
                }}
                onKeyDown={(e: { key?: string; preventDefault?: () => void }) => {
                  if (e.key === 'Enter' && query.trim()) {
                    e.preventDefault?.()
                    if (filteredResults.length > 0 && !query.trim().startsWith('@vi') && !query.trim().endsWith('?')) {
                      jumpTo(filteredResults[0]!.path)
                    } else {
                      askViNow()
                    }
                  }
                }}
                autoFocus
              />
              <Text fontSize={10} fontWeight="600" color={paint.dim}>
                ESC
              </Text>
            </XStack>

            {query.trim() ? (
              <XStack
                {...press(askViNow, `Ask @vi: ${query}`)}
                px={10}
                py={7}
                rounded={8}
                borderWidth={1}
                items="center"
                justify="space-between"
                gap={8}
                style={{ backgroundColor: paint.card, borderColor: paint.border }}
                hoverStyle={{ background: paint.hover }}
              >
                <XStack items="center" gap={8} flex={1} minW={0}>
                  <Sparkles size={14} color={paint.ink} />
                  <Text fontSize={12.5} fontWeight="600" color={paint.ink} numberOfLines={1}>
                    {`Ask @vi: "${query.trim()}"`}
                  </Text>
                </XStack>
                <ArrowRight size={13} color={paint.mute} />
              </XStack>
            ) : null}

            {viAnswer ? (
              <YStack
                p={10}
                rounded={8}
                borderWidth={1}
                gap={6}
                style={{ backgroundColor: paint.panel, borderColor: paint.border }}
              >
                <Text fontSize={12.5} color={paint.ink}>
                  {viAnswer}
                </Text>
                <XStack {...press(() => jumpTo('/chat/dm-vi'), 'Open @vi DM')} items="center" gap={4}>
                  <Text fontSize={11.5} fontWeight="600" color={paint.mute}>
                    Continue in @vi DM →
                  </Text>
                </XStack>
              </YStack>
            ) : null}

            <YStack gap={2} maxH={320} style={{ overflowY: 'auto' }}>
              {filteredResults.map((item) => (
                <XStack
                  key={item.id}
                  {...press(() => jumpTo(item.path), item.label)}
                  items="center"
                  gap={10}
                  px={10}
                  py={6}
                  rounded={8}
                  hoverStyle={{ background: paint.hover }}
                >
                  <YStack
                    width={24}
                    height={24}
                    rounded={6}
                    style={{ backgroundColor: paint.panel }}
                    items="center"
                    justify="center"
                    shrink={0}
                  >
                    {item.kind === 'bot' ? (
                      <Bot size={13} color={paint.mute} />
                    ) : item.kind === 'channel' ? (
                      <Hash size={13} color={paint.mute} />
                    ) : item.kind === 'doc' ? (
                      <FileText size={13} color={paint.mute} />
                    ) : (
                      <SquareCheck size={13} color={paint.mute} />
                    )}
                  </YStack>
                  <YStack flex={1} minW={0}>
                    <Text fontSize={12.5} fontWeight="600" color={paint.ink} numberOfLines={1}>
                      {item.label}
                    </Text>
                    <Text fontSize={11} color={paint.dim} numberOfLines={1}>
                      {item.desc}
                    </Text>
                  </YStack>
                </XStack>
              ))}
            </YStack>
          </YStack>
        </YStack>
      ) : null}

      {/* GET HANZO ON YOUR PHONE MODAL */}
      {phoneModalOpen ? (
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
          onPress={() => setPhoneModalOpen(false)}
        >
          <YStack
            role="dialog"
            aria-label="Get Hanzo on your phone"
            width="100%"
            maxW={360}
            p={18}
            gap={12}
            rounded={14}
            borderWidth={1}
            style={{ backgroundColor: paint.sidebar, borderColor: paint.paneEdge }}
            onPress={(e: { stopPropagation?: () => void }) => e.stopPropagation?.()}
          >
            <XStack items="center" justify="space-between">
              <XStack items="center" gap={8}>
                <Smartphone size={16} color={paint.ink} />
                <Text fontSize={14} fontWeight="600" color={paint.ink}>
                  Get Hanzo Team on your phone
                </Text>
              </XStack>
              <XStack {...press(() => setPhoneModalOpen(false), 'Close')} width={24} height={24} items="center" justify="center" rounded={6}>
                <X size={14} color={paint.dim} />
              </XStack>
            </XStack>
            <Text fontSize={12.5} color={paint.mute}>
              Approve agent deployments, hop into voice huddles, and review briefings from iOS or Android (`hanzo.team/mobile`).
            </Text>
            <XStack gap={8}>
              <XStack
                flex={1}
                py={8}
                rounded={8}
                borderWidth={1}
                items="center"
                justify="center"
                style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
              >
                <Text fontSize={12} fontWeight="600" color={paint.ink}>
                  iOS App Store
                </Text>
              </XStack>
              <XStack
                flex={1}
                py={8}
                rounded={8}
                borderWidth={1}
                items="center"
                justify="center"
                style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
              >
                <Text fontSize={12} fontWeight="600" color={paint.ink}>
                  Android APK
                </Text>
              </XStack>
            </XStack>
          </YStack>
        </YStack>
      ) : null}
    </XStack>
  )
}

export type RailAccountMenuProps = {
  user?: {
    sub?: string
    name?: string
    email?: string
    avatar?: string
    owner?: string
  } | null
  currentOrg?: BusinessHeaderOrg
  orgs?: readonly BusinessHeaderOrg[]
  onSelectOrg?: (orgName: string) => void
  onCreateOrg?: () => void
  onConnectOrg?: () => void
  accounts?: readonly BusinessHeaderAccount[]
  onSwitchAccount?: (account: BusinessHeaderAccount) => void
  onAddAccount?: () => void
  onSettings?: () => void
  onSignOut?: () => void
}

export function RailAccountMenu({
  user,
  currentOrg,
  orgs = [],
  onSelectOrg,
  onSettings,
}: RailAccountMenuProps) {
  const [open, setOpen] = useState(false)
  const userName = user?.name?.trim() || 'Zach Kelling'

  return (
    <Popover open={open} onOpenChange={setOpen} placement="right-end" allowFlip stayInFrame>
      <Popover.Trigger asChild>
        <YStack
          {...press(() => setOpen(!open), `${userName} account`)}
          width={STEP}
          height={STEP}
          rounded={10}
          items="center"
          justify="center"
          hoverStyle={{ background: paint.hover }}
        >
          <OrgMark org={{ name: userName, logo: user?.avatar }} size={24} />
        </YStack>
      </Popover.Trigger>
      <Popover.Content
        role="menu"
        borderWidth={1}
        p={10}
        width={240}
        rounded={10}
        style={{ backgroundColor: paint.sidebar, borderColor: paint.paneEdge, zIndex: 100000 }}
      >
        <YStack gap={6}>
          <Text fontSize={13} fontWeight="600" color={paint.ink}>{userName}</Text>
          <Separator borderColor={paint.rule} />
          {orgs.map((o) => {
            const active = o.name === currentOrg?.name
            return (
              <XStack
                key={o.name}
                {...press(() => {
                  setOpen(false)
                  onSelectOrg?.(o.name)
                }, o.displayName || o.name)}
                px={8}
                py={5}
                rounded={6}
                items="center"
                justify="space-between"
              >
                <Text fontSize={12.5} color={paint.ink}>{o.displayName || o.name}</Text>
                {active ? <Check size={13} color={paint.ink} /> : null}
              </XStack>
            )
          })}
          <XStack items="center" justify="space-between" px={8} py={4}>
            <Text fontSize={12} color={paint.mute}>Theme</Text>
            <ThemeToggle />
          </XStack>
          {onSettings ? (
            <XStack {...press(() => { setOpen(false); onSettings() }, 'Settings')} px={8} py={5} gap={6} items="center">
              <Settings size={13} color={paint.mute} />
              <Text fontSize={12.5} color={paint.ink}>Settings</Text>
            </XStack>
          ) : null}
        </YStack>
      </Popover.Content>
    </Popover>
  )
}
