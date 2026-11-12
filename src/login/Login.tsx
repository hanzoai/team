import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, SizableText, Spinner, XStack, YStack } from '@hanzo/ui'
import { SignInPanel } from '@hanzo/ui/auth/panel'

import { type Way } from '~/data/away.ts'
import { brand } from '~/data/brand.ts'
import { useSession } from '~/data/session.tsx'
import { useSpace } from '~/data/space.tsx'
import { gap, paint, round, rung } from '~/theme/theme.ts'

import { Callback } from './Callback.tsx'
import { Points, Preview } from './Preview.tsx'
import { cart, START } from './start.ts'

/** Where the issuer returns a browser. Registered at IAM, so it is fixed. */
const CALLBACK = '/auth/callback'

const SITE = 'https://hanzo.ai'
const DOCS = 'https://docs.hanzo.ai'
const GITHUB = 'https://github.com/hanzoai'
const STATUS = 'https://status.hanzo.ai'
const AGENCY = 'https://hanzo.agency'
const UNIVERSITY = 'https://hanzo.university'

const HEADER_LINKS = [
  { label: 'Features', href: 'https://hanzo.ai/team' },
  { label: 'Docs', href: 'https://docs.hanzo.ai' },
  { label: 'Hanzo Bot', href: 'https://hanzo.bot' },
  { label: 'Hanzo App', href: 'https://hanzo.app' },
  { label: 'API Platform', href: 'https://platform.hanzo.ai' },
  { label: 'Hanzo AI', href: 'https://hanzo.ai' },
] as const

const CUSTOMERS = [
  { id: 'damon', name: 'Damon Motorcycles', logo: '/logos/customers/damon-motorcycles.svg', href: `${SITE}/customers/damon-motorcycles` },
  { id: 'kanoa', name: 'KANOA', logo: '/logos/customers/kanoa.png', href: `${SITE}/customers/kanoa` },
  { id: 'skully', name: 'SKULLY', logo: '/logos/customers/skully.png', href: `${SITE}/customers#skully` },
  { id: 'bellabeat', name: 'Bellabeat', logo: '/logos/customers/bellabeat.svg', href: `${SITE}/customers#bellabeat` },
  { id: 'stoned', name: 'STONED Audio', logo: '/logos/customers/stoned.svg', href: `${SITE}/customers#stoned` },
  { id: 'unikrn', name: 'Unikrn', logo: '/logos/customers/unikoin-gold.svg', href: `${SITE}/customers#unikoin-gold` },
  { id: 'arca', name: 'Arca', logo: '/logos/customers/arca.png', href: `${SITE}/customers#arca` },
  { id: 'casper', name: 'Casper Labs', logo: '/logos/customers/casper-blockchain.svg', href: `${SITE}/customers#casper-blockchain` },
  { id: 'triller', name: 'Triller', logo: '/logos/customers/trillerfest.png', href: `${SITE}/customers#trillerfest` },
  { id: 'cover', name: 'Cover Build', logo: '/logos/customers/cover-build.svg', href: `${SITE}/customers#cover-build` },
  { id: 'myle', name: 'Myle Tap', logo: '/logos/customers/myle-tap.png', href: `${SITE}/customers#myle-tap` },
  { id: 'keek', name: 'Personas Social', logo: '/logos/customers/keek-social.svg', href: `${SITE}/customers#keek-social` },
] as const

interface FooterLink {
  label: string
  href: string
}

interface FooterGroup {
  title: string
  href?: string
  links: readonly FooterLink[]
}

