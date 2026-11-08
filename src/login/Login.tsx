import { useState } from 'react'
import { Button, Input, SizableText, Spinner, XStack, YStack } from '@hanzo/ui'

import { brand } from '~/data/brand.ts'
import { useSession } from '~/data/session.tsx'
import { caps, chip, gap, mark, paint, rank, round, rung, state } from '~/theme/theme.ts'

type StageTab = 'board' | 'bot' | 'chat'

const DEMO_ISSUES = [
  {
    id: 'TEAM-142',
    title: 'Wire crypto top-up webhook & billing ledger receipts',
    status: 'doing' as const,
    priority: 1,
    tag: 'Billing',
    assignee: '@dev',
    summary: 'Bot @dev opened PR-418 (+184 -12) · 14/14 e2e checks green.',
  },
  {
    id: 'TEAM-145',
    title: 'Launch post & interactive Web + Mobile product stage',
    status: 'doing' as const,
    priority: 2,
    tag: 'Marketing',
    assignee: '@mark',
    summary: 'Bot @mark drafted launch thread and requested header asset from @des.',
  },
  {
    id: 'TEAM-149',
    title: 'Zero-downtime edge cutover for gallery.hanzo.ai & hanzo.team',
    status: 'done' as const,
    priority: 2,
    tag: 'Infra',
    assignee: '@ops',
    summary: 'Bot @ops verified CDN invalidation across all edge regions.',
  },
] as const

const BOT_LOGS = [
  '$ pnpm test && npx vite build',
  '✓ 42 unit & theme tests passed (0.48s)',
  '✓ Built production bundle -> dist/ (229 kB gzip)',
  '→ Opened PR-418 · awaiting 1-click approval',
] as const

/**
 * The way in, on this app's own page, paired with an interactive Web + Mobile
 * preview stage of the Hanzo Team & Hanzo Bot workspace so visitors on
 * hanzo.team see the live product on both desktop and mobile viewports.
 */
