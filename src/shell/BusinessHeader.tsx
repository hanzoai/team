'use client'

/**
 * BusinessHeader — Slack-style top navigation bar + AccountMenuPopover for the
 * bottom-left rail (matching Slack, Hanzo Desktop, and Hanzo Bot).
 *
 * Layout:
 *  - Top Bar (40px):
 *      - Left: App Switcher (H ▾) + Organization Switcher (Hanzo AI ▾)
 *      - Center: Back (←) · Forward (→) · History (⏱) + Centered Search / Jump Bar (⌘K)
 *      - Right: Optional quick actions (`rightSlot`, e.g. ThemeToggle)
 *  - Bottom-Left Rail (`AccountMenuPopover`):
 *      - User Avatar + online status dot -> opens Account Menu Popover (`Switch account`,
 *        `Add another account`, `Switch organization`, `Theme`, `Settings`, `Sign out`)
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Input, Popover, Separator, Text, XStack, YStack } from '@hanzo/gui'
import {
  AppWindow,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  FileSignature,
  FolderLock,
  Globe,
  Hash,
  LayoutGrid,
  LogOut,
  Mail,
  Megaphone,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Share2,
  ShoppingBag,
  Sparkles,
  SquareCheck,
  Terminal,
  UserPlus,
  UserRound,
  Users,
} from '@hanzogui/lucide-icons-2'
import { BrandMark, OrgMark, ThemeToggle } from '@hanzo/ui/product'
import { HANZO_AGENTS } from '~/data/agents.ts'
import { paint, round, state } from '~/theme/theme.ts'

function displayName(name?: string, email?: string): string {
  if (name?.trim()) return name.trim()
  const local = email?.split('@')[0]
  return local?.trim() || ''
}

export type BusinessAppId =
  | 'crm'
  | 'team'
  | 'work'
  | 'cms'
  | 'post'
  | 'email'
  | 'marketing'
  | 'ads'
  | 'cal'
  | 'bots'
  | 'social'
  | 'chat'
  | 'dev'
  | 'commerce'
  | 'analytics'
  | 'dataroom'
  | 'sign'
  | 'billing'
  | 'console'
  | 'platform'

export type BusinessAppItem = {
  id: BusinessAppId
  label: string
  productTitle: string
  description: string
  href: string
  supportsFreshAuth?: boolean
}

export const BUSINESS_APPS: readonly BusinessAppItem[] = [
  {
    id: 'crm',
    label: 'CRM',
    productTitle: 'Hanzo CRM',
    description: 'Pipeline, contacts, investors & deals',
    href: 'https://crm.hanzo.ai',
    supportsFreshAuth: true,
  },
  {
    id: 'team',
    label: 'Work',
    productTitle: 'Hanzo Team',
    description: 'Shared workspace, docs, tasks & drive',
    href: 'https://hanzo.team',
    supportsFreshAuth: false,
  },
  {
    id: 'cms',
    label: 'CMS',
    productTitle: 'Hanzo CMS',
    description: 'Content, pages, collections & media',
    href: 'https://cms.hanzo.ai/admin',
    supportsFreshAuth: false,
  },
  {
    id: 'email',
    label: 'Email',
    productTitle: 'Hanzo Email',
    description: 'Campaigns, journeys & broadcasts',
    href: 'https://marketing.hanzo.ai',
    supportsFreshAuth: true,
  },
  {
    id: 'ads',
    label: 'Ads',
    productTitle: 'Hanzo Ads',
    description: 'Ad spend, ROAS & attribution',
    href: 'https://ads.hanzo.ai',
    supportsFreshAuth: true,
  },
  {
    id: 'cal',
    label: 'Cal',
    productTitle: 'Hanzo Cal',
    description: 'Scheduling, bookings & availability',
    href: 'https://hanzo.team/cal',
    supportsFreshAuth: false,
  },
  {
    id: 'bots',
    label: 'Bots',
    productTitle: 'Hanzo Bots',
    description: 'Autonomous AI agents & workflows',
    href: 'https://hanzo.bot',
    supportsFreshAuth: false,
  },
  {
    id: 'post',
    label: 'Post',
    productTitle: 'Hanzo Post',
    description: 'AI social & blog publishing across 28+ channels',
    href: 'https://post.hanzo.ai',
    supportsFreshAuth: false,
  },
  {
    id: 'social',
    label: 'Social',
    productTitle: 'Hanzo Publish',
    description: 'Social scheduling, inbox & listening',
    href: 'https://social.hanzo.ai',
    supportsFreshAuth: true,
  },
  {
    id: 'chat',
    label: 'Chat',
    productTitle: 'Hanzo Chat',
    description: 'AI assistant, models & playground',
    href: 'https://hanzo.ai/chat',
    supportsFreshAuth: false,
  },
  {
    id: 'dev',
    label: 'Dev',
    productTitle: 'Hanzo Dev',
    description: 'Coding agents & cloud workspaces',
    href: 'https://hanzo.ai/dev',
    supportsFreshAuth: false,
  },
  {
    id: 'commerce',
    label: 'Commerce',
    productTitle: 'Hanzo Commerce',
    description: 'Store, products, orders & subscriptions',
    href: 'https://commerce-admin.hanzo.ai/admin/',
    supportsFreshAuth: false,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    productTitle: 'Hanzo Analytics',
    description: 'Web traffic, funnels & retention',
    href: 'https://analytics.hanzo.ai',
    supportsFreshAuth: false,
  },
  {
    id: 'dataroom',
    label: 'Data Room',
    productTitle: 'Hanzo Data Room',
    description: 'Secure investor & deal data rooms',
    href: 'https://dataroom.hanzo.ai',
    supportsFreshAuth: false,
  },
  {
    id: 'sign',
    label: 'Sign',
    productTitle: 'Hanzo Sign',
    description: 'Document e-signatures & agreements',
    href: 'https://esign.hanzo.ai',
    supportsFreshAuth: false,
  },
  {
    id: 'billing',
    label: 'Billing',
    productTitle: 'Hanzo Billing',
    description: 'Usage, balance, invoices & payment methods',
    href: 'https://billing.hanzo.ai',
    supportsFreshAuth: false,
  },
  {
    id: 'console',
    label: 'Console',
    productTitle: 'Hanzo Console',
    description: 'Cloud, AI infrastructure & IAM',
    href: 'https://console.hanzo.ai',
    supportsFreshAuth: true,
  },
  {
    id: 'platform',
    label: 'Platform',
    productTitle: 'Hanzo Platform',
    description: 'PaaS deployments, clusters & containers',
    href: 'https://platform.hanzo.ai',
    supportsFreshAuth: true,
  },
] as const

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
  appId?: BusinessAppId
  appTitle?: string
  showAppTitle?: boolean
  apps?: readonly BusinessAppItem[]
  onSelectApp?: (app: BusinessAppItem) => void
  brandMark?: ReactNode
  currentOrg?: BusinessHeaderOrg
  orgs?: readonly BusinessHeaderOrg[]
  onSelectOrg?: (orgName: string) => void
  onAllOrgs?: () => void
  onCreateOrg?: () => void
  leftSlot?: ReactNode
  children?: ReactNode
  rightSlot?: ReactNode
  onNavigate?: (path: string) => void
  user?: {
    sub?: string
    name?: string
    email?: string
    avatar?: string
    owner?: string
  } | null
  accounts?: readonly BusinessHeaderAccount[]
  onSwitchAccount?: (account: BusinessHeaderAccount) => void
  onAddAccount?: () => void
  onSettings?: () => void
  onOrgSettings?: () => void
  onBilling?: () => void
  theme?: ReactNode
  onSignOut?: () => void
}

function AppIcon({ id, size = 16 }: { id: BusinessAppId; size?: number }) {
  switch (id) {
    case 'crm':
      return <Briefcase size={size} />
    case 'team':
    case 'work':
      return <Users size={size} />
    case 'cms':
      return <Globe size={size} />
    case 'email':
    case 'marketing':
      return <Mail size={size} />
    case 'ads':
      return <Megaphone size={size} />
    case 'cal':
      return <Calendar size={size} />
    case 'bots':
      return <Bot size={size} />
    case 'post':
    case 'social':
      return <Share2 size={size} />
    case 'chat':
      return <MessageCircle size={size} />
    case 'dev':
      return <Terminal size={size} />
    case 'commerce':
      return <ShoppingBag size={size} />
    case 'analytics':
      return <BarChart3 size={size} />
    case 'dataroom':
      return <FolderLock size={size} />
    case 'sign':
      return <FileSignature size={size} />
    case 'billing':
      return <CreditCard size={size} />
    case 'console':
      return <Sparkles size={size} />
    case 'platform':
      return <LayoutGrid size={size} />
    default:
      return <AppWindow size={size} />
  }
}

export function buildSeamlessAppUrl(
  app: BusinessAppItem,
  opts?: { who?: string; org?: string },
): string {
  try {
    const u = new URL(app.href)
    if (app.supportsFreshAuth && opts?.who) {
      const nextPath = opts?.org ? `/?org=${encodeURIComponent(opts.org)}` : '/'
      return `${u.origin}/auth/fresh?next=${encodeURIComponent(nextPath)}&who=${encodeURIComponent(opts.who)}`
    }
    if (opts?.org && !u.searchParams.has('org')) {
      u.searchParams.set('org', opts.org)
    }
    return u.toString()
  } catch {
    return app.href
  }
}

const JUMP_CHANNELS = [
  { id: 'c-general', label: '#general', desc: 'Company-wide announcements & updates', path: '/chat/c-general' },
  { id: 'c-hanzo-revenue', label: '#hanzo-revenue', desc: 'Live checkouts, orders, subscriptions & deals', path: '/chat/c-hanzo-revenue' },
  { id: 'c-feedback', label: '#feedback', desc: 'Inbound leads, form submits, feedback & bug reports', path: '/chat/c-feedback' },
  { id: 'c-hanzo-support', label: '#hanzo-support', desc: 'Customer support & triage', path: '/chat/c-hanzo-support' },
  { id: 'c-errors', label: '#errors', desc: 'Runtime faults, Sentry exceptions & CLI errors', path: '/chat/c-errors' },
  { id: 'c-hanzo-ui', label: '#hanzo-ui', desc: 'Design system & GUI components', path: '/chat/c-hanzo-ui' },
]

const JUMP_SURFACES = [
  { id: 'overview', label: 'AI Cockpit — Live Business Command Center', desc: '24/7 AI C-Suite + realtime checkouts, leads, form submits & telemetry', path: '/overview' },
  { id: 'issues', label: 'Tracker — All issues', desc: 'Kanban board, list & project issues', path: '/issues' },
  { id: 'crm-opp', label: 'CRM — Opportunities', desc: 'Pipeline deals & revenue stages', path: '/crm/opportunities' },
  { id: 'crm-inv', label: 'CRM — Investors (346K)', desc: 'Institutional VCs, angels & funds', path: '/crm/investors' },
  { id: 'crm-leads', label: 'CRM — Developer Leads (13.48M)', desc: 'GitHub developer cohorts by stars', path: '/crm/leads' },
  { id: 'bots', label: 'Bots — 24/7 Autonomous Agents', desc: 'Configure schedules, models & triggers', path: '/bots' },
  { id: 'apps', label: 'Apps — Hanzo Business Suite', desc: 'All connected Hanzo applications', path: '/apps' },
]

export function BusinessHeader({
  appId = 'team',
  appTitle,
  showAppTitle = false,
  apps = BUSINESS_APPS,
  onSelectApp,
  brandMark,
  currentOrg,
  orgs = [],
  onSelectOrg,
  onAllOrgs,
  onCreateOrg,
  leftSlot,
  children,
  rightSlot,
  onNavigate,
  user,
}: BusinessHeaderProps) {
  const [appMenuOpen, setAppMenuOpen] = useState(false)
  const [orgMenuOpen, setOrgMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  const activeApp = apps.find((a) => a.id === appId) ?? apps[0]
  const resolvedAppTitle = appTitle || activeApp?.productTitle || 'Hanzo Team'
  const orgDisplay = currentOrg?.displayName?.trim() || currentOrg?.name || 'Hanzo AI'
  const userSub = user?.sub || ''

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

  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    const botItems = HANZO_AGENTS.map((a) => ({
      id: `bot-${a.id}`,
      kind: 'bot' as const,
      label: `${a.name} — ${a.role}`,
      desc: a.status,
      path: `/chat/dm-${a.id}`,
    }))
    const channelItems = JUMP_CHANNELS.map((c) => ({ ...c, kind: 'channel' as const }))
    const surfaceItems = JUMP_SURFACES.map((s) => ({ ...s, kind: 'surface' as const }))
    const all = [...surfaceItems, ...channelItems, ...botItems]
    if (!q) return all.slice(0, 12)
    return all
      .filter((item) => item.label.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q))
      .slice(0, 14)
  }, [query])

  const handleLaunchApp = (app: BusinessAppItem) => {
    setAppMenuOpen(false)
    if (onSelectApp) {
      onSelectApp(app)
      return
    }
    if (typeof window !== 'undefined') {
      const targetUrl = buildSeamlessAppUrl(app, {
        who: userSub || undefined,
        org: currentOrg?.name || undefined,
      })
      window.location.assign(targetUrl)
    }
  }

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
      height={40}
      px="$2.5"
      gap="$2"
      items="center"
      justify="space-between"
      borderBottomWidth={1}
      borderColor="$borderColor"
      bg="$background"
      shrink={0}
      data-testid="hanzo-business-header"
    >
      {/* TOP LEFT: App Switcher (H ▾) + Organization Switcher (Hanzo AI ▾) */}
      <XStack items="center" gap="$1.5" minW={0} shrink={0}>
        {leftSlot}

        <Popover open={appMenuOpen} onOpenChange={setAppMenuOpen} placement="bottom-start" allowFlip stayInFrame>
          <Popover.Trigger asChild>
            <XStack
              role="button"
              tabIndex={0}
              cursor="pointer"
              items="center"
              gap="$1"
              height={30}
              px="$2"
              rounded="$3"
              hoverStyle={{ bg: '$color3' }}
              aria-label={`${resolvedAppTitle} — Switch application`}
              aria-haspopup="menu"
              aria-expanded={appMenuOpen}
              data-testid="business-app-switcher-trigger"
            >
              <YStack items="center" justify="center" width={20} height={20} shrink={0}>
                {brandMark ?? <BrandMark size={17} wordmark="" />}
              </YStack>
              {showAppTitle ? (
                <Text fontSize="$2" fontWeight="700" color="$color12" numberOfLines={1}>
                  {resolvedAppTitle}
                </Text>
              ) : null}
              <ChevronDown size={12} color="$color10" />
            </XStack>
          </Popover.Trigger>

          <Popover.Content
            role="menu"
            aria-label="Hanzo Business Applications"
            borderWidth={1}
            elevation="$4"
            p="$2.5"
            width={350}
            bg="$background"
            borderColor="$borderColor"
            rounded="$4"
            style={{ zIndex: 100000 }}
          >
            <YStack gap="$2" width="100%">
              <XStack items="center" justify="space-between" px="$2" pt="$1">
                <Text fontSize="$1" fontWeight="700" color="$color10" textTransform="uppercase" letterSpacing={0.6}>
                  Hanzo Business Suite
                </Text>
                <Text fontSize="$1" color="$color10">
                  {orgDisplay}
                </Text>
              </XStack>

              <YStack gap="$0.5" maxH={420} style={{ overflowY: 'auto' }}>
                {apps.map((app) => {
                  const isCurrent = app.id === appId
                  return (
                    <XStack
                      key={app.id}
                      role="menuitem"
                      tabIndex={0}
                      cursor="pointer"
                      items="center"
                      gap="$2.5"
                      px="$2.5"
                      py="$2"
                      rounded="$3"
                      bg={isCurrent ? '$color3' : 'transparent'}
                      hoverStyle={{ bg: '$color3' }}
                      onPress={() => handleLaunchApp(app)}
                      data-testid={`app-switcher-item-${app.id}`}
                    >
                      <YStack
                        width={30}
                        height={30}
                        rounded="$3"
                        bg={isCurrent ? '$color4' : '$color2'}
                        items="center"
                        justify="center"
                        shrink={0}
                      >
                        <AppIcon id={app.id} size={15} />
                      </YStack>
                      <YStack flex={1} minW={0} gap={1}>
                        <XStack items="center" gap="$1.5">
                          <Text fontSize="$2" fontWeight="600" color="$color12" numberOfLines={1}>
                            {app.label}
                          </Text>
                          {isCurrent ? (
                            <Text fontSize={10} fontWeight="600" color="$color10" px="$1.5" py={1} rounded="$2" bg="$color4">
                              Current
                            </Text>
                          ) : null}
                        </XStack>
                        <Text fontSize="$1" color="$color10" numberOfLines={1}>
                          {app.description}
                        </Text>
                      </YStack>
                      {isCurrent ? <Check size={14} color="$color12" /> : null}
                    </XStack>
                  )
                })}
              </YStack>
            </YStack>
          </Popover.Content>
        </Popover>

        {/* Organization Switcher */}
        <Popover open={orgMenuOpen} onOpenChange={setOrgMenuOpen} placement="bottom-start" allowFlip stayInFrame>
          <Popover.Trigger asChild>
            <XStack
              role="button"
              tabIndex={0}
              cursor="pointer"
              items="center"
              gap="$1.5"
              height={30}
              px="$2"
              rounded="$3"
              hoverStyle={{ bg: '$color3' }}
              aria-label={`Current organization: ${orgDisplay}. Click to switch organization.`}
              data-testid="business-org-subtitle-trigger"
            >
              <OrgMark org={{ name: orgDisplay, logo: currentOrg?.logo }} size={20} />
              <Text fontSize="$2" fontWeight="600" color="$color12" numberOfLines={1} maxW={180}>
                {orgDisplay}
              </Text>
              <ChevronDown size={12} color="$color10" />
            </XStack>
          </Popover.Trigger>

          <Popover.Content
            role="menu"
            aria-label="Switch organization"
            borderWidth={1}
            elevation="$4"
            p="$2"
            width={260}
            bg="$background"
            borderColor="$borderColor"
            rounded="$4"
            style={{ zIndex: 100000 }}
          >
            <YStack gap="$1" width="100%">
              <XStack px="$2" py="$1" items="center" justify="space-between">
                <Text fontSize="$1" fontWeight="700" color="$color10" textTransform="uppercase" letterSpacing={0.5}>
                  Switch organization
                </Text>
              </XStack>

              {orgs.map((o) => {
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
                      setOrgMenuOpen(false)
                      onSelectOrg?.(o.name)
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

              {(onAllOrgs || onCreateOrg) ? <Separator borderColor="$borderColor" my="$1" /> : null}

              {onAllOrgs ? (
                <XStack
                  role="menuitem"
                  tabIndex={0}
                  cursor="pointer"
                  items="center"
                  gap="$2"
                  px="$2"
                  py="$1.5"
                  rounded="$3"
                  hoverStyle={{ bg: '$color3' }}
                  onPress={() => {
                    setOrgMenuOpen(false)
                    onAllOrgs()
                  }}
                >
                  <Building2 size={14} color="$color10" />
                  <Text fontSize="$2" color="$color12">
                    All organizations…
                  </Text>
                </XStack>
              ) : null}

              {onCreateOrg ? (
                <XStack
                  role="menuitem"
                  tabIndex={0}
                  cursor="pointer"
                  items="center"
                  gap="$2"
                  px="$2"
                  py="$1.5"
                  rounded="$3"
                  hoverStyle={{ bg: '$color3' }}
                  onPress={() => {
                    setOrgMenuOpen(false)
                    onCreateOrg()
                  }}
                >
                  <Plus size={14} color="$color10" />
                  <Text fontSize="$2" color="$color12">
                    Create organization
                  </Text>
                </XStack>
              ) : null}
            </YStack>
          </Popover.Content>
        </Popover>
      </XStack>

      {/* CENTER: Slack-style Back / Forward / History + Search Omnibar (⌘K) */}
      <XStack flex={1} items="center" justify="center" gap="$1.5" minW={0} px="$2">
        {children ?? (
          <>
            <XStack items="center" gap={2} shrink={0}>
              <XStack
                role="button"
                tabIndex={0}
                cursor="pointer"
                width={26}
                height={26}
                rounded="$2"
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
                rounded="$2"
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
              <XStack
                role="button"
                tabIndex={0}
                cursor="pointer"
                width={26}
                height={26}
                rounded="$2"
                items="center"
                justify="center"
                hoverStyle={{ bg: '$color3' }}
                aria-label="Recent activity"
                onPress={() => setSearchOpen(true)}
              >
                <Clock size={13} color="$color10" />
              </XStack>
            </XStack>

            <Popover open={searchOpen} onOpenChange={setSearchOpen} placement="bottom" allowFlip stayInFrame>
              <Popover.Trigger asChild>
                <XStack
                  role="button"
                  tabIndex={0}
                  cursor="pointer"
                  flex={1}
                  maxW={460}
                  height={28}
                  px="$2.5"
                  rounded="$3"
                  bg="$color2"
                  borderWidth={1}
                  borderColor="$borderColor"
                  items="center"
                  justify="space-between"
                  hoverStyle={{ bg: '$color3' }}
                  aria-label={`Search ${orgDisplay}`}
                  data-testid="slack-top-search-trigger"
                >
                  <XStack items="center" gap="$2" minW={0} flex={1}>
                    <Search size={13} color="$color10" />
                    <Text fontSize={12} color="$color10" numberOfLines={1}>
                      {`Search ${orgDisplay}…`}
                    </Text>
                  </XStack>
                  <Text
                    fontSize={10}
                    fontWeight="600"
                    color="$color9"
                    px="$1.5"
                    py={1}
                    rounded="$2"
                    bg="$color3"
                  >
                    ⌘K
                  </Text>
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
                      placeholder="Jump to a channel, 24/7 bot, issue board, or CRM view…"
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
          </>
        )}
      </XStack>

      {/* TOP RIGHT: Minimal utility slot (no account menu — account lives bottom-left in the rail) */}
      <XStack items="center" gap="$1.5" shrink={0}>
        {rightSlot ?? <ThemeToggle />}
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
          width={36}
          height={36}
          rounded={round.field}
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
          {user?.avatar || userName ? (
            <OrgMark org={{ name: userName, logo: user?.avatar }} size={30} />
          ) : (
            <UserRound size={18} />
          )}
          {/* Active presence indicator dot */}
          <YStack
            position="absolute"
            b={1}
            r={1}
            width={9}
            height={9}
            rounded={round.pill}
            borderWidth={1.5}
            borderColor="$background"
            style={{ backgroundColor: state.done }}
          />
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
                <Text fontSize="$2" color="$color12">
                  Preferences & Bots
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
