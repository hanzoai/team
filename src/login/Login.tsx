import { useEffect, useState, type ReactNode } from 'react'
import { Button, Input, SizableText, Spinner, XStack, YStack } from '@hanzo/ui'

import { brand } from '~/data/brand.ts'
import { fixture } from '~/data/fixture.ts'
import { useSession } from '~/data/session.tsx'
import { useSpace } from '~/data/space.tsx'
import { gap, paint, round, rung, state } from '~/theme/theme.ts'

import { Callback } from './Callback.tsx'
import { cart, START } from './start.ts'

/** Where the issuer returns a browser. Registered at IAM, so it is fixed. */
const CALLBACK = '/auth/callback'

const HEADER_LINKS = [
  { label: 'Docs', href: 'https://docs.hanzo.ai' },
  { label: 'Hanzo Bot', href: 'https://hanzo.bot' },
  { label: 'Hanzo App', href: 'https://hanzo.app' },
  { label: 'API Platform', href: 'https://platform.hanzo.ai' },
  { label: 'Hanzo AI', href: 'https://hanzo.ai' },
] as const

const FOOTER_COLUMNS = [
  {
    title: 'Products',
    links: [
      { label: 'Hanzo Team', href: 'https://hanzo.team' },
      { label: 'Hanzo Bot', href: 'https://hanzo.bot' },
      { label: 'Hanzo App', href: 'https://hanzo.app' },
      { label: 'Hanzo Dev', href: 'https://hanzo.ai/dev' },
      { label: 'API Platform', href: 'https://platform.hanzo.ai' },
      { label: 'Download App', href: 'https://hanzo.ai/download' },
      { label: 'Pricing', href: 'https://hanzo.ai/pricing' },
    ],
  },
  {
    title: 'Models & AI',
    links: [
      { label: 'All Models', href: 'https://hanzo.ai/models' },
      { label: 'Enso', href: 'https://hanzo.ai/enso' },
      { label: 'Zen', href: 'https://hanzo.ai/zen' },
      { label: 'Kai', href: 'https://hanzo.ai/kai' },
      { label: 'MCP Tools', href: 'https://hanzo.ai/mcp' },
      { label: 'Agent Skills', href: 'https://hanzo.ai/skills' },
      { label: 'Benchmarks', href: 'https://hanzo.ai/benchmarks' },
    ],
  },
  {
    title: 'Developers & Cloud',
    links: [
      { label: 'Documentation', href: 'https://docs.hanzo.ai' },
      { label: 'Hanzo CLI', href: 'https://hanzo.ai/cli' },
      { label: 'Hanzo Base', href: 'https://hanzo.ai/base' },
      { label: 'Hanzo IAM', href: 'https://hanzo.id' },
      { label: 'Hanzo KMS', href: 'https://kms.hanzo.ai' },
      { label: 'Open Source', href: 'https://github.com/hanzoai' },
      { label: 'System Status', href: 'https://status.hanzo.ai' },
    ],
  },
  {
    title: 'Company & Legal',
    links: [
      { label: 'Hanzo AI', href: 'https://hanzo.ai' },
      { label: 'Enterprise', href: 'https://hanzo.ai/enterprise' },
      { label: 'Customer Stories', href: 'https://hanzo.ai/customers' },
      { label: 'Contact Sales', href: 'https://hanzo.ai/contact-sales' },
      { label: 'Security & Trust', href: 'https://hanzo.ai/security' },
      { label: 'Privacy Policy', href: 'https://hanzo.ai/privacy' },
      { label: 'Terms of Service', href: 'https://hanzo.ai/terms' },
    ],
  },
] as const

/**
 * Sign-in page for Hanzo Team (`hanzo.team`), matching `platform.hanzo.ai`:
 * top bar with `Hanzo Team` + quick links + `Contact sales` / `Log in`,
 * centered dot-grid hero + dark sign-in card, and shared multi-column Hanzo footer.
 */