export const Login = () => {
  const { standing, enter, post, confirm, depart } = useSession()
  const [name, setName] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [refusal, setRefusal] = useState<string | null>(null)
  const [tab, setTab] = useState<StageTab>('board')
  const [selectedId, setSelectedId] = useState<string>('TEAM-142')
  const [approved, setApproved] = useState(false)

  if (standing === 'in') return null

  const activeIssue = DEMO_ISSUES.find((i) => i.id === selectedId) ?? DEMO_ISSUES[0]

  const attempt = (work: () => Promise<void>) => {
    setRefusal(null)
    setBusy(true)
    void work()
      .catch((e: unknown) => setRefusal(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false))
  }

  return (
    <YStack flex={1} bg={paint.ground} p={gap.wide} overflow="scroll">
      <XStack
        width="100%"
        maxW={1280}
        mx="auto"
        my="auto"
        py={gap.edge}
        gap={gap.edge}
        items="flex-start"
        justify="space-between"
        flexWrap="wrap"
      >
        {/* Left column: Hero + Embedded @hanzo/iam Sign-In */}
        <YStack width="100%" maxW={400} gap={gap.wide} grow={1} shrink={1}>
          <XStack items="center" gap={gap.tight}>
            <YStack width={10} height={10} rounded={round.pill} bg={state.done} />
            <SizableText size={rung.chip} color={paint.mute} {...caps}>
              HANZO TEAM · HUMAN + AI WORKSPACE
            </SizableText>
          </XStack>

          <YStack gap={gap.tight}>
            <SizableText size={rung.title} color={paint.ink} fontWeight="600">
              {brand.title} — Ship with your team and AI bots.
            </SizableText>
            <SizableText size={rung.body} color={paint.mute}>
              Issues, real-time channels, and autonomous Hanzo Bots with their own cloud computers — unified in one workspace across Web and Mobile.
            </SizableText>
          </YStack>

          <YStack
            p={gap.wide}
            rounded={round.panel}
            bg={paint.panel}
            borderWidth={1}
            borderColor={paint.rule}
            gap={gap.inset}
          >
            <SizableText size={rung.row} color={paint.ink} fontWeight="600">
              Sign in to your workspace
            </SizableText>

            <YStack gap={gap.tight}>
              <Input
                value={name}
                onChangeText={setName}
                placeholder="Email"
                autoComplete="username"
                rounded={round.field}
              />
              {sent ? (
                <Input
                  value={code}
                  onChangeText={setCode}
                  placeholder="The code we sent you"
                  autoComplete="one-time-code"
                  rounded={round.field}
                />
              ) : (
                <Input
                  value={secret}
                  onChangeText={setSecret}
                  placeholder="Password"
                  secureTextEntry
                  autoComplete="current-password"
                  rounded={round.field}
                />
              )}
            </YStack>

            {refusal ? (
              <SizableText size={rung.small} color={paint.alert}>
                {refusal}
              </SizableText>
            ) : null}

            <Button
              disabled={busy || !name}
              onPress={() =>
                attempt(() => (sent ? confirm(name, code) : enter(name, secret)))
              }
            >
              {busy ? <Spinner /> : sent ? 'Sign in' : 'Continue'}
            </Button>

            <XStack gap={gap.tight} justify="space-between" flexWrap="wrap">
              <Button
                chromeless
                disabled={busy || !name}
                onPress={() =>
                  attempt(async () => {
                    await post(name)
                    setSent(true)
                  })
                }
              >
                <SizableText size={rung.small} color={paint.mute}>
                  Email me a code
                </SizableText>
              </Button>
              <Button chromeless onPress={depart}>
                <SizableText size={rung.small} color={paint.mute}>
                  Sign in at {new URL(brand.issuer).hostname}
                </SizableText>
              </Button>
            </XStack>

            <Button
              variant="outline"
              onPress={() => window.location.assign('/projects/proj-crm/issues')}
            >
              Explore Live Workspace →
            </Button>
          </YStack>
        </YStack>

        {/* Right column: Interactive Web + Mobile Hanzo Team & Bot App Stage */}
        <YStack width="100%" maxW={820} grow={2} shrink={1} gap={gap.wide}>
          {/* Stage Mode Switcher */}
          <XStack items="center" justify="space-between" gap={gap.tight} flexWrap="wrap">
            <SizableText size={rung.small} color={paint.mute} {...caps}>
              LIVE WORKSPACE PREVIEW · WEB APP + MOBILE HANDSET
            </SizableText>
            <XStack gap={gap.tight} p={gap.tight} rounded={round.pill} bg={paint.panel} borderWidth={1} borderColor={paint.rule}>
              {(
                [
                  ['board', 'Tracker & Bots'],
                  ['bot', 'Hanzo Bot Computer'],
                  ['chat', 'Team Channels'],
                ] as const
              ).map(([id, label]) => (
                <Button
                  key={id}
                  size="sm"
                  chromeless={tab !== id}
                  onPress={() => setTab(id)}
                  rounded={round.pill}
                >
                  <SizableText size={rung.chip} color={tab === id ? paint.ink : paint.mute}>
                    {label}
                  </SizableText>
                </Button>
              ))}
            </XStack>
          </XStack>

          {/* Desktop / Web Workspace Window */}
          <YStack
            rounded={round.panel}
            bg={paint.panel}
            borderWidth={1}
            borderColor={paint.rule}
            overflow="hidden"
          >
            {/* Window Title Bar */}
            <XStack
              px={gap.wide}
              py={gap.tight}
              items="center"
              justify="space-between"
              borderBottomWidth={1}
              borderColor={paint.rule}
              bg={paint.card}
            >
              <XStack items="center" gap={gap.tight}>
                <YStack width={8} height={8} rounded={round.pill} bg={paint.alert} />
                <YStack width={8} height={8} rounded={round.pill} bg={state.doing} />
                <YStack width={8} height={8} rounded={round.pill} bg={state.done} />
                <SizableText size={rung.small} color={paint.ink} fontWeight="600">
                  hanzo.team · Web App
                </SizableText>
              </XStack>
              <SizableText size={rung.chip} color={paint.mute}>
                4 bots online · @dev @mark @ops @des
              </SizableText>
            </XStack>

            {/* 3-Pane Web App Body */}
            <XStack flexWrap="wrap">
              {/* Left Sidebar */}
              <YStack
                width={180}
                p={gap.inset}
                gap={gap.tight}
                borderRightWidth={1}
                borderColor={paint.rule}
                grow={1}
              >
                <SizableText size={rung.chip} color={paint.dim} {...caps}>
                  WORKSPACE
                </SizableText>
                <XStack justify="space-between" items="center" p={gap.tight} rounded={round.card} bg={tab === 'board' ? paint.card : undefined}>
                  <SizableText size={rung.small} color={paint.ink}>
                    Active Issues
                  </SizableText>
                  <SizableText size={rung.chip} color={paint.accent}>
                    3
                  </SizableText>
                </XStack>
                <XStack justify="space-between" items="center" p={gap.tight} rounded={round.card} bg={tab === 'bot' ? paint.card : undefined}>
                  <SizableText size={rung.small} color={paint.ink}>
                    Hanzo Bot Runs
                  </SizableText>
                  <SizableText size={rung.chip} color={state.done}>
                    Live
                  </SizableText>
                </XStack>
                <XStack justify="space-between" items="center" p={gap.tight} rounded={round.card} bg={tab === 'chat' ? paint.card : undefined}>
                  <SizableText size={rung.small} color={paint.ink}>
                    #launch-ops
                  </SizableText>
                  <SizableText size={rung.chip} color={paint.mute}>
                    12
                  </SizableText>
                </XStack>

                <SizableText size={rung.chip} color={paint.dim} mt={gap.tight} {...caps}>
                  AI TEAMMATES
                </SizableText>
                {(['@dev · Engineer', '@mark · Growth', '@ops · Infra', '@des · Design'] as const).map((bot) => (
                  <XStack key={bot} items="center" gap={gap.tight}>
                    <YStack width={6} height={6} rounded={round.pill} bg={ mark(bot) } />
                    <SizableText size={rung.small} color={paint.mute}>
                      {bot}
                    </SizableText>
                  </XStack>
                ))}
              </YStack>

              {/* Center Issue / Bot Stream */}
              <YStack width={340} p={gap.inset} gap={gap.tight} grow={2} shrink={1}>
                <SizableText size={rung.chip} color={paint.dim} {...caps}>
                  {tab === 'board' ? 'ACTIVE SPRINT ISSUES' : tab === 'bot' ? 'HANZO BOT EXECUTION STREAM' : 'CHANNEL · #LAUNCH-OPS'}
                </SizableText>
                {DEMO_ISSUES.map((item) => {
                  const selected = item.id === activeIssue.id
                  const badgeTone = chip(item.tag)
                  const prioTone = rank(item.priority)
                  return (
                    <YStack
                      key={item.id}
                      p={gap.inset}
                      rounded={round.card}
                      bg={selected ? paint.card : paint.ground}
                      borderWidth={1}
                      borderColor={selected ? paint.accent : paint.rule}
                      gap={gap.tight}
                      cursor="pointer"
                      onPress={() => setSelectedId(item.id)}
                    >
                      <XStack items="center" justify="space-between" gap={gap.tight} flexWrap="wrap">
                        <XStack items="center" gap={gap.tight}>
                          <YStack
                            width={8}
                            height={8}
                            rounded={round.pill}
                            bg={item.status === 'done' ? state.done : state.doing}
                          />
                          <SizableText size={rung.small} color={paint.mute}>
                            {item.id}
                          </SizableText>
                        </XStack>
                        <XStack gap={gap.tight}>
                          <YStack px={gap.tight} rounded={round.pill} style={prioTone}>
                            <SizableText size={rung.chip} color={prioTone.color}>
                              P{item.priority}
                            </SizableText>
                          </YStack>
                          <YStack px={gap.tight} rounded={round.pill} style={badgeTone}>
                            <SizableText size={rung.chip} color={badgeTone.color}>
                              {item.tag}
                            </SizableText>
                          </YStack>
                        </XStack>
                      </XStack>
                      <SizableText size={rung.body} color={paint.ink} fontWeight="500">
                        {item.title}
                      </SizableText>
                      <SizableText size={rung.small} color={paint.mute}>
                        {item.summary}
                      </SizableText>
                    </YStack>
                  )
                })}
              </YStack>

              {/* Right Inspector: Hanzo Bot Cloud Computer */}
              <YStack
                width={240}
                p={gap.inset}
                gap={gap.tight}
                borderLeftWidth={1}
                borderColor={paint.rule}
                bg={paint.ground}
                grow={1}
              >
                <XStack items="center" justify="space-between">
                  <SizableText size={rung.chip} color={paint.dim} {...caps}>
                    BOT COMPUTER · {activeIssue.assignee}
                  </SizableText>
                  <YStack width={7} height={7} rounded={round.pill} bg={state.done} />
                </XStack>
                <SizableText size={rung.small} color={paint.ink} fontWeight="500">
                  {activeIssue.id} · {activeIssue.tag} Sandbox
                </SizableText>
                <YStack
                  p={gap.tight}
                  rounded={round.card}
                  bg={paint.panel}
                  borderWidth={1}
                  borderColor={paint.rule}
                  gap={gap.tight}
                >
                  {BOT_LOGS.map((line) => (
                    <SizableText key={line} size={rung.chip} color={paint.mute}>
                      {line}
                    </SizableText>
                  ))}
                </YStack>
              </YStack>
            </XStack>
          </YStack>

          {/* Mobile App Handset (iPhone · hanzo.team & hanzo.bot Mobile) */}
          <XStack items="stretch" gap={gap.wide} flexWrap="wrap">
            <YStack
              width="100%"
              maxW={360}
              p={gap.inset}
              rounded={round.panel}
              bg={paint.panel}
              borderWidth={1}
              borderColor={paint.rule}
              gap={gap.tight}
            >
              <XStack items="center" justify="space-between">
                <SizableText size={rung.chip} color={paint.dim} {...caps}>
                  IPHONE · HANZO.TEAM MOBILE APP
                </SizableText>
                <SizableText size={rung.chip} color={state.done}>
                  9:41 · 5G
                </SizableText>
              </XStack>
              <YStack
                p={gap.inset}
                rounded={round.card}
                bg={paint.card}
                borderWidth={1}
                borderColor={paint.rule}
                gap={gap.tight}
              >
                <XStack items="center" justify="space-between">
                  <SizableText size={rung.small} color={paint.ink} fontWeight="600">
                    {activeIssue.assignee} · Approval Request
                  </SizableText>
                  <SizableText size={rung.chip} color={approved ? state.done : state.doing}>
                    {approved ? 'Shipped ✓' : 'Needs Review'}
                  </SizableText>
                </XStack>
                <SizableText size={rung.small} color={paint.mute}>
                  {activeIssue.summary}
                </SizableText>
                <Button size="sm" onPress={() => setApproved((prev) => !prev)}>
                  <SizableText size={rung.chip} color={paint.ink}>
                    {approved ? 'Approved & Deployed ✓' : 'Approve & Merge from Mobile'}
                  </SizableText>
                </Button>
              </YStack>
            </YStack>

            <YStack
              flex={1}
              minW={240}
              p={gap.inset}
              rounded={round.panel}
              bg={paint.panel}
              borderWidth={1}
              borderColor={paint.rule}
              justify="space-between"
              gap={gap.tight}
            >
              <YStack gap={gap.tight}>
                <SizableText size={rung.chip} color={paint.dim} {...caps}>
                  WEB + MOBILE PARITY
                </SizableText>
                <SizableText size={rung.body} color={paint.ink} fontWeight="500">
                  Every bot thread, issue board, and routine approval stays in sync across Web and Mobile.
                </SizableText>
                <SizableText size={rung.small} color={paint.mute}>
                  Start a task on desktop at hanzo.team, watch live terminal progress, and approve the deploy from your phone.
                </SizableText>
              </YStack>
              <XStack gap={gap.tight} flexWrap="wrap">
                {(['Issues', 'Channels', 'Bot Computers', 'Routines'] as const).map((pill) => {
                  const style = chip(pill)
                  return (
                    <YStack key={pill} px={gap.tight} py={gap.tight} rounded={round.pill} style={style}>
                      <SizableText size={rung.chip} color={style.color}>
                        {pill}
                      </SizableText>
                    </YStack>
                  )
                })}
              </XStack>
            </YStack>
          </XStack>
        </YStack>
      </XStack>
    </YStack>
  )
}
