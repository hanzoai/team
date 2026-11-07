/**
 * ALL HANZO BUSINESS APPS & 24/7 BOTS ROSTER.
 *
 * Provides the `/bots` surface (all 34 real Hanzo AI agents operating 24/7
 * proactively and event-driven) and the `/apps` surface (all 18 Hanzo Business
 * applications across Workspace, CRM, Marketing, AI, Commerce, and Cloud).
 */
import { Button, ScrollArea, SizableText, XStack, YStack } from '@hanzo/ui'
import {
  Activity,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  ExternalLink,
  FileSignature,
  FolderLock,
  Globe,
  Mail,
  Megaphone,
  MessagesSquare,
  Share2,
  ShoppingBag,
  Sparkles,
  SquareCheck,
  Terminal,
  Video,
  Zap,
} from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { BOT_AGENTS, HANZO_AGENTS, LEAD_AGENTS, type AgentPreset } from '~/data/agents.ts'
import { useSpace } from '~/data/space.tsx'
import { Find, Group, Nav as Column, press, Roll, Row, Rule, type Glyph } from '~/shell'
import { caps, chip, round, rung } from '~/theme/theme'

export type BusinessApp = {
  id: string
  label: string
  productTitle: string
  category: 'Workspace' | 'CRM & Growth' | 'AI & Engineering' | 'Commerce & Cloud'
  description: string
  href: string
  internalPath?: string
  icon: Glyph
  metrics: string
  bots: string[]
}

