'use client'

/**
 * BusinessHeader — compact Slack-style top navigation bar (36px) + RailAccountMenu
 * for the bottom-left rail (matching Slack, Hanzo Desktop, and Hanzo Bot).
 *
 * Organization switching lives on the vertical left Rail (`Rail.tsx`), and the
 * user account + preferences live at the bottom-left corner of the Rail.
 * There is NO top-bar app switcher (`H ▾`) and NO duplicate top-bar org/user menu.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Input, Popover, Separator, Text, XStack, YStack } from '@hanzo/gui'
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  Hash,
  LogOut,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Share2,
  SquareCheck,
  UserPlus,
} from '@hanzogui/lucide-icons-2'
import { OrgMark, ThemeToggle } from '@hanzo/ui/product'
import { botPath, botsOf } from '~/chat/bots.ts'
import { usePeople, useRooms } from '~/chat/read.ts'
import { paint, round, state } from '~/theme/theme.ts'
import { RAIL } from './measure.ts'

function displayName(name?: string, email?: string): string {
  if (name?.trim()) return name.trim()
  const local = email?.split('@')[0]
  return local?.trim() || ''
}

function avatarInitials(name?: string, email?: string): string {
  const clean = displayName(name, email).replace(/,/g, ' ').trim()
  if (!clean) return 'HZ'
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
  }
  return clean.slice(0, 2).toUpperCase()
}

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

/** What the omnibar can open besides rooms and bots: surfaces that have real data. */
const JUMP_SURFACES = [
  { id: 'chat', label: 'Chat — Channels & threads', desc: 'Workspace channels, threads & teammates', path: '/chat' },
  { id: 'issues', label: 'Tracker — All issues', desc: 'Kanban board, list & project issues', path: '/issues' },
  { id: 'projects', label: 'Projects', desc: 'Every project in this space', path: '/projects' },
  { id: 'crm', label: 'CRM', desc: 'Investors, contacts & pipeline', path: '/crm/investors' },
]

