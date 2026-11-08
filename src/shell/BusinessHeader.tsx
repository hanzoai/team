'use client'

/**
 * BusinessHeader — the universal global header for every Hanzo Business application
 * (`hanzo.team`, `crm.hanzo.ai`, `cms.hanzo.ai`, `marketing.hanzo.ai`, `ads.hanzo.ai`,
 * `social.hanzo.ai`, `console.hanzo.ai`, `platform.hanzo.ai`, etc.).
 *
 * Layout & Behavior:
 *  - Top Left:
 *      1. Product identity + App Switcher trigger (`Hanzo CRM ▾`, `Hanzo Team ▾`, etc.)
 *         Opening the App Switcher lists CRM, Work (Team), CMS, Email, Ads, Cal, Bots,
 *         Social, Chat, Dev, Commerce, Analytics, Data Room, Sign, Billing, Console, Platform.
 *      2. Current organization beneath the product identity (e.g. `Hanzo AI`), clickable
 *         to switch organizations.
 *  - Center:
 *      Breadcrumbs / Command Search (`children`).
 *  - Top Right:
 *      Signed-in user's avatar + display name + Account Menu:
 *        - Identity card showing Display Name, Email, and `Current account` indicator
 *        - Switch account (choose between authenticated identities on this browser,
 *          never confused with organizations)
 *        - Add another account (`prompt=login` without ending existing sessions)
 *        - Switch organization (choose between organizations the user belongs to)
 *        - Settings & Theme
 *        - Sign out
 */
import { useState, type ReactNode } from 'react'
import { Popover, Separator, Text, XStack, YStack } from '@hanzo/gui'
import {
  AppWindow,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  CreditCard,
  FileSignature,
  FolderLock,
  Globe,
  LayoutGrid,
  LogOut,
  Mail,
  Megaphone,
  MessageCircle,
  Plus,
  Settings,
  Share2,
  ShoppingBag,
  Sparkles,
  Terminal,
  UserPlus,
  UserRound,
  Users,
} from '@hanzogui/lucide-icons-2'

import { BrandMark, OrgMark } from '@hanzo/ui/product'
import { paint, state } from '~/theme/theme.ts'

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
  /** Short name in the app switcher grid/list, e.g. 'CRM', 'CMS', 'Email', 'Work'. */
  label: string
  /** Full product title when active at top-left, e.g. 'Hanzo CRM', 'Hanzo Team'. */
  productTitle: string
  /** Subtitle explaining what the app does. */
  description: string
  /** Canonical destination URL. */
  href: string
  /** Whether the surface supports `/auth/fresh?next=/&who=<sub>` session handoff. */
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
  /** Current application ID (`'crm'`, `'team'`, `'cms'`, `'email'`, `'ads'`, `'console'`, etc.). */
  appId?: BusinessAppId
  /** Explicit product title override, e.g. `'Hanzo CRM'`. */
  appTitle?: string
  /** Whether to show the product title text next to the brand mark when in the app (default: `false`). */
  showAppTitle?: boolean
  /** Available business apps in the app switcher. Defaults to `BUSINESS_APPS`. */
  apps?: readonly BusinessAppItem[]
  /** Custom handler when an app is selected from the switcher. */
  onSelectApp?: (app: BusinessAppItem) => void
  /** Custom brand mark icon at the far left. */
  brandMark?: ReactNode
  /** Current organization shown beneath the product title and in Switch organization. */
  currentOrg?: BusinessHeaderOrg
  /** All organizations the user can switch between. */
  orgs?: readonly BusinessHeaderOrg[]
  /** Called when the user selects an organization. */
  onSelectOrg?: (orgName: string) => void
  /** Called when the user clicks "All organizations" / "Switch organization" modal. */
  onAllOrgs?: () => void
  /** Called when the user clicks "Create organization". */
  onCreateOrg?: () => void
  /** Optional left-side slot before the app identity (e.g. mobile drawer hamburger). */
  leftSlot?: ReactNode
  /** Center slot (e.g. breadcrumbs, global search `⌘K`). */
  children?: ReactNode
  /** Optional right-side slot before the user account menu. */
  rightSlot?: ReactNode
  /** Currently signed-in user identity. */
  user?: {
    sub?: string
    name?: string
    email?: string
    avatar?: string
    owner?: string
  } | null
  /** Authenticated identities available in this browser session (`Switch account`). */
  accounts?: readonly BusinessHeaderAccount[]
  /** Switch to another authenticated identity (`login_hint: account.sub`). */
  onSwitchAccount?: (account: BusinessHeaderAccount) => void
  /** Authenticate an additional identity (`prompt=login`). */
  onAddAccount?: () => void
  /** Open user/account settings. */
  onSettings?: () => void
  /** Open organization settings. */
  onOrgSettings?: () => void
  /** Open billing. */
  onBilling?: () => void
  /** Theme toggle control rendered inside the account menu. */
  theme?: ReactNode
  /** Sign out of the session. */
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