export const ALL_BUSINESS_APPS: readonly BusinessApp[] = [
  {
    id: 'chat',
    label: 'Team Chat',
    productTitle: 'Hanzo Team Chat',
    category: 'Workspace',
    description: 'Multiplayer human + AI channels, direct messages, threads, and huddles.',
    href: 'https://hanzo.team/chat',
    internalPath: '/chat/c-general',
    icon: MessagesSquare,
    metrics: '9 active channels · 23 AI teammates online',
    bots: ['vi', 'opera', 'mana', 'su'],
  },
  {
    id: 'tracker',
    label: 'Tracker & Board',
    productTitle: 'Hanzo Tracker',
    category: 'Workspace',
    description: 'Projects, Kanban boards, sprint velocity, components, and issue tracking.',
    href: 'https://hanzo.team/issues',
    internalPath: '/projects/proj-crm/issues',
    icon: SquareCheck,
    metrics: '4 active projects · 35 tracked issues',
    bots: ['mana', 'dev', 'des', 'opera'],
  },
  {
    id: 'bots',
    label: 'Bots · 24/7',
    productTitle: 'Hanzo Bots',
    category: 'AI & Engineering',
    description: 'All 23 autonomous 24/7 agents running on cron schedules and event triggers.',
    href: 'https://hanzo.bot',
    internalPath: '/bots',
    icon: Bot,
    metrics: '12 leads · 11 specialist bots · 24/7 active',
    bots: ['vi', 'dev', 'rev', 'opera'],
  },
  {
    id: 'crm',
    label: 'CRM',
    productTitle: 'Hanzo CRM',
    category: 'CRM & Growth',
    description: 'Enterprise pipeline, contacts, accounts, investor relations, and deal rooms.',
    href: 'https://crm.hanzo.ai',
    icon: Briefcase,
    metrics: '$4.2M active pipeline · 142 enterprise accounts',
    bots: ['sal', 'rev', 'biz', 'su'],
  },
  {
    id: 'dev',
    label: 'Dev & Build',
    productTitle: 'Hanzo Dev',
    category: 'AI & Engineering',
    description: 'Autonomous coding agents, cloud sandboxes, PR reviews, and Customize.',
    href: 'https://hanzo.ai/dev',
    icon: Terminal,
    metrics: '31-worker Turbopack CI · 4-shard E2E gates',
    bots: ['dev', 'cyber', 'sci', 'data'],
  },
  {
    id: 'ai-chat',
    label: 'AI Playground',
    productTitle: 'Hanzo Chat',
    category: 'AI & Engineering',
    description: 'Zen4 flagship models, Enso router, multimodal studio, and deep research.',
    href: 'https://hanzo.ai/chat',
    icon: Sparkles,
    metrics: 'Zen4 Ultra · Zen4 Coder · Enso Router',
    bots: ['sci', 'vi', 'data', 'mu'],
  },
  {
    id: 'cms',
    label: 'CMS',
    productTitle: 'Hanzo CMS',
    category: 'CRM & Growth',
    description: 'Headless content, marketing pages, documentation collections, and media.',
    href: 'https://cms.hanzo.ai/admin',
    icon: Globe,
    metrics: '1,021 static pages · 36 locales synced',
    bots: ['doc', 'ed', 'lang', 'art'],
  },
  {
    id: 'email',
    label: 'Email & Journeys',
    productTitle: 'Hanzo Email',
    category: 'CRM & Growth',
    description: 'Lifecycle campaigns, onboarding journeys, broadcasts, and deliverability.',
    href: 'https://marketing.hanzo.ai',
    icon: Mail,
    metrics: '99.4% deliverability · 18 active journeys',
    bots: ['mark', 'sal', 'su', 'ed'],
  },
  {
    id: 'ads',
    label: 'Ads & Attribution',
    productTitle: 'Hanzo Ads',
    category: 'CRM & Growth',
    description: 'Cross-channel ad spend, ROAS optimization, and multi-touch attribution.',
    href: 'https://ads.hanzo.ai',
    icon: Megaphone,
    metrics: '3.8x blended ROAS · real-time attribution',
    bots: ['mark', 'rev', 'data', 'fin'],
  },
  {
    id: 'social',
    label: 'Social & Publish',
    productTitle: 'Hanzo Publish',
    category: 'CRM & Growth',
    description: 'Social scheduling, unified community inbox, and brand listening across X & Discord.',
    href: 'https://social.hanzo.ai',
    icon: Share2,
    metrics: '11 channels connected · 24/7 listening',
    bots: ['mark', 'mo', 'art', 'ed'],
  },
  {
    id: 'cal',
    label: 'Calendar',
    productTitle: 'Hanzo Cal',
    category: 'Workspace',
    description: 'Team scheduling, booking links, availability routing, and sprint ceremonies.',
    href: 'https://hanzo.team/cal',
    internalPath: '/calendar',
    icon: Calendar,
    metrics: 'Synced across 4 organizations',
    bots: ['mana', 'opera', 'sal', 'huma'],
  },
  {
    id: 'meet',
    label: 'Meet & Huddles',
    productTitle: 'Hanzo Meet',
    category: 'Workspace',
    description: 'Low-latency video rooms, live AI transcription, and instant channel huddles.',
    href: 'https://hanzo.team/meet',
    internalPath: '/meet',
    icon: Video,
    metrics: 'Live AI notes & action items',
    bots: ['mana', 'mu', 'doc', 'vi'],
  },
  {
    id: 'commerce',
    label: 'Commerce',
    productTitle: 'Hanzo Commerce',
    category: 'Commerce & Cloud',
    description: 'Subscriptions, usage metering, checkout, orders, and multi-currency ledger.',
    href: 'https://commerce-admin.hanzo.ai/admin/',
    icon: ShoppingBag,
    metrics: 'Real-time credit metering & grants',
    bots: ['fin', 'rev', 'biz', 'sal'],
  },
  {
    id: 'analytics',
    label: 'Analytics & Insights',
    productTitle: 'Hanzo Analytics',
    category: 'Commerce & Cloud',
    description: 'Real-time web traffic, product funnels, cohort retention, and telemetry.',
    href: 'https://analytics.hanzo.ai',
    icon: BarChart3,
    metrics: 'Sub-second ClickHouse event queries',
    bots: ['data', 'rev', 'mark', 'sci'],
  },
  {
    id: 'dataroom',
    label: 'Data Room',
    productTitle: 'Hanzo Data Room',
    category: 'Workspace',
    description: 'Encrypted investor data rooms, board materials, and watermarked sharing.',
    href: 'https://dataroom.hanzo.ai',
    icon: FolderLock,
    metrics: 'Zero-knowledge KMS encryption',
    bots: ['fin', 'law', 'gov', 'vi'],
  },
  {
    id: 'sign',
    label: 'Sign',
    productTitle: 'Hanzo Sign',
    category: 'Workspace',
    description: 'Legally binding e-signatures, MSAs, DPAs, and automated contract workflows.',
    href: 'https://esign.hanzo.ai',
    icon: FileSignature,
    metrics: 'Automated MSA/DPA routing',
    bots: ['law', 'gov', 'sal', 'huma'],
  },
  {
    id: 'billing',
    label: 'Billing & Treasury',
    productTitle: 'Hanzo Billing',
    category: 'Commerce & Cloud',
    description: 'Org credit grants, AI compute budgets, invoices, and payment methods.',
    href: 'https://billing.hanzo.ai',
    icon: CreditCard,
    metrics: 'Per-agent daily & run budget caps',
    bots: ['fin', 'rev', 'biz', 'opera'],
  },
  {
    id: 'console',
    label: 'Cloud Console',
    productTitle: 'Hanzo Console',
    category: 'Commerce & Cloud',
    description: 'Unified Cloud control plane, IAM, KMS secrets, Vector, KV, and observability.',
    href: 'https://console.hanzo.ai',
    icon: Building2,
    metrics: 'IAM · KMS · S3 · ZAP Transactor',
    bots: ['dev', 'cyber', 'opera', 'data'],
  },
  {
    id: 'platform',
    label: 'Platform PaaS',
    productTitle: 'Hanzo Platform',
    category: 'Commerce & Cloud',
    description: 'Zero-downtime Sites plane, Kubernetes clusters, containers, and edge routing.',
    href: 'https://platform.hanzo.ai',
    icon: Activity,
    metrics: '3 hosts on Sites plane · 99.99% uptime',
    bots: ['dev', 'opera', 'cyber', 'data'],
  },
]