export function BusinessHeader({
  currentOrg,
  navSpan,
  navOpen = false,
  onToggleNav,
  surfaceTitle,
  leftSlot,
  children,
  rightSlot,
  onNavigate,
}: BusinessHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [barW, setBarW] = useState(() => (typeof window === 'undefined' ? 1200 : window.innerWidth))
  const compact = barW < 680

  const orgDisplay = currentOrg?.displayName?.trim() || currentOrg?.name || 'Hanzo AI'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const roster = usePeople().data ?? []
  const rooms = useRooms().data ?? []
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    const botItems = botsOf(roster).map((p) => ({
      id: `bot-${p.id}`,
      kind: 'bot' as const,
      label: p.name,
      desc: 'Agent',
      path: botPath(p),
    }))
    const channelItems = rooms
      .filter((r) => r.kind === 'channel')
      .map((r) => ({ id: r.id, kind: 'channel' as const, label: `#${r.name}`, desc: r.topic ?? '', path: `/chat/${r.id}` }))
    const surfaceItems = JUMP_SURFACES.map((s) => ({ ...s, kind: 'surface' as const }))
    const all = [...surfaceItems, ...channelItems, ...botItems]
    if (!q) return all.slice(0, 12)
    return all
      .filter((item) => item.label.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q))
      .slice(0, 14)
  }, [query, roster, rooms])

  const jumpTo = (path: string) => {
    setSearchOpen(false)
    setQuery('')
    if (onNavigate) {
      onNavigate(path)
    } else if (typeof window !== 'undefined') {
      window.location.assign(path)
    }
  }

  return (
    <XStack
      render="header"
      height={36}
      items="center"
      borderBottomWidth={1}
      shrink={0}
      style={{ backgroundColor: paint.bar, borderBottomColor: paint.barRule }}
      onLayout={(e: { nativeEvent: { layout: { width: number } } }) => setBarW(e.nativeEvent.layout.width)}
      data-testid="hanzo-business-header"
    >
      {/* LEFT FRAME SEGMENT: Sidebar toggle centered over the 48px rail, then ← → */}
      <XStack
        height="100%"
        width={navOpen && navSpan ? RAIL + navSpan : undefined}
        minW={navOpen && navSpan ? RAIL + navSpan : undefined}
        pl={11}
        pr={8}
        gap={2}
        items="center"
        borderRightWidth={navOpen && navSpan ? 1 : 0}
        shrink={0}
        style={{ borderRightColor: paint.barRule }}
      >
        {leftSlot}
        {onToggleNav ? (
          <XStack
            role="button"
            tabIndex={0}
            cursor="pointer"
            width={26}
            height={26}
            rounded={6}
            items="center"
            justify="center"
            hoverStyle={{ bg: '$color3' }}
            aria-label={navOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            data-testid="toggle-team-sidebar"
            onPress={onToggleNav}
          >
            <PanelLeft size={15} color="$color10" />
          </XStack>
        ) : null}
        {!compact ? (
          <>
            <XStack
              role="button"
              tabIndex={0}
              cursor="pointer"
              width={26}
              height={26}
              rounded={6}
              items="center"
              justify="center"
              hoverStyle={{ bg: '$color3' }}
              aria-label="Go back"
              onPress={() => {
                if (typeof window !== 'undefined') window.history.back()
              }}
            >
              <ArrowLeft size={14} color="$color10" />
            </XStack>
            <XStack
              role="button"
              tabIndex={0}
              cursor="pointer"
              width={26}
              height={26}
              rounded={6}
              items="center"
              justify="center"
              hoverStyle={{ bg: '$color3' }}
              aria-label="Go forward"
              onPress={() => {
                if (typeof window !== 'undefined') window.history.forward()
              }}
            >
              <ArrowRight size={14} color="$color10" />
            </XStack>
          </>
        ) : null}
      </XStack>

      {/* RIGHT CANVAS HEADER SEGMENT: Workspace / Surface context on left, Search ⌘K on right */}
      <XStack flex={1} height="100%" pl={12} pr={12} gap="$2" items="center" justify="space-between" minW={0}>
        <XStack items="center" gap={6} minW={0} shrink={1}>
          <Text fontSize={12.5} fontWeight="600" color="$color11" numberOfLines={1}>
            {orgDisplay}
          </Text>
          {surfaceTitle && !compact ? (
            <>
              <Text fontSize={12} color="$color9">
                /
              </Text>
              <Text fontSize={12.5} fontWeight="500" color="$color10" numberOfLines={1}>
                {surfaceTitle}
              </Text>
            </>
          ) : null}
        </XStack>

        <XStack items="center" justify="flex-end" gap="$1.5" minW={0} shrink={0}>
          {children ?? (
            <Popover open={searchOpen} onOpenChange={setSearchOpen} placement="bottom-end" allowFlip stayInFrame>
              <Popover.Trigger asChild>
                <XStack
                  role="button"
                  tabIndex={0}
                  cursor="pointer"
                  width={compact ? 28 : 240}
                  maxW={compact ? 28 : '38vw'}
                  height={25}
                  px={compact ? 0 : '$2'}
                  rounded={7}
                  borderWidth={1}
                  items="center"
                  justify={compact ? 'center' : 'space-between'}
                  style={{ backgroundColor: paint.sidebar, borderColor: paint.sidebarRule }}
                  hoverStyle={{ bg: '$color3' }}
                  aria-label={`Search ${orgDisplay}`}
                  data-testid="slack-top-search-trigger"
                >
                  {compact ? (
                    <Search size={13} color="$color10" />
                  ) : (
                    <>
                      <XStack items="center" gap="$1.5" minW={0} flex={1}>
                        <Search size={12} color="$color10" />
                        <Text fontSize={12} color="$color10" numberOfLines={1}>
                          {`Search ${orgDisplay}…`}
                        </Text>
                      </XStack>
                      <Text fontSize={10} fontWeight="600" color="$color9" px="$1" py={1} rounded="$1">
                        ⌘K
                      </Text>
                    </>
                  )}
                </XStack>
              </Popover.Trigger>

              <Popover.Content
                role="dialog"
                aria-label="Jump to channel, bot, or surface"
                borderWidth={1}
                elevation="$4"
                p="$2"
                width={460}
                bg="$background"
                borderColor="$borderColor"
                rounded="$4"
                style={{ zIndex: 100000 }}
              >
                <YStack gap="$2" width="100%">
                  <XStack
                    height={34}
                    px="$2.5"
                    items="center"
                    gap="$2"
                    rounded="$3"
                    bg="$color2"
                    borderWidth={1}
                    borderColor="$borderColor"
                  >
                    <Search size={14} color="$color10" />
                    <Input
                      flex={1}
                      height={30}
                      fontSize={13}
                      borderWidth={0}
                      bg="transparent"
                      placeholder="Jump to a channel, bot or issue board…"
                      value={query}
                      onChangeText={setQuery}
                      autoFocus
                    />
                  </XStack>

                  <YStack gap="$0.5" maxH={340} style={{ overflowY: 'auto' }}>
                    {filteredResults.map((item) => (
                      <XStack
                        key={item.id}
                        role="menuitem"
                        tabIndex={0}
                        cursor="pointer"
                        items="center"
                        gap="$2.5"
                        px="$2.5"
                        py="$1.5"
                        rounded="$3"
                        hoverStyle={{ bg: '$color3' }}
                        onPress={() => jumpTo(item.path)}
                      >
                        <YStack
                          width={24}
                          height={24}
                          rounded="$2"
                          bg="$color3"
                          items="center"
                          justify="center"
                          shrink={0}
                        >
                          {item.kind === 'bot' ? (
                            <Bot size={13} color="$color11" />
                          ) : item.kind === 'channel' ? (
                            <Hash size={13} color="$color11" />
                          ) : (
                            <SquareCheck size={13} color="$color11" />
                          )}
                        </YStack>
                        <YStack flex={1} minW={0}>
                          <Text fontSize={12} fontWeight="600" color="$color12" numberOfLines={1}>
                            {item.label}
                          </Text>
                          <Text fontSize={11} color="$color10" numberOfLines={1}>
                            {item.desc}
                          </Text>
                        </YStack>
                      </XStack>
                    ))}
                  </YStack>
                </YStack>
              </Popover.Content>
            </Popover>
          )}
          {rightSlot}
        </XStack>
      </XStack>
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

/**
 * Bottom-left user account avatar + popover menu (matching Slack, Hanzo Desktop & Hanzo Bot).
 */
export function RailAccountMenu({
  user,
  currentOrg,
  orgs = [],
  onSelectOrg,
  onCreateOrg,
  onConnectOrg,
  accounts = [],
  onSwitchAccount,
  onAddAccount,
  onSettings,
  onSignOut,
}: RailAccountMenuProps) {
  const [open, setOpen] = useState(false)

  const orgDisplay = currentOrg?.displayName?.trim() || currentOrg?.name || 'Hanzo AI'
  const userName = displayName(user?.name, user?.email) || 'Account'
  const userEmail = user?.email || ''
  const userSub = user?.sub || ''

  const knownAccounts: BusinessHeaderAccount[] = (() => {
    const list: BusinessHeaderAccount[] = []
    const seen = new Set<string>()
    if (userSub) {
      seen.add(userSub)
      list.push({
        sub: userSub,
        owner: user?.owner || currentOrg?.name || 'hanzo',
        name: userName,
        email: userEmail || undefined,
        avatar: user?.avatar,
      })
    }
    for (const acc of accounts) {
      if (acc.sub && !seen.has(acc.sub)) {
        seen.add(acc.sub)
        list.push(acc)
      }
    }
    return list
  })()

  return (
    <Popover open={open} onOpenChange={setOpen} placement="right-end" allowFlip stayInFrame>
      <Popover.Trigger asChild>
        <YStack
          role="button"
          tabIndex={0}
          cursor="pointer"
          width={32}
          height={32}
          rounded={round.pill}
          items="center"
          justify="center"
          position="relative"
          hoverStyle={{ bg: '$color3' }}
          aria-label={`${userName} · Account & settings`}
          aria-haspopup="menu"
          aria-expanded={open}
          data-testid="rail-account-menu-trigger"
          onKeyDown={(e: { key?: string; preventDefault?: () => void }) => {
            if (e?.key === 'Enter' || e?.key === ' ') {
              e.preventDefault?.()
              setOpen(!open)
            }
          }}
        >
          {user?.avatar ? (
            <OrgMark org={{ name: userName, logo: user.avatar }} size={28} />
          ) : (
            <YStack
              width={28}
              height={28}
              rounded={round.pill}
              items="center"
              justify="center"
              style={{ backgroundColor: paint.avatar }}
            >
              <Text fontSize={11} fontWeight="600" style={{ color: paint.avatarInk }}>
                {avatarInitials(user?.name, user?.email)}
              </Text>
            </YStack>
          )}
        </YStack>
      </Popover.Trigger>

      <Popover.Content
        role="menu"
        aria-label="Account menu"
        borderWidth={1}
        elevation="$4"
        p="$2"
        width={300}
        bg="$background"
        borderColor="$borderColor"
        rounded="$4"
        style={{ zIndex: 100000 }}
      >
        <YStack gap="$1" width="100%">
          {/* Active Identity Header */}
          <XStack items="center" gap="$2.5" px="$2" py="$2" rounded="$3" bg="$color2">
            <OrgMark org={{ name: userName, logo: user?.avatar }} size={36} />
            <YStack flex={1} minW={0} gap={1}>
              <Text fontSize="$3" fontWeight="700" color="$color12" numberOfLines={1}>
                {userName}
              </Text>
              {userEmail && userEmail !== userName ? (
                <Text fontSize="$1" color="$color10" numberOfLines={1}>
                  {userEmail}
                </Text>
              ) : null}
              <XStack items="center" gap="$1.5" mt={2}>
                <YStack width={6} height={6} rounded={round.pill} style={{ backgroundColor: state.done }} />
                <Text fontSize={11} fontWeight="600" color="$color10">
                  Active · {orgDisplay}
                </Text>
              </XStack>
            </YStack>
          </XStack>

          <Separator borderColor="$borderColor" my="$1" />

          {/* Switch account */}
          <YStack gap="$0.5">
            <XStack px="$2" py="$1" items="center" justify="space-between">
              <Text fontSize="$1" fontWeight="700" color="$color10" textTransform="uppercase" letterSpacing={0.5}>
                Switch account
              </Text>
              <Text fontSize={11} color="$color9">
                Identities
              </Text>
            </XStack>

            {knownAccounts.map((acc) => {
              const isCurrent = Boolean(userSub && acc.sub === userSub)
              const accName = acc.name || acc.email || acc.sub
              return (
                <XStack
                  key={acc.sub}
                  role="menuitem"
                  aria-checked={isCurrent}
                  tabIndex={0}
                  cursor="pointer"
                  items="center"
                  gap="$2.5"
                  px="$2"
                  py="$1.5"
                  rounded="$3"
                  bg={isCurrent ? '$color3' : 'transparent'}
                  hoverStyle={{ bg: '$color3' }}
                  onPress={() => {
                    setOpen(false)
                    if (!isCurrent) onSwitchAccount?.(acc)
                  }}
                >
                  <OrgMark org={{ name: accName, logo: acc.avatar }} size={24} />
                  <YStack flex={1} minW={0}>
                    <Text fontSize="$2" fontWeight={isCurrent ? '600' : '500'} color="$color12" numberOfLines={1}>
                      {accName}
                    </Text>
                    <Text fontSize="$1" color="$color10" numberOfLines={1}>
                      {acc.email && acc.email !== accName ? acc.email : isCurrent ? 'Current account' : `Identity · ${acc.owner}`}
                    </Text>
                  </YStack>
                  {isCurrent ? <Check size={14} color="$color12" /> : null}
                </XStack>
              )
            })}

            {onAddAccount ? (
              <XStack
                role="menuitem"
                tabIndex={0}
                cursor="pointer"
                items="center"
                gap="$2.5"
                px="$2"
                py="$1.5"
                rounded="$3"
                hoverStyle={{ bg: '$color3' }}
                onPress={() => {
                  setOpen(false)
                  onAddAccount()
                }}
              >
                <YStack width={24} height={24} rounded={round.pill} bg="$color3" items="center" justify="center">
                  <UserPlus size={13} color="$color11" />
                </YStack>
                <Text fontSize="$2" fontWeight="500" color="$color12">
                  Add another account
                </Text>
              </XStack>
            ) : null}
          </YStack>

          <Separator borderColor="$borderColor" my="$1" />

          {/* Switch organization */}
          <YStack gap="$0.5">
            <XStack px="$2" py="$1" items="center" justify="space-between">
              <Text fontSize="$1" fontWeight="700" color="$color10" textTransform="uppercase" letterSpacing={0.5}>
                Switch organization
              </Text>
              <Text fontSize={11} color="$color9">
                {orgDisplay}
              </Text>
            </XStack>

            {orgs.slice(0, 5).map((o) => {
              const active = o.name === currentOrg?.name
              const label = o.displayName?.trim() || o.name
              return (
                <XStack
                  key={o.name}
                  role="menuitem"
                  aria-checked={active}
                  tabIndex={0}
                  cursor="pointer"
                  items="center"
                  gap="$2.5"
                  px="$2"
                  py="$1.5"
                  rounded="$3"
                  bg={active ? '$color3' : 'transparent'}
                  hoverStyle={{ bg: '$color3' }}
                  onPress={() => {
                    setOpen(false)
                    if (!active) onSelectOrg?.(o.name)
                  }}
                >
                  <OrgMark org={{ name: label, logo: o.logo }} size={20} />
                  <Text flex={1} fontSize="$2" fontWeight={active ? '600' : '500'} color="$color12" numberOfLines={1}>
                    {label}
                  </Text>
                  {active ? <Check size={14} color="$color12" /> : null}
                </XStack>
              )
            })}

            {onCreateOrg ? (
              <XStack
                role="menuitem"
                tabIndex={0}
                cursor="pointer"
                items="center"
                gap="$2.5"
                px="$2"
                py="$1.5"
                rounded="$3"
                hoverStyle={{ bg: '$color3' }}
                onPress={() => {
                  setOpen(false)
                  onCreateOrg()
                }}
              >
                <YStack width={20} height={20} rounded={round.field} bg="$color3" items="center" justify="center">
                  <Plus size={12} color="$color11" />
                </YStack>
                <Text fontSize="$2" fontWeight="500" color="$color12">
                  Create new organization…
                </Text>
              </XStack>
            ) : null}

            {onConnectOrg ? (
              <XStack
                role="menuitem"
                tabIndex={0}
                cursor="pointer"
                items="center"
                gap="$2.5"
                px="$2"
                py="$1.5"
                rounded="$3"
                hoverStyle={{ bg: '$color3' }}
                onPress={() => {
                  setOpen(false)
                  onConnectOrg()
                }}
              >
                <YStack width={20} height={20} rounded={round.field} bg="$color3" items="center" justify="center">
                  <Share2 size={12} color="$color11" />
                </YStack>
                <Text fontSize="$2" fontWeight="500" color="$color12">
                  Hanzo Connect (share channel)…
                </Text>
              </XStack>
            ) : null}
          </YStack>

          <Separator borderColor="$borderColor" my="$1" />

          {/* Preferences & Theme */}
          <YStack gap="$0.5">
            <XStack items="center" justify="space-between" px="$2" py="$1.5" rounded="$3">
              <Text fontSize="$2" color="$color12">
                Theme
              </Text>
              <ThemeToggle />
            </XStack>

            {onSettings ? (
              <XStack
                role="menuitem"
                tabIndex={0}
                cursor="pointer"
                items="center"
                gap="$2.5"
                px="$2"
                py="$1.5"
                rounded="$3"
                hoverStyle={{ bg: '$color3' }}
                onPress={() => {
                  setOpen(false)
                  onSettings()
                }}
              >
                <Settings size={15} color="$color10" />
                <Text flex={1} fontSize="$2" color="$color12">
                  Settings & Preferences
                </Text>
                <Text fontSize={11} color="$color9">
                  ⌘,
                </Text>
              </XStack>
            ) : null}
          </YStack>

          {/* Sign out */}
          {onSignOut ? (
            <>
              <Separator borderColor="$borderColor" my="$1" />
              <XStack
                role="menuitem"
                tabIndex={0}
                cursor="pointer"
                items="center"
                gap="$2.5"
                px="$2"
                py="$1.5"
                rounded="$3"
                hoverStyle={{ bg: '$color3' }}
                onPress={() => {
                  setOpen(false)
                  onSignOut()
                }}
              >
                <LogOut size={15} color={paint.alert} />
                <Text fontSize="$2" fontWeight="500" style={{ color: paint.alert }}>
                  Sign out
                </Text>
              </XStack>
            </>
          ) : null}
        </YStack>
      </Popover.Content>
    </Popover>
  )
}
