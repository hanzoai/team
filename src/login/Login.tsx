import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Theme } from '@hanzo/gui'
import { Button, SizableText, Spinner, XStack, YStack } from '@hanzo/ui'
import { SignInPanel } from '@hanzo/ui/auth/panel'

import { brand } from '~/data/brand.ts'
import { isDesktopApp, isMacDesktop } from '~/data/desktop.ts'
import { useSession } from '~/data/session.tsx'
import { useSpace } from '~/data/space.tsx'
import { DesktopWindowControls, dragDesktopWindow, toggleDesktopMaximize } from '~/shell/DesktopWindowChrome.tsx'
import { gap, paint, round, rung } from '~/theme/theme.ts'

import { Callback } from './Callback.tsx'
import { cart, START } from './start.ts'

const CALLBACK = '/auth/callback'
const SITE = 'https://hanzo.ai'
const LOGIN_BG = 'var(--hanzo-login-bg, #000000)'
const LOGIN_FG = 'var(--hanzo-login-fg, #fafafa)'
const LOGIN_MUTED = 'var(--hanzo-login-muted, #a1a1aa)'

const SHELL_STYLE: CSSProperties = {
  flex: 1, minHeight: '100dvh', width: '100%', backgroundColor: LOGIN_BG, color: LOGIN_FG,
  padding: '0 0 20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'space-between',
}

const MAIN_STYLE: CSSProperties = {
  width: '100%', maxWidth: 420, margin: 'auto', padding: '24px 16px', boxSizing: 'border-box',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
}

const BRAND_LINK_STYLE: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', height: 34, color: LOGIN_FG, textDecoration: 'none',
}

const WORDMARK_STYLE: CSSProperties = {
  display: 'inline-block', fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em',
  lineHeight: 1, color: LOGIN_FG, transform: 'translateY(-0.08em)',
}

const FOOTER_STYLE: CSSProperties = {
  width: '100%', padding: '12px 24px 0', boxSizing: 'border-box', display: 'flex',
  flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 0,
}

function HanzoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 67 67" fill="none" aria-hidden="true">
      <path d="M22.21 67V44.6369H0V67H22.21Z" fill="currentColor" />
      <path d="M0 44.6369L22.21 46.8285V44.6369H0Z" fill="currentColor" fillOpacity="0.65" />
      <path d="M66.7038 22.3184H22.2534L0.0878906 44.6367H44.4634L66.7038 22.3184Z" fill="currentColor" />
      <path d="M22.21 0H0V22.3184H22.21V0Z" fill="currentColor" />
      <path d="M66.7198 0H44.5098V22.3184H66.7198V0Z" fill="currentColor" />
      <path d="M66.6753 22.3185L44.5098 20.0822V22.3185H66.6753Z" fill="currentColor" fillOpacity="0.65" />
      <path d="M66.7198 67V44.6369H44.5098V67H66.7198Z" fill="currentColor" />
    </svg>
  )
}

function HanzoWordmark() {
  return <span data-size="28" data-slot="wordmark" style={WORDMARK_STYLE}>hanzo</span>
}

function HanzoTeamAppIcon({ size = 64 }: { size?: number }) {
  return (
    <img
      src="/logos/hanzo-team.svg"
      width={size}
      height={size}
      alt="Hanzo Team"
      data-hanzo-app-icon="hanzo-team"
      style={{ display: 'block', width: size, height: size, flexShrink: 0 }}
    />
  )
}

function LoginFooter() {
  return (
    <footer data-slot="footer" style={FOOTER_STYLE}>
      <span style={{ display: 'inline-flex', color: LOGIN_FG }}><HanzoMark size={22} /></span>
      <span style={{ fontSize: 12, lineHeight: '16px', color: LOGIN_MUTED }}>© 2026 Hanzo AI</span>
    </footer>
  )
}