const CATEGORIES = ['Workspace', 'CRM & Growth', 'AI & Engineering', 'Commerce & Cloud'] as const

export function AppsNav() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const filtered = q
    ? ALL_BUSINESS_APPS.filter((a) =>
        `${a.label} ${a.productTitle} ${a.description} ${a.category}`.toLowerCase().includes(q),
      )
    : ALL_BUSINESS_APPS

  return (
    <Column title="Business Apps">
      <Find value={query} onChange={setQuery} />
      <YStack height={14} />
      <Row to="/apps" icon={<Zap size={16} color="$soft" />}>
        All Apps ({ALL_BUSINESS_APPS.length})
      </Row>
      <Rule />
      <Roll>
        {CATEGORIES.map((cat) => {
          const items = filtered.filter((a) => a.category === cat)
          if (items.length === 0) return null
          return (
            <YStack key={cat}>
              <Group>{cat}</Group>
              {items.map((app) => (
                <Row
                  key={app.id}
                  to={app.internalPath ?? `/apps/${app.id}`}
                  icon={<app.icon size={16} color="$soft" />}
                >
                  {app.label}
                </Row>
              ))}
            </YStack>
          )
        })}
      </Roll>
    </Column>
  )
}

export function AppsScreen() {
  const { appId } = useParams()
  const navigate = useNavigate()
  const { current } = useSpace()
  const [filter, setFilter] = useState<string>('All')
  const selectedApp = appId ? ALL_BUSINESS_APPS.find((a) => a.id === appId) : undefined

  const shown =
    filter === 'All'
      ? ALL_BUSINESS_APPS
      : ALL_BUSINESS_APPS.filter((a) => a.category === filter)

  return (
    <ScrollArea flex={1} minH={0}>
      <YStack p={24} gap={20}>
        {/* Header */}
        <XStack items="center" justify="space-between" flexWrap="wrap" gap={12}>
          <YStack gap={4}>
            <SizableText {...caps} fontSize={rung.chip} fontWeight="600" color="$soft">
              {current?.name ?? 'Hanzo AI'} · Unified Business Suite
            </SizableText>
            <SizableText fontSize={rung.title} fontWeight="600" color="$ink">
              {selectedApp ? selectedApp.productTitle : 'Hanzo Business Apps'}
            </SizableText>
            <SizableText fontSize={rung.body} color="$quiet">
              {selectedApp
                ? selectedApp.description
                : 'Every business application shares one Hanzo IAM identity, organization, and fleet of 23 autonomous 24/7 bots.'}
            </SizableText>
          </YStack>

          {selectedApp ? (
            <XStack gap={8} items="center">
              <Button variant="outline" onPress={() => navigate('/apps')}>
                All Business Apps
              </Button>
              <Button
                onPress={() => {
                  if (selectedApp.internalPath) {
                    navigate(selectedApp.internalPath)
                  } else {
                    window.open(selectedApp.href, '_blank', 'noopener,noreferrer')
                  }
                }}
              >
                Open {selectedApp.productTitle}
              </Button>
            </XStack>
          ) : null}
        </XStack>

        {/* Selected app spotlight */}
        {selectedApp ? (
          <YStack
            p={20}
            rounded={round.card}
            bg="$panel"
            borderWidth={1}
            borderColor="$edge"
            gap={16}
          >
            <XStack items="center" justify="space-between" flexWrap="wrap" gap={12}>
              <XStack items="center" gap={12}>
                <YStack
                  width={44}
                  height={44}
                  rounded={round.field}
                  bg="$hover"
                  borderWidth={1}
                  borderColor="$edge"
                  items="center"
                  justify="center"
                >
                  <selectedApp.icon size={22} color="$ink" />
                </YStack>
                <YStack>
                  <SizableText fontSize={rung.row} fontWeight="600" color="$ink">
                    {selectedApp.productTitle}
                  </SizableText>
                  <SizableText fontSize={rung.small} color="$soft">
                    {selectedApp.metrics} · {selectedApp.href}
                  </SizableText>
                </YStack>
              </XStack>
              <XStack
                px={10}
                py={4}
                rounded={round.pill}
                style={chip(selectedApp.category)}
              >
                <SizableText fontSize={rung.chip} fontWeight="600" style={{ color: chip(selectedApp.category).color }}>
                  {selectedApp.category}
                </SizableText>
              </XStack>
            </XStack>

            <SizableText fontSize={rung.small} fontWeight="600" color="$soft" {...caps}>
              Assigned 24/7 Autonomous Bots
            </SizableText>
            <XStack gap={10} flexWrap="wrap">
              {selectedApp.bots.map((botId) => {
                const bot = HANZO_AGENTS.find((a) => a.id === botId)
                if (!bot) return null
                return (
                  <XStack
                    key={bot.id}
                    {...press(() => navigate(`/chat/dm-${bot.id}`), `Chat with ${bot.name}`)}
                    p={10}
                    rounded={round.field}
                    bg="$background"
                    borderWidth={1}
                    borderColor="$edge"
                    hoverStyle={{ background: '$hover' }}
                    items="center"
                    gap={10}
                  >
                    <img
                      src={bot.avatar}
                      alt={bot.name}
                      width={32}
                      height={32}
                      style={{ width: 32, height: 32, borderRadius: 999, objectFit: 'cover' }}
                    />
                    <YStack>
                      <SizableText fontSize={rung.small} fontWeight="600" color="$ink">
                        {bot.name} · {bot.role}
                      </SizableText>
                      <SizableText fontSize={rung.chip} color="$soft">
                        24/7 · {bot.schedule}
                      </SizableText>
                    </YStack>
                  </XStack>
                )
              })}
            </XStack>
          </YStack>
        ) : null}

        {/* Category Filter Tabs */}
        <XStack gap={8} flexWrap="wrap">
          {(['All', ...CATEGORIES] as const).map((cat) => {
            const active = filter === cat
            return (
              <XStack
                key={cat}
                {...press(() => setFilter(cat), `Filter ${cat}`)}
                px={12}
                py={6}
                rounded={round.pill}
                bg={active ? '$hover' : '$background'}
                borderWidth={1}
                borderColor={active ? '$ink' : '$edge'}
                hoverStyle={{ background: '$hover' }}
              >
                <SizableText fontSize={rung.small} fontWeight={active ? '600' : '400'} color={active ? '$ink' : '$quiet'}>
                  {cat}
                </SizableText>
              </XStack>
            )
          })}
        </XStack>

        {/* Apps Grid */}
        <XStack flexWrap="wrap" gap={14}>
          {shown.map((app) => (
            <YStack
              key={app.id}
              {...press(() => {
                if (app.internalPath) {
                  navigate(app.internalPath)
                } else {
                  navigate(`/apps/${app.id}`)
                }
              }, app.productTitle)}
              width={300}
              grow={1}
              p={16}
              rounded={round.card}
              bg="$background"
              borderWidth={1}
              borderColor="$edge"
              hoverStyle={{ background: '$hover' }}
              gap={10}
              justify="space-between"
            >
              <YStack gap={8}>
                <XStack items="center" justify="space-between">
                  <XStack items="center" gap={10}>
                    <YStack
                      width={36}
                      height={36}
                      rounded={round.field}
                      bg="$panel"
                      borderWidth={1}
                      borderColor="$edge"
                      items="center"
                      justify="center"
                    >
                      <app.icon size={18} color="$ink" />
                    </YStack>
                    <YStack>
                      <SizableText fontSize={rung.row} fontWeight="600" color="$ink">
                        {app.productTitle}
                      </SizableText>
                      <SizableText fontSize={rung.chip} color="$soft">
                        {app.category}
                      </SizableText>
                    </YStack>
                  </XStack>
                  <ExternalLink size={14} color="$faint" />
                </XStack>

                <SizableText fontSize={rung.small} color="$quiet" numberOfLines={2}>
                  {app.description}
                </SizableText>
              </YStack>

              <XStack items="center" justify="space-between" pt={6} borderTopWidth={1} borderColor="$edge">
                <SizableText fontSize={rung.chip} color="$soft" numberOfLines={1}>
                  {app.metrics}
                </SizableText>
                <XStack gap={4}>
                  {app.bots.slice(0, 3).map((bId) => {
                    const b = HANZO_AGENTS.find((a) => a.id === bId)
                    return b ? (
                      <img
                        key={b.id}
                        src={b.avatar}
                        alt={b.name}
                        width={18}
                        height={18}
                        style={{ width: 18, height: 18, borderRadius: 999, objectFit: 'cover' }}
                      />
                    ) : null
                  })}
                </XStack>
              </XStack>
            </YStack>
          ))}
        </XStack>
      </YStack>
    </ScrollArea>
  )
}