/** Build a session-preserving destination URL when switching between Hanzo Business apps. */
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

export function BusinessHeader({
  appId = 'crm',
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
  user,
  accounts = [],
  onSwitchAccount,
  onAddAccount,
  onSettings,
  onOrgSettings,
  onBilling,
  theme,
  onSignOut,
}: BusinessHeaderProps) {
  const [appMenuOpen, setAppMenuOpen] = useState(false)
  const [orgMenuOpen, setOrgMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  const activeApp = apps.find((a) => a.id === appId) ?? apps[0]
  const resolvedAppTitle = appTitle || activeApp?.productTitle || 'Hanzo CRM'
  const orgDisplay = currentOrg?.displayName?.trim() || currentOrg?.name || 'Hanzo AI'

  const userName = displayName(user?.name, user?.email) || 'Account'
  const userEmail = user?.email || ''
  const userSub = user?.sub || ''

  // Deduplicate accounts list while keeping current user identifiable
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

  return (
    <XStack
      render="header"
      height={52}
      px="$3"
      gap="$3"
      items="center"
      justify="space-between"
      borderBottomWidth={1}
      borderColor="$borderColor"
      bg="$background"
      shrink={0}
      data-testid="hanzo-business-header"
    >
      {/* TOP LEFT: App Switcher (BrandMark) + Current Organization Switcher (no redundant product title in org switcher) */}
      <XStack items="center" gap="$2" minW={0} shrink={0}>
        {leftSlot}

        {/* App Switcher Trigger */}
        <Popover open={appMenuOpen} onOpenChange={setAppMenuOpen} placement="bottom-start" allowFlip stayInFrame>
          <Popover.Trigger asChild>
            <XStack
              role="button"
              tabIndex={0}
              cursor="pointer"
              items="center"
              gap="$1.5"
              height={34}
              px="$2"
              rounded="$3"
              borderWidth={0}
              outlineWidth={0}
              hoverStyle={{ bg: '$color3' }}
              aria-label={`${resolvedAppTitle} — Switch application`}
              aria-haspopup="menu"
              aria-expanded={appMenuOpen}
              data-testid="business-app-switcher-trigger"
              onKeyDown={(e: { key?: string; preventDefault?: () => void }) => {
                if (e?.key === 'Enter' || e?.key === ' ') {
                  e.preventDefault?.()
                  setAppMenuOpen(!appMenuOpen)
                }
              }}
            >
              <YStack items="center" justify="center" width={24} height={24} shrink={0}>
                {brandMark ?? <BrandMark size={20} wordmark="" />}
              </YStack>
              {showAppTitle ? (
                <Text fontSize="$3" fontWeight="700" color="$color12" numberOfLines={1}>
                  {resolvedAppTitle}
                </Text>
              ) : null}
              <ChevronDown size={13} color="$color10" />
            </XStack>
          </Popover.Trigger>

          <Popover.Content
            role="menu"
            aria-label="Hanzo Business Applications"
            borderWidth={1}
            elevation="$4"
            p="$2.5"
            width={360}
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
                        width={32}
                        height={32}
                        rounded="$3"
                        bg={isCurrent ? '$color4' : '$color2'}
                        items="center"
                        justify="center"
                        shrink={0}
                      >
                        <AppIcon id={app.id} size={16} />
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

        {/* Current Organization Switcher (shows ONLY the organization, never 'Hanzo CRM') */}
        <Popover open={orgMenuOpen} onOpenChange={setOrgMenuOpen} placement="bottom-start" allowFlip stayInFrame>
          <Popover.Trigger asChild>
            <XStack
              role="button"
              tabIndex={0}
              cursor="pointer"
              items="center"
              gap="$2"
              height={34}
              px="$2.5"
              rounded="$3"
              borderWidth={0}
              outlineWidth={0}
              hoverStyle={{ bg: '$color3' }}
              aria-label={`Current organization: ${orgDisplay}. Click to switch organization.`}
              data-testid="business-org-subtitle-trigger"
              onKeyDown={(e: { key?: string; preventDefault?: () => void }) => {
                if (e?.key === 'Enter' || e?.key === ' ') {
                  e.preventDefault?.()
                  setOrgMenuOpen(!orgMenuOpen)
                }
              }}
            >
              <OrgMark org={{ name: orgDisplay, logo: currentOrg?.logo }} size={22} />
              <Text fontSize="$2" fontWeight="600" color="$color12" numberOfLines={1} maxW={220}>
                {orgDisplay}
              </Text>
              <ChevronDown size={13} color="$color10" />
            </XStack>
          </Popover.Trigger>

              <Popover.Content
                role="menu"
                aria-label="Switch organization"
                borderWidth={1}
                elevation="$4"
                p="$2"
                width={280}
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
                        <OrgMark org={{ name: label, logo: o.logo }} size={22} />
                        <YStack flex={1} minW={0}>
                          <Text fontSize="$2" fontWeight={active ? '600' : '500'} color="$color12" numberOfLines={1}>
                            {label}
                          </Text>
                          {o.displayName && o.displayName !== o.name ? (
                            <Text fontSize="$1" color="$color10" numberOfLines={1}>
                              {o.name}
                            </Text>
                          ) : null}
                        </YStack>
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
                      <Building2 size={15} color="$color10" />
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
                      <Plus size={15} color="$color10" />
                      <Text fontSize="$2" color="$color12">
                        Create organization
                      </Text>
                    </XStack>
                  ) : null}
                </YStack>
              </Popover.Content>
            </Popover>
      </XStack>

      {/* CENTER: Breadcrumbs / Global Search (`⌘K`) */}
      <XStack flex={1} items="center" justify="center" minW={0} px="$2">
        {children}
      </XStack>

      {/* TOP RIGHT: Extra actions + Signed-in User Avatar, Name & Account Menu */}
      <XStack items="center" gap="$2" shrink={0}>
        {rightSlot}

        <Popover open={accountMenuOpen} onOpenChange={setAccountMenuOpen} placement="bottom-end" allowFlip stayInFrame>
          <Popover.Trigger asChild>
            <XStack
              role="button"
              tabIndex={0}
              cursor="pointer"
              items="center"
              gap="$2"
              height={40}
              px="$2.5"
              rounded="$3"
              hoverStyle={{ bg: '$color3' }}
              aria-label={`${userName} · Account menu`}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              data-testid="business-account-menu-trigger"
              onKeyDown={(e: { key?: string; preventDefault?: () => void }) => {
                if (e?.key === 'Enter' || e?.key === ' ') {
                  e.preventDefault?.()
                  setAccountMenuOpen(!accountMenuOpen)
                }
              }}
            >
              {user?.avatar || userName ? (
                <OrgMark org={{ name: userName, logo: user?.avatar }} size={28} />
              ) : (
                <UserRound size={18} />
              )}
              <YStack minW={0} justify="center" display="none" $sm={{ display: 'flex' }}>
                <Text fontSize="$2" fontWeight="600" color="$color12" numberOfLines={1} maxW={160} style={{ lineHeight: '16px' }}>
                  {userName}
                </Text>
                <Text fontSize={11} color="$color10" numberOfLines={1} maxW={160} style={{ lineHeight: '13px' }}>
                  Current account
                </Text>
              </YStack>
              <ChevronDown size={14} color="$color10" />
            </XStack>
          </Popover.Trigger>

          <Popover.Content
            role="menu"
            aria-label="Account menu"
            borderWidth={1}
            elevation="$4"
            p="$2"
            width={310}
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
                    <YStack width={6} height={6} rounded={999} style={{ backgroundColor: state.done }} />
                    <Text fontSize={11} fontWeight="600" color="$color10">
                      Current account
                    </Text>
                  </XStack>
                </YStack>
              </XStack>

              <Separator borderColor="$borderColor" my="$1" />

              {/* SECTION 1: Switch account (Authenticated identities on this browser) */}
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
                        setAccountMenuOpen(false)
                        if (!isCurrent) onSwitchAccount?.(acc)
                      }}
                      data-testid={`switch-account-${acc.sub}`}
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
                      setAccountMenuOpen(false)
                      onAddAccount()
                    }}
                    data-testid="add-another-account"
                  >
                    <YStack width={24} height={24} rounded={999} bg="$color3" items="center" justify="center">
                      <UserPlus size={13} color="$color11" />
                    </YStack>
                    <Text fontSize="$2" fontWeight="500" color="$color12">
                      Add another account
                    </Text>
                  </XStack>
                ) : null}
              </YStack>

              <Separator borderColor="$borderColor" my="$1" />

              {/* SECTION 2: Switch organization (Workspaces / Tenancies) */}
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
                        setAccountMenuOpen(false)
                        if (!active) onSelectOrg?.(o.name)
                      }}
                      data-testid={`switch-org-${o.name}`}
                    >
                      <OrgMark org={{ name: label, logo: o.logo }} size={22} />
                      <Text flex={1} fontSize="$2" fontWeight={active ? '600' : '500'} color="$color12" numberOfLines={1}>
                        {label}
                      </Text>
                      {active ? <Check size={14} color="$color12" /> : null}
                    </XStack>
                  )
                })}

                {onAllOrgs ? (
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
                      setAccountMenuOpen(false)
                      onAllOrgs()
                    }}
                    data-testid="switch-org-all"
                  >
                    <Building2 size={15} color="$color10" />
                    <Text fontSize="$2" color="$color12">
                      Switch organization…
                    </Text>
                  </XStack>
                ) : null}
              </YStack>

              <Separator borderColor="$borderColor" my="$1" />

              {/* SECTION 3: Settings, Billing & Theme */}
              <YStack gap="$0.5">
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
                      setAccountMenuOpen(false)
                      onSettings()
                    }}
                    data-testid="account-menu-settings"
                  >
                    <Settings size={15} color="$color10" />
                    <Text fontSize="$2" color="$color12">
                      Settings
                    </Text>
                  </XStack>
                ) : null}

                {onOrgSettings && onOrgSettings !== onSettings ? (
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
                      setAccountMenuOpen(false)
                      onOrgSettings()
                    }}
                  >
                    <Building2 size={15} color="$color10" />
                    <Text fontSize="$2" color="$color12">
                      Organization settings
                    </Text>
                  </XStack>
                ) : null}

                {onBilling ? (
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
                      setAccountMenuOpen(false)
                      onBilling()
                    }}
                  >
                    <CreditCard size={15} color="$color10" />
                    <Text fontSize="$2" color="$color12">
                      Billing
                    </Text>
                  </XStack>
                ) : null}

                {theme != null ? (
                  <XStack items="center" justify="space-between" px="$2" py="$1.5" rounded="$3">
                    <Text fontSize="$2" color="$color12">
                      Theme
                    </Text>
                    {theme}
                  </XStack>
                ) : null}
              </YStack>

              {/* SECTION 4: Sign out */}
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
                      setAccountMenuOpen(false)
                      onSignOut()
                    }}
                    data-testid="account-menu-signout"
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
      </XStack>
    </XStack>
  )
}