const GateHeader = ({ account, onLeave }: { account?: string | null; onLeave?: () => void }) => {
  const desktop = isDesktopApp()
  const macDesktop = desktop && isMacDesktop()

  return (
    <header
      data-slot="masthead"
      data-tauri-drag-region={desktop ? '' : undefined}
      onMouseDown={desktop ? dragDesktopWindow : undefined}
      onDoubleClick={desktop ? toggleDesktopMaximize : undefined}
      style={{
        width: '100%', height: 60, paddingLeft: macDesktop ? 84 : 24, paddingRight: desktop && !macDesktop ? 12 : 24,
        boxSizing: 'border-box', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
      }}
    >
      {desktop ? (
        <div data-tauri-drag-region="" style={{ ...BRAND_LINK_STYLE, userSelect: 'none' }}><HanzoWordmark /></div>
      ) : (
        <a href={SITE} aria-label="Hanzo" style={BRAND_LINK_STYLE}><HanzoWordmark /></a>
      )}
      <XStack items="center" gap={gap.tight} shrink={0}>
        {account ? <SizableText size={rung.small} color={paint.mute}>{account}</SizableText> : null}
        {onLeave ? (
          <Button size="sm" variant="outline" rounded={round.pill} onPress={onLeave}>
            <SizableText size={rung.small} color={paint.ink} fontWeight="500">Sign out</SizableText>
          </Button>
        ) : null}
        <DesktopWindowControls />
      </XStack>
    </header>
  )
}

function LoginShell({
  slot,
  account,
  onLeave,
  children,
}: {
  slot?: string
  account?: string | null
  onLeave?: () => void
  children: ReactNode
}) {
  return (
    <Theme name="dark">
      <div className="dark t_dark" data-theme="dark" data-slot={slot} style={SHELL_STYLE}>
        <GateHeader account={account} onLeave={onLeave} />
        <main style={MAIN_STYLE}>{children}</main>
        <LoginFooter />
      </div>
    </Theme>
  )
}

export const Login = () => {
  const { standing, request } = useSession()
  if (standing === 'in') return null

  return (
    <LoginShell slot={isDesktopApp() ? 'desktop-signin' : 'signin'}>
      <HanzoTeamAppIcon size={64} />
      <SignInPanel
        bare
        title={`Sign in to Hanzo ${brand.title}`}
        line="Channels, issues, docs, and AI teammates in one workspace."
        request={request}
        termsHref={`${SITE}/terms`}
        privacyHref={`${SITE}/privacy`}
      />
    </LoginShell>
  )
}

const ENROL_TRIED = 'team.enrol_tried'
const safeGet = (k: string) => {
  try {
    return sessionStorage.getItem(k)
  } catch {
    return '1'
  }
}
const safeSet = (k: string, v: string | null) => {
  try {
    if (v === null) sessionStorage.removeItem(k)
    else sessionStorage.setItem(k, v)
  } catch {
    /* ignore */
  }
}