export function BotsNav() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const leads = q
    ? LEAD_AGENTS.filter((a) => `${a.name} ${a.role} ${a.department}`.toLowerCase().includes(q))
    : LEAD_AGENTS
  const specialists = q
    ? BOT_AGENTS.filter((a) => `${a.name} ${a.role} ${a.department}`.toLowerCase().includes(q))
    : BOT_AGENTS

  return (
    <Column title="Bots · 24/7">
      <Find value={query} onChange={setQuery} />
      <YStack height={14} />
      <Row to="/bots" icon={<Bot size={16} color="$soft" />}>
        All {HANZO_AGENTS.length} Bots
      </Row>
      <Rule />
      <Roll>
        <Group>Department Leads ({LEAD_AGENTS.length})</Group>
        {leads.map((a) => (
          <Row
            key={a.id}
            to={`/chat/dm-${a.id}`}
            icon={
              <img
                src={a.avatar}
                alt={a.name}
                width={18}
                height={18}
                style={{ width: 18, height: 18, borderRadius: 999, objectFit: 'cover' }}
              />
            }
          >
            {`${a.name} — ${a.role}`}
          </Row>
        ))}
        <Rule />
        <Group>Specialist Bots · 24/7 ({BOT_AGENTS.length})</Group>
        {specialists.map((a) => (
          <Row
            key={a.id}
            to={`/chat/dm-${a.id}`}
            icon={
              <img
                src={a.avatar}
                alt={a.name}
                width={18}
                height={18}
                style={{ width: 18, height: 18, borderRadius: 999, objectFit: 'cover' }}
              />
            }
          >
            {`${a.name} — ${a.role}`}
          </Row>
        ))}
      </Roll>
    </Column>
  )
}