export const Login = () => {
  const { standing, enter, post, confirm, depart } = useSession()
  const [name, setName] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [refusal, setRefusal] = useState<string | null>(null)

  if (standing === 'in') return null

  const attempt = (work: () => Promise<void>) => {
    setRefusal(null)
    setBusy(true)
    void work()
      .catch((e: unknown) => setRefusal(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false))
  }

  return (
    <YStack flex={1} bg={paint.ground} overflow="scroll">
      {/* Top 68px Bar matching platform.hanzo.ai */}
      <XStack
        width="100%"
        minH={68}
        px={gap.wide}
        py={gap.tight}
        items="center"
        justify="space-between"
        borderBottomWidth={1}
        borderColor={paint.rule}
        bg={paint.panel}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <XStack
          items="center"
          gap={gap.tight}
          cursor="pointer"
          onPress={() => window.location.assign('/')}
        >
          <YStack
            width={24}
            height={24}
            rounded={round.field}
            bg={paint.ink}
            items="center"
            justify="center"
          >
            <SizableText size={rung.small} color={paint.ground} fontWeight="700">
              H
            </SizableText>
          </YStack>
          <SizableText size={rung.row} color={paint.ink} fontWeight="600">
            {brand.title}
          </SizableText>
        </XStack>

        <XStack items="center" gap={gap.tight} flexWrap="wrap">
          {HEADER_LINKS.map((item) => (
            <Button
              key={item.label}
              size="sm"
              chromeless
              rounded={round.pill}
              onPress={() => window.location.assign(item.href)}
            >
              <SizableText size={rung.small} color={paint.mute}>
                {item.label}
              </SizableText>
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            rounded={round.field}
            onPress={() => window.location.assign('https://hanzo.ai/contact-sales')}
          >
            <SizableText size={rung.small} color={paint.ink}>
              Contact sales
            </SizableText>
          </Button>
          <Button size="sm" rounded={round.field} onPress={depart}>
            <SizableText size={rung.small} color={paint.ink} fontWeight="600">
              Log in
            </SizableText>
          </Button>
        </XStack>
      </XStack>

      {/* Centered Dot-Grid Hero + Sign-In Card matching platform.hanzo.ai */}
      <YStack
        width="100%"
        grow={1}
        items="center"
        justify="center"
        px={gap.wide}
        py={gap.edge}
        bg={paint.ground}
        style={{
          backgroundImage: `radial-gradient(${paint.rule} 1px, transparent 1px)`,
          backgroundSize: '16px 16px',
        }}
      >
        <YStack width="100%" maxW={520} items="center" gap={gap.inset} py={gap.edge}>
          <SizableText
            size={rung.title}
            color={paint.ink}
            fontWeight="600"
            style={{ textAlign: 'center' }}
          >
            Sign in to {brand.title}
          </SizableText>

          <SizableText
            size={rung.body}
            color={paint.mute}
            maxW={400}
            style={{ textAlign: 'center' }}
          >
            AI cockpit, live streams, issue boards, channels, and bots for your team.
          </SizableText>

          {/* Centered Dark Sign-In Card */}
          <YStack
            width="100%"
            maxW={396}
            mt={gap.inset}
            p={gap.wide}
            rounded={round.panel}
            bg={paint.panel}
            borderWidth={1}
            borderColor={paint.rule}
            gap={gap.inset}
          >
            <Button onPress={depart} rounded={round.field}>
              <SizableText size={rung.small} color={paint.ink} fontWeight="600">
                Continue with Hanzo ID ({new URL(brand.issuer).hostname})
              </SizableText>
            </Button>

            <XStack items="center" gap={gap.tight}>
              <YStack flex={1} height={1} bg={paint.rule} />
              <SizableText size={rung.chip} color={paint.dim}>
                OR
              </SizableText>
              <YStack flex={1} height={1} bg={paint.rule} />
            </XStack>

            <YStack gap={gap.tight}>
              <SizableText size={rung.small} color={paint.mute}>
                Email
              </SizableText>
              <Input
                value={name}
                onChangeText={setName}
                placeholder="name@company.com"
                autoComplete="username"
                rounded={round.field}
              />
              {sent ? (
                <>
                  <SizableText size={rung.small} color={paint.mute}>
                    Verification code
                  </SizableText>
                  <Input
                    value={code}
                    onChangeText={setCode}
                    placeholder="Enter the code sent to your email"
                    autoComplete="one-time-code"
                    rounded={round.field}
                  />
                </>
              ) : (
                <>
                  <SizableText size={rung.small} color={paint.mute}>
                    Password
                  </SizableText>
                  <Input
                    value={secret}
                    onChangeText={setSecret}
                    placeholder="Password"
                    secureTextEntry
                    autoComplete="current-password"
                    rounded={round.field}
                  />
                </>
              )}
            </YStack>

            {refusal ? (
              <SizableText size={rung.small} color={paint.alert}>
                {refusal}
              </SizableText>
            ) : null}

            <Button
              disabled={busy || !name}
              rounded={round.field}
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
                  Email me a sign-in code instead
                </SizableText>
              </Button>
              <Button
                chromeless
                onPress={() => window.location.assign('https://hanzo.id/signup')}
              >
                <SizableText size={rung.small} color={paint.mute}>
                  Create account
                </SizableText>
              </Button>
            </XStack>

            <SizableText
              size={rung.chip}
              color={paint.dim}
              style={{ textAlign: 'center' }}
            >
              By continuing, you agree to Hanzo’s Terms of Service and Privacy Policy.
            </SizableText>
          </YStack>

          {/* Compact Quick Links Row */}
          <XStack
            gap={gap.inset}
            flexWrap="wrap"
            justify="center"
            mt={gap.tight}
          >
            {[
              ['Hanzo Bot', 'https://hanzo.bot'],
              ['Hanzo App', 'https://hanzo.app'],
              ['API Platform', 'https://platform.hanzo.ai'],
              ['Hanzo AI', 'https://hanzo.ai'],
              ['Docs', 'https://docs.hanzo.ai'],
            ].map(([label, href]) => (
              <SizableText
                key={label}
                size={rung.small}
                color={paint.mute}
                cursor="pointer"
                onPress={() => window.location.assign(href)}
              >
                {label} ↗
              </SizableText>
            ))}
          </XStack>
        </YStack>
      </YStack>

      {/* Shared Multi-Column Hanzo Footer matching platform.hanzo.ai & hanzo.ai */}
      <YStack
        width="100%"
        borderTopWidth={1}
        borderColor={paint.rule}
        bg={paint.panel}
        px={gap.wide}
        py={gap.edge}
      >
        <YStack width="100%" maxW={1280} mx="auto" gap={gap.edge}>
          <XStack justify="space-between" items="flex-start" gap={gap.edge} flexWrap="wrap">
            <YStack maxW={280} gap={gap.inset}>
              <XStack items="center" gap={gap.tight}>
                <YStack
                  width={24}
                  height={24}
                  rounded={round.field}
                  bg={paint.ink}
                  items="center"
                  justify="center"
                >
                  <SizableText size={rung.small} color={paint.ground} fontWeight="700">
                    H
                  </SizableText>
                </YStack>
                <SizableText size={rung.row} color={paint.ink} fontWeight="600">
                  Hanzo AI
                </SizableText>
              </XStack>
              <SizableText size={rung.small} color={paint.mute}>
                Sovereign AI cloud, developer platform, autonomous bots, and business workspace.
              </SizableText>
              <XStack
                items="center"
                gap={gap.tight}
                px={gap.inset}
                py={gap.tight}
                rounded={round.pill}
                borderWidth={1}
                borderColor={paint.rule}
                self="flex-start"
                cursor="pointer"
                onPress={() => window.location.assign('https://status.hanzo.ai')}
              >
                <YStack width={8} height={8} rounded={round.pill} bg={state.done} />
                <SizableText size={rung.chip} color={paint.ink}>
                  All systems operational
                </SizableText>
              </XStack>
            </YStack>

            <XStack gap={gap.edge} flexWrap="wrap" grow={1} justify="space-between">
              {FOOTER_COLUMNS.map((col) => (
                <YStack key={col.title} minW={150} gap={gap.tight}>
                  <SizableText size={rung.small} color={paint.ink} fontWeight="600">
                    {col.title}
                  </SizableText>
                  {col.links.map((link) => (
                    <SizableText
                      key={link.label}
                      size={rung.small}
                      color={paint.mute}
                      cursor="pointer"
                      onPress={() => window.location.assign(link.href)}
                    >
                      {link.label}
                    </SizableText>
                  ))}
                </YStack>
              ))}
            </XStack>
          </XStack>

          <XStack
            pt={gap.wide}
            borderTopWidth={1}
            borderColor={paint.rule}
            items="center"
            justify="space-between"
            flexWrap="wrap"
            gap={gap.tight}
          >
            <SizableText size={rung.chip} color={paint.dim}>
              © 2016–2026 Hanzo AI, Inc. (Techstars ’17). All rights reserved.
            </SizableText>
            <XStack gap={gap.wide} flexWrap="wrap">
              {[
                ['hanzo.ai', 'https://hanzo.ai'],
                ['hanzo.app', 'https://hanzo.app'],
                ['hanzo.bot', 'https://hanzo.bot'],
                ['platform.hanzo.ai', 'https://platform.hanzo.ai'],
                ['docs.hanzo.ai', 'https://docs.hanzo.ai'],
                ['GitHub', 'https://github.com/hanzoai'],
              ].map(([label, href]) => (
                <SizableText
                  key={label}
                  size={rung.chip}
                  color={paint.mute}
                  cursor="pointer"
                  onPress={() => window.location.assign(href)}
                >
                  {label}
                </SizableText>
              ))}
            </XStack>
          </XStack>
        </YStack>
      </YStack>
    </YStack>
  )
}

/**
 * AuthGate wraps the router and renders the Login page when signed out,
 * handles `/auth/callback` and `/start`, and checks workspace enrolment.
 */
export const AuthGate = ({ children }: { children: ReactNode }) => {
  const { standing: session } = useSession()
  const { standing: space, refusal, enrolment } = useSpace()

  if (window.location.pathname === CALLBACK) return <Callback />
  if (window.location.pathname === START) return <Forward to={cart(window.location.search, window.location.origin)} />
  if (fixture.on) return <>{children}</>
  if (session === 'unknown') return <Waiting />
  if (session === 'out' && (window.location.pathname === '/' || window.location.pathname === '/login')) return <Login />

  if (space === 'stranger') {
    return (
      <Word title="One more step" body="Set up your workspace to see your projects.">
        <Button onPress={() => window.location.assign(enrolment)}>Set up</Button>
      </Word>
    )
  }

  if (space === 'refused') {
    return (
      <Word title="Your workspace is not answering" body={refusal?.message ?? ''}>
        <Button onPress={() => window.location.reload()}>Try again</Button>
      </Word>
    )
  }

  if (space === 'unknown') return <Waiting />

  return <>{children}</>
}

const Forward = ({ to }: { to: string }) => {
  useEffect(() => window.location.replace(to), [to])
  return <Waiting />
}

const Waiting = () => (
  <YStack flex={1} items="center" justify="center" bg={paint.ground}>
    <Spinner />
  </YStack>
)

const Word = ({ title, body, children }: { title: string; body: string; children: ReactNode }) => (
  <YStack flex={1} items="center" justify="center" gap={gap.inset} bg={paint.ground} p={gap.wide}>
    <SizableText size={rung.title} color={paint.ink}>
      {title}
    </SizableText>
    {body ? (
      <SizableText size={rung.body} color={paint.mute}>
        {body}
      </SizableText>
    ) : null}
    {children}
  </YStack>
)