export const AuthGate = ({ children }: { children: ReactNode }) => {
  const { standing: session, who, depart, leave } = useSession()
  const { standing: space, refusal, enrolNow, enrolment } = useSpace()
  const [enrolling, setEnrolling] = useState(false)
  const [autoFallback, setAutoFallback] = useState(false)

  useEffect(() => {
    if (space === 'settled') {
      safeSet(ENROL_TRIED, null)
      setAutoFallback(false)
    }
  }, [space])

  useEffect(() => {
    if (session !== 'in' || space !== 'stranger') return
    if (safeGet(ENROL_TRIED) === '1') {
      setAutoFallback(true)
      return
    }
    safeSet(ENROL_TRIED, '1')
    setEnrolling(true)
    void enrolNow().then((ok) => {
      if (!ok && !navigator.webdriver) window.location.replace(enrolment)
      else {
        setEnrolling(false)
        if (!ok) setAutoFallback(true)
      }
    })
  }, [session, space, enrolNow, enrolment])

  if (window.location.pathname === CALLBACK) return <Callback />
  if (window.location.pathname === START) return <Forward to={cart(window.location.search, window.location.origin)} />
  if (session === 'unknown') return <Waiting />
  if (session === 'out') return <Login />

  const account = who?.email ?? who?.label ?? null
  const runEnrol = () => {
    safeSet(ENROL_TRIED, null)
    setEnrolling(true)
    void enrolNow().then((ok) => {
      if (!ok) window.location.assign(enrolment)
      else setEnrolling(false)
    })
  }

  if (space === 'stranger') {
    if (!autoFallback) return <Waiting account={account} onLeave={leave} />
    return (
      <Word
        title="Finish setting up Hanzo Team"
        body="Provision your Team workspace to open channels, issues, docs, and CRM."
        account={account}
        onLeave={leave}
      >
        <GateActions
          primaryLabel={enrolling ? 'Setting up…' : 'Set up workspace'}
          primaryDisabled={enrolling}
          onPrimary={runEnrol}
          onSwitch={() => void depart('another')}
        />
      </Word>
    )
  }

  if (space === 'refused') {
    return (
      <Word
        title="Your workspace is not answering"
        body={refusal?.message ?? 'Check your connection or try signing in again.'}
        account={account}
        onLeave={leave}
      >
        <GateActions
          primaryLabel="Try again"
          onPrimary={() => window.location.reload()}
          onSwitch={() => void depart('another')}
        />
      </Word>
    )
  }

  if (space === 'unknown') return <Waiting account={account} onLeave={leave} />
  return <>{children}</>
}

const GateActions = ({
  primaryLabel,
  primaryDisabled,
  onPrimary,
  onSwitch,
}: {
  primaryLabel: string
  primaryDisabled?: boolean
  onPrimary: () => void
  onSwitch: () => void
}) => (
  <XStack items="center" justify="center" gap={gap.tight} flexWrap="wrap" pt={gap.tight}>
    <Button disabled={primaryDisabled} rounded={round.pill} bg={paint.ink} onPress={onPrimary}>
      <SizableText size={rung.small} color={paint.ground} fontWeight="600">
        {primaryLabel}
      </SizableText>
    </Button>
    <Button variant="outline" rounded={round.pill} onPress={onSwitch}>
      <SizableText size={rung.small} color={paint.ink} fontWeight="500">
        Switch account
      </SizableText>
    </Button>
  </XStack>
)

const Forward = ({ to }: { to: string }) => {
  useEffect(() => window.location.replace(to), [to])
  return <Waiting />
}

const Waiting = ({ account, onLeave }: { account?: string | null; onLeave?: () => void }) => (
  <LoginShell slot="signin-waiting" account={account} onLeave={onLeave}>
    <YStack items="center" justify="center" gap={gap.tight}>
      <Spinner />
      <SizableText size={rung.body} color={paint.ink} fontWeight="500">
        {`Opening Hanzo ${brand.title}…`}
      </SizableText>
    </YStack>
  </LoginShell>
)

const Word = ({
  title,
  body,
  account,
  onLeave,
  children,
}: {
  title: string
  body: string
  account?: string | null
  onLeave?: () => void
  children: ReactNode
}) => (
  <LoginShell slot="signin-gate" account={account} onLeave={onLeave}>
    <HanzoTeamAppIcon size={64} />
    <YStack width="100%" items="center" gap={gap.inset} p={gap.wide} rounded={round.panel} bg={paint.panel} borderWidth={1} borderColor={paint.rule}>
      <SizableText size={rung.title} color={paint.ink} fontWeight="600" style={{ textAlign: 'center' }}>{title}</SizableText>
      {body ? <SizableText size={rung.body} color={paint.mute} style={{ textAlign: 'center' }}>{body}</SizableText> : null}
      {children}
    </YStack>
  </LoginShell>
)