export function BotsScreen() {
  const navigate = useNavigate()
  const { current } = useSpace()
  const [dept, setDept] = useState<string>('All')
  const departments = ['All', ...Array.from(new Set(HANZO_AGENTS.map((a) => a.department)))]
  const shown = dept === 'All' ? HANZO_AGENTS : HANZO_AGENTS.filter((a) => a.department === dept)

  return (
    <ScrollArea flex={1} minH={0}>
      <YStack p={24} gap={20}>
        <XStack items="center" justify="space-between" flexWrap="wrap" gap={12}>
          <YStack gap={4}>
            <SizableText {...caps} fontSize={rung.chip} fontWeight="600" color="$soft">
              {current?.name ?? 'Hanzo AI'} · Autonomous 24/7 Fleet
            </SizableText>
            <SizableText fontSize={rung.title} fontWeight="600" color="$ink">
              Bots & Agents ({HANZO_AGENTS.length})
            </SizableText>
            <SizableText fontSize={rung.body} color="$quiet">
              Every Hanzo agent can run on-demand or operate 24/7 as a persistent, proactive, event-driven bot.
            </SizableText>
          </YStack>
        </XStack>

        <XStack gap={8} flexWrap="wrap">
          {departments.map((d) => {
            const active = dept === d
            return (
              <XStack
                key={d}
                {...press(() => setDept(d), `Filter ${d}`)}
                px={12}
                py={6}
                rounded={round.pill}
                bg={active ? '$hover' : '$background'}
                borderWidth={1}
                borderColor={active ? '$ink' : '$edge'}
                hoverStyle={{ background: '$hover' }}
              >
                <SizableText fontSize={rung.small} fontWeight={active ? '600' : '400'} color={active ? '$ink' : '$quiet'}>
                  {d}
                </SizableText>
              </XStack>
            )
          })}
        </XStack>

        <XStack flexWrap="wrap" gap={14}>
          {shown.map((agent: AgentPreset) => (
            <YStack
              key={agent.id}
              {...press(() => navigate(`/chat/dm-${agent.id}`), `Open ${agent.name}`)}
              width={290}
              grow={1}
              p={16}
              rounded={round.card}
              bg="$background"
              borderWidth={1}
              borderColor="$edge"
              hoverStyle={{ background: '$hover' }}
              gap={10}
            >
              <XStack items="center" justify="space-between" gap={10}>
                <XStack items="center" gap={10}>
                  <img
                    src={agent.avatar}
                    alt={agent.name}
                    width={42}
                    height={42}
                    style={{ width: 42, height: 42, borderRadius: 999, objectFit: 'cover' }}
                  />
                  <YStack>
                    <SizableText fontSize={rung.row} fontWeight="600" color="$ink">
                      {agent.name}
                    </SizableText>
                    <SizableText fontSize={rung.small} color="$soft">
                      {agent.role} · {agent.department}
                    </SizableText>
                  </YStack>
                </XStack>
                <XStack px={8} py={3} rounded={round.pill} style={chip(agent.department)}>
                  <SizableText fontSize={rung.chip} fontWeight="600" style={{ color: chip(agent.department).color }}>
                    24/7 · {agent.schedule}
                  </SizableText>
                </XStack>
              </XStack>

              <SizableText fontSize={rung.small} color="$quiet" numberOfLines={2}>
                {agent.status}
              </SizableText>

              <XStack items="center" justify="space-between" pt={6} borderTopWidth={1} borderColor="$edge">
                <SizableText fontSize={rung.chip} color="$faint">
                  Triggers: {agent.triggers.join(' · ')}
                </SizableText>
                <SizableText fontSize={rung.chip} fontWeight="600" color="$ink">
                  Message →
                </SizableText>
              </XStack>
            </YStack>
          ))}
        </XStack>
      </YStack>
    </ScrollArea>
  )
}