const FOOTER_COLUMNS: readonly (readonly FooterGroup[])[] = [
  [
    {
      title: 'Products',
      href: `${SITE}/products`,
      links: [
        { label: 'Hanzo App', href: 'https://hanzo.app' },
        { label: 'Hanzo Dev', href: `${SITE}/dev` },
        { label: 'Hanzo Bot', href: 'https://hanzo.bot' },
        { label: 'Hanzo Team', href: 'https://hanzo.team' },
        { label: 'Hanzo Science', href: `${SITE}/science` },
        { label: 'Hanzo Security', href: `${SITE}/security` },
        { label: 'Download app', href: `${SITE}/download` },
        { label: 'Pricing', href: `${SITE}/pricing` },
        { label: 'Log in', href: '/login' },
      ],
    },
    {
      title: 'Capabilities',
      links: [
        { label: 'Hanzo Design', href: `${SITE}/design` },
        { label: 'MCP', href: `${SITE}/mcp` },
        { label: 'Skills', href: `${SITE}/skills` },
        { label: 'Integrations', href: `${SITE}/integrations` },
        { label: 'Hanzo CLI', href: `${SITE}/cli` },
      ],
    },
    {
      title: 'Extensions',
      links: [
        { label: 'Hanzo in Chrome', href: `${SITE}/extension` },
        { label: 'Desktop app', href: `${SITE}/desktop` },
        { label: 'Hanzo IDE', href: `${SITE}/ide` },
      ],
    },
    {
      title: 'Models',
      href: `${SITE}/models`,
      links: [
        { label: 'All models', href: `${SITE}/models` },
        { label: 'Zen', href: `${SITE}/zen` },
        { label: 'Enso', href: `${SITE}/enso` },
        { label: 'Kai', href: `${SITE}/kai` },
        { label: 'Video · Koma', href: `${SITE}/koma` },
        { label: 'Images · Iro', href: `${SITE}/iro` },
        { label: '3D · Mori', href: `${SITE}/mori` },
        { label: 'Voice · Koe', href: `${SITE}/koe` },
        { label: 'Benchmarks', href: `${SITE}/benchmarks` },
      ],
    },
  ],
  [
    {
      title: 'Enterprise',
      href: `${SITE}/enterprise`,
      links: [
        { label: 'Overview', href: `${SITE}/enterprise` },
        { label: 'All solutions', href: `${SITE}/solutions` },
        { label: 'Customer stories', href: `${SITE}/customers` },
        { label: 'Contact sales', href: `${SITE}/contact-sales` },
      ],
    },
    {
      title: 'Teams',
      href: `${SITE}/solutions`,
      links: [
        { label: 'Engineering', href: `${SITE}/solutions/engineering` },
        { label: 'Operations', href: `${SITE}/solutions/operations` },
        { label: 'Finance', href: `${SITE}/solutions/finance` },
        { label: 'Data', href: `${SITE}/solutions/data` },
        { label: 'Sales', href: `${SITE}/solutions/sales` },
        { label: 'Marketing', href: `${SITE}/solutions/marketing` },
        { label: 'Design', href: `${SITE}/solutions/design` },
      ],
    },
    {
      title: 'Industries',
      href: `${SITE}/solutions`,
      links: [
        { label: 'Cybersecurity', href: `${SITE}/solutions/cybersecurity` },
        { label: 'Financial services', href: `${SITE}/solutions/financial-services` },
        { label: 'Government', href: `${SITE}/solutions/government` },
        { label: 'Healthcare', href: `${SITE}/solutions/healthcare` },
        { label: 'Education', href: `${SITE}/solutions/education` },
        { label: 'Law', href: `${SITE}/solutions/law` },
        { label: 'Retail', href: `${SITE}/solutions/retail` },
      ],
    },
    {
      title: 'Programs',
      href: `${SITE}/startups`,
      links: [
        { label: 'Startups', href: `${SITE}/startups` },
        { label: 'Affiliate program', href: `${SITE}/affiliate` },
        { label: 'Referral program', href: `${SITE}/referral` },
        { label: 'Reserved tier', href: `${SITE}/solutions/reserved` },
        { label: 'OSS grants', href: `${SITE}/open-source` },
      ],
    },
  ],
  [
    {
      title: 'Developers',
      href: DOCS,
      links: [
        { label: 'Developer docs', href: DOCS },
        { label: 'API reference', href: `${DOCS}/docs/openapi/` },
        { label: 'Quickstart', href: `${DOCS}/docs/quickstart/` },
        { label: 'SDKs', href: `${SITE}/sdks` },
        { label: 'Console', href: 'https://platform.hanzo.ai' },
        { label: 'GitHub', href: GITHUB },
      ],
    },
    {
      title: 'API Platform',
      href: `${SITE}/platform`,
      links: [
        { label: 'Overview', href: `${SITE}/platform` },
        { label: 'API keys', href: 'https://platform.hanzo.ai/settings/organization/keys' },
        { label: 'Gateway', href: `${SITE}/gateway` },
        { label: 'Agents', href: `${SITE}/agents` },
        { label: 'Playground', href: `${SITE}/playground` },
      ],
    },
    {
      title: 'Cloud',
      href: `${SITE}/products`,
      links: [
        { label: 'Base', href: `${SITE}/base` },
        { label: 'Machines', href: `${SITE}/machines` },
        { label: 'Search', href: `${SITE}/search` },
        { label: 'Datastore', href: `${SITE}/datastore` },
        { label: 'Memory', href: `${SITE}/products/memory` },
        { label: 'Realtime', href: `${SITE}/realtime` },
        { label: 'Observability', href: `${SITE}/o11y` },
        { label: 'Insights', href: `${SITE}/insights` },
        { label: 'Commerce', href: `${SITE}/commerce` },
      ],
    },
    {
      title: 'Help and security',
      links: [
        { label: 'Availability', href: STATUS },
        { label: 'Help center', href: `${SITE}/support` },
        { label: 'Security and compliance', href: `${SITE}/security` },
        { label: 'Trust & transparency', href: `${SITE}/trust` },
      ],
    },
  ],
  [
    {
      title: 'Company',
      href: `${SITE}/about`,
      links: [
        { label: 'Hanzo AI', href: `${SITE}/about` },
        { label: 'Careers', href: `${SITE}/careers` },
        { label: 'Philosophy', href: `${SITE}/philosophy` },
        { label: 'Research', href: `${SITE}/research` },
        { label: 'News', href: `${SITE}/press` },
        { label: 'Investors', href: `${SITE}/investors` },
        { label: 'Brand', href: `${SITE}/brand` },
        { label: 'Open source', href: `${SITE}/open-source` },
        { label: 'Contact', href: `${SITE}/contact` },
      ],
    },
    {
      title: 'Resources',
      href: `${SITE}/learn`,
      links: [
        { label: 'Blog', href: `${SITE}/blog` },
        { label: 'Guides', href: `${DOCS}/docs/guides/` },
        { label: 'Cookbook', href: `${DOCS}/docs/guides/cookbook/` },
        { label: 'Hanzo University', href: UNIVERSITY },
        { label: 'Hanzo Agency', href: AGENCY },
        { label: 'Cost calculator', href: `${SITE}/calculator` },
      ],
    },
    {
      title: 'Terms and policies',
      href: `${SITE}/legal`,
      links: [
        { label: 'Privacy choices', href: `${SITE}/privacy#choices` },
        { label: 'Privacy policy', href: `${SITE}/privacy` },
        { label: 'Terms of service', href: `${SITE}/terms` },
        { label: 'Usage policy', href: `${SITE}/aup` },
        { label: 'Cookie policy', href: `${SITE}/cookies` },
        { label: 'Other policies', href: `${SITE}/legal` },
      ],
    },
  ],
] as const

const SOCIALS = [
  { label: 'Discord', href: 'https://discord.gg/XthHQQj' },
  { label: 'Telegram', href: 'https://t.me/hanzoai' },
  { label: 'X', href: 'https://x.com/hanzoai' },
  { label: 'GitHub', href: 'https://github.com/hanzoai' },
  { label: 'LinkedIn', href: 'https://linkedin.com/company/hanzo-ai' },
  { label: 'Facebook', href: 'https://facebook.com/hanzoinc' },
  { label: 'Bluesky', href: 'https://bsky.app/profile/hanzoai.bsky.social' },
  { label: 'Reddit', href: 'https://www.reddit.com/r/HanzoAI/' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@hanzoinc' },
  { label: 'Instagram', href: 'https://www.instagram.com/hanzoinc' },
] as const

/**
 * Interactive halftone dot-field with ambient organic wave + pointer lens swell.
 */
function HeroDots() {
  const cvRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const cv = cvRef.current
    const host = cv?.parentElement
    if (!cv || !host) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    const STEP = 14
    const LENS = 190
    const LENS2 = LENS * LENS
    const LERP = 0.14
    let w = 0
    let h = 0
    let dpr = 1
    let raf = 0
    const cur = { x: -9999, y: -9999 }
    const tgt = { x: -9999, y: -9999 }

    const measure = () => {
      const r = host.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = r.width
      h = r.height
      cv.width = Math.max(1, Math.round(w * dpr))
      cv.height = Math.max(1, Math.round(h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (ts: number) => {
      const t = (ts || 0) * 0.001
      ctx.clearRect(0, 0, w, h)
      // The scheme's ink, read off the canvas (its `color` is the foreground
      // token), so the field is light dots on the dark ground and dark on the light.
      ctx.fillStyle = getComputedStyle(cv).color
      const cols = Math.ceil(w / STEP)
      const rows = Math.ceil(h / STEP)
      const ox = (w - (cols - 1) * STEP) * 0.5
      const oy = (h - (rows - 1) * STEP) * 0.5
      const cx = w * 0.5
      const cy = h * 0.45
      const rx = w * 0.56
      const ry = h * 0.58
      const px = cur.x
      const py = cur.y
      const hasPtr = px > -999

      const w1x = w * (0.5 + 0.28 * Math.cos(t * 0.42))
      const w1y = h * (0.45 + 0.22 * Math.sin(t * 0.31))
      const w2x = w * (0.5 + 0.32 * Math.sin(t * 0.27 + 1.8))
      const w2y = h * (0.48 + 0.24 * Math.cos(t * 0.36 + 0.9))
      const wellR2 = Math.max(w, h) * 0.28
      const invWell = 1 / (wellR2 * wellR2)

      for (let r = 0; r < rows; r++) {
        const y = oy + r * STEP
        const ny = (y - cy) / ry
        for (let c = 0; c < cols; c++) {
          const x = ox + c * STEP
          const nx = (x - cx) / rx
          const d = Math.hypot(nx, ny)
          const edge = Math.max(0, Math.min(1, (d - 0.16) / 0.88))
          const vig = Math.max(0, 1 - Math.max(0, d - 0.72) * 1.45)

          const wave =
            0.5 +
            0.5 *
              Math.sin(c * 0.18 + r * 0.14 - t * 1.15 + Math.cos(c * 0.09 - r * 0.11 + t * 0.65) * 1.3)
          const d1 = (x - w1x) * (x - w1x) + (y - w1y) * (y - w1y)
          const d2 = (x - w2x) * (x - w2x) + (y - w2y) * (y - w2y)
          const well = Math.exp(-d1 * invWell) * 0.65 + Math.exp(-d2 * invWell) * 0.55

          let rad = (0.7 + edge * 2.1 + wave * 0.42 + well * 0.95) * (0.45 + vig * 0.55)
          let a = (0.045 + edge * 0.18 + wave * 0.035 + well * 0.11) * vig

          if (hasPtr) {
            const dx = x - px
            const dy = y - py
            const d2p = dx * dx + dy * dy
            if (d2p < LENS2) {
              const k = 1 - Math.sqrt(d2p) / LENS
              const s = k * k * (3 - 2 * k)
              rad += s * 1.9
              a = Math.min(0.68, a + s * 0.34)
            }
          }
          if (a < 0.01 || rad < 0.3) continue
          ctx.globalAlpha = a
          ctx.beginPath()
          ctx.arc(x, y, rad, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
    }

    const step = (ts: number) => {
      cur.x += (tgt.x - cur.x) * LERP
      cur.y += (tgt.y - cur.y) * LERP
      draw(ts)
      raf = requestAnimationFrame(step)
    }

    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect()
      tgt.x = e.clientX - r.left
      tgt.y = e.clientY - r.top
      if (cur.x < -999) {
        cur.x = tgt.x
        cur.y = tgt.y
      }
    }

    const onLeave = () => {
      tgt.x = -9999
      tgt.y = -9999
    }

    measure()
    raf = requestAnimationFrame(step)
    const ro = new ResizeObserver(() => measure())
    ro.observe(host)
    host.addEventListener('pointermove', onMove, { passive: true })
    host.addEventListener('pointerleave', onLeave, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <canvas
      ref={cvRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        color: 'var(--foreground)',
      }}
    />
  )
}

/** Which control was pressed, so that one says it is working while the browser leaves. */
type Press = 'nav' | 'open'

/**
 * The signed-out page for Hanzo Team (`hanzo.team`), in hanzo.app's shape
 * (hanzo-inc/app components/chat/ChatLanding.tsx): the top bar, then a first
 * screen with the sign-in on the left (title, one line, the panel, the terms)
 * and a picture of Team on the right with three lines about it, stacked into
 * one column under 1280px; then the customer logo strip and the shared footer.
 *
 * Every signed-out visit lands here, the page a sign-out returns to included,
 * and nothing leaves by itself. The panel LOOKS like a sign-in and takes no
 * credential: it is @hanzo/ui/auth's `SignInPanel`, the one every Hanzo site
 * draws, and each press leaves with this app's own request (`request`): Google
 * or GitHub straight to the provider in one press, an email to hanzo.ai/login
 * with the address, a new account to /signup. The person comes back signed in
 * on /auth/callback. A password typed here would start a session only this
 * host knows, which is the one thing this page exists not to do.
 */
export const Login = () => {
  const { standing, depart, request } = useSession()
  const [busy, setBusy] = useState<Press | null>(null)

  if (standing === 'in') return null

  // Settles only when the request could not be made; otherwise the page is gone.
  const go = (press: Press, way: Way) => {
    setBusy(press)
    depart(way).catch(() => setBusy(null))
  }

  const working = busy !== null
  const label = (press: Press, idle: string) => (busy === press ? 'One moment…' : idle)

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
          <Button size="sm" chromeless rounded={round.field} disabled={working} onPress={() => go('nav', 'login')}>
            <SizableText size={rung.small} color={paint.ink}>
              Log in
            </SizableText>
          </Button>
          <Button size="sm" rounded={round.field} disabled={working} onPress={() => go('open', 'login')}>
            <SizableText size={rung.small} color={paint.ink} fontWeight="600">
              {label('open', 'Open Hanzo Team')}
            </SizableText>
          </Button>
        </XStack>
      </XStack>

      {/* The first screen, as hanzo.app's: the sign-in on the left, Team on the right (tokens.css `.hz-signin`). */}
      <main className="hz-signin">
        <HeroDots />
        <div className="hz-signin-row">
          <div className="hz-signin-copy">
            <SignInPanel
              title={`Sign in to Hanzo ${brand.title}`}
              line="AI cockpit, live streams, issue boards, channels, and bots for your team."
              request={request}
              termsHref={`${SITE}/terms`}
              privacyHref={`${SITE}/privacy`}
            />
          </div>

          <div className="hz-signin-figure">
            <Preview />
            <Points />
          </div>
        </div>
      </main>

      {/* Companies building with the Hanzo API — Animated Marquee Scroller */}
      <YStack
        width="100%"
        items="center"
        px={gap.wide}
        py={gap.edge}
        gap={gap.inset}
        bg={paint.ground}
      >
        <SizableText
          size={rung.small}
          color={paint.mute}
          fontWeight="500"
          style={{ textAlign: 'center' }}
        >
          Companies building with the Hanzo API
        </SizableText>

        <div className="hz-mq-view">
          <div className="hz-mq-track">
            {[0, 1].map((copy) =>
              CUSTOMERS.map((company) => {
                const hidden = copy > 0
                return (
                  <a
                    key={`${copy}-${company.id}`}
                    href={company.href}
                    className="hz-logo"
                    aria-label={hidden ? undefined : company.name}
                    aria-hidden={hidden || undefined}
                    tabIndex={hidden ? -1 : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={company.name}
                  >
                    <img src={company.logo} alt={hidden ? '' : company.name} loading="lazy" />
                  </a>
                )
              })
            )}
          </div>
        </div>
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
        <YStack width="100%" maxW={1240} mx="auto" gap={gap.edge}>
          <XStack justify="space-between" items="flex-start" gap={gap.edge} flexWrap="wrap">
            <YStack minW={160} gap={gap.tight}>
              <XStack
                items="center"
                gap={gap.tight}
                cursor="pointer"
                onPress={() => window.location.assign(SITE)}
              >
                <YStack
                  width={22}
                  height={22}
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
                  Hanzo
                </SizableText>
              </XStack>
            </YStack>

            <XStack gap={gap.edge} flexWrap="wrap" grow={1} justify="space-between">
              {FOOTER_COLUMNS.map((col, idx) => (
                <YStack key={idx} minW={150} gap={gap.inset}>
                  {col.map((group) => (
                    <YStack key={group.title} gap={gap.tight}>
                      <SizableText
                        size={rung.small}
                        color={paint.ink}
                        fontWeight="600"
                        cursor={group.href ? 'pointer' : undefined}
                        onPress={group.href ? () => window.location.assign(group.href!) : undefined}
                        style={{ lineHeight: '1.35' }}
                      >
                        {group.title}
                      </SizableText>
                      <YStack style={{ gap: '2.5px' }}>
                        {group.links.map((link) => (
                          <SizableText
                            key={link.href + link.label}
                            size={rung.small}
                            color={paint.mute}
                            cursor="pointer"
                            onPress={() => window.location.assign(link.href)}
                            style={{ lineHeight: '1.32' }}
                          >
                            {link.label}
                          </SizableText>
                        ))}
                      </YStack>
                    </YStack>
                  ))}
                </YStack>
              ))}
            </XStack>
          </XStack>

          {/* Social Links Row */}
          <XStack
            pt={gap.inset}
            borderTopWidth={1}
            borderColor={paint.rule}
            items="center"
            flexWrap="wrap"
            style={{ columnGap: '24px', rowGap: '8px' }}
          >
            {SOCIALS.map((s) => (
              <SizableText
                key={s.label}
                size={rung.small}
                color={paint.mute}
                cursor="pointer"
                onPress={() => window.location.assign(s.href)}
                style={{ lineHeight: '1.35' }}
              >
                {s.label} ↗
              </SizableText>
            ))}
          </XStack>

          {/* Copyright & Terms/Policies Row */}
          <XStack
            pt={gap.inset}
            borderTopWidth={1}
            borderColor={paint.rule}
            items="center"
            justify="space-between"
            flexWrap="wrap"
            gap={gap.tight}
          >
            <SizableText size={rung.chip} color={paint.dim}>
              © 2026 Hanzo AI, Inc. All rights reserved.
            </SizableText>
            <XStack gap={gap.inset} flexWrap="wrap">
              {[
                ['Terms', `${SITE}/terms`],
                ['Privacy', `${SITE}/privacy`],
                ['Usage policy', `${SITE}/aup`],
                ['Privacy choices', `${SITE}/privacy#choices`],
              ].map(([label, href]) => (
                <SizableText
                  key={label}
                  size={rung.chip}
                  color={paint.dim}
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
  if (session === 'unknown') return <Waiting />
  if (session === 'out') return <Login />

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
