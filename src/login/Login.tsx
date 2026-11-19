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
import { TeamShowcase } from './TeamShowcase.tsx'
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
 * Unified un-zoomed 10px (`G = 10`) topological halftone wave + Blinn-Phong cursor gleam,
 * coherent with hanzo.ai, hanzo.app, hanzo.bot, and platform.hanzo.ai.
 */
function HeroDots() {
  const cvRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const cv = cvRef.current
    const host = cv?.parentElement
    if (!cv || !host) return
    const cx = cv.getContext('2d')
    if (!cx) return

    const G = 10
    const R = 255
    const Z_SCALE = 68
    const LIGHT_Z = 108
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let W = 0
    let H = 0
    let cols = 0
    let rows = 0
    let raf = 0
    let tx = -1e4
    let ty = -1e4
    let lx = -1e4
    let ly = -1e4
    let inside = false
    let energy = 0
    let boost = 0

    const ambientAlphas = [0.085, 0.155, 0.235]
    const gleamAlphas = [0.32, 0.44, 0.56, 0.68, 0.8, 0.92]
    const amb: number[][] = [[], [], []]
    const glm: number[][] = [[], [], [], [], [], []]

    const draw = () => {
      if (W < 1 || H < 1) return
      cx.clearRect(0, 0, W, H)
      cx.fillStyle = getComputedStyle(cv).color
      for (let b = 0; b < 3; b++) amb[b].length = 0
      for (let b = 0; b < 6; b++) glm[b].length = 0

      const gx1 = W * 0.18
      const gy1 = H * 0.58
      const gx2 = W * 0.82
      const gy2 = H * 0.48
      const invH = 1 / Math.max(1, H)
      const wLeft = Math.max(1, W * 0.3)
      const wRight = Math.max(1, W * 0.34)
      const lit = energy > 0.01 && lx > -5e3
      const r2Max = R * R

      for (let j = 0; j < rows; j++) {
        const y = j * G
        const rawEy = 0.28 + y * invH * 0.95
        const ey = rawEy < 1 ? rawEy : 1
        const dey = rawEy < 1 ? invH * 0.95 : 0

        for (let i = 0; i < cols; i++) {
          const x = i * G
          const leftRamp = 1 - x / wLeft
          const rightRamp = (x - W * 0.66) / wRight
          let ex = 0.14
          let dex = 0
          if (leftRamp >= rightRamp && leftRamp > 0.14) {
            ex = leftRamp
            dex = -1 / wLeft
          } else if (rightRamp > 0.14) {
            ex = rightRamp
            dex = 1 / wRight
          }

          const p1 = x * 0.012 + y * 0.006
          const p2 = y * 0.014 - x * 0.005
          const p3 = (x + y) * 0.007
          const w1 = Math.sin(p1)
          const c1 = Math.cos(p1)
          const w2 = Math.cos(p2)
          const s2 = Math.sin(p2)
          const w3 = Math.sin(p3)
          const c3 = Math.cos(p3)
          const wave = w1 * w2 * 0.65 + w3 * 0.35
          const dwx = 0.65 * (0.012 * c1 * w2 + w1 * 0.005 * s2) + 0.35 * 0.007 * c3
          const dwy = 0.65 * (0.006 * c1 * w2 - w1 * 0.014 * s2) + 0.35 * 0.007 * c3

          const n = 0.56 + 0.44 * wave
          let f = ex * ey * n * 1.24
          let dfx = (dex * ey * n + ex * ey * 0.44 * dwx) * 1.24
          let dfy = (ex * dey * n + ex * ey * 0.44 * dwy) * 1.24

          const dx1 = x - gx1
          const dy1 = y - gy1
          const d1Sq = dx1 * dx1 + dy1 * dy1
          if (d1Sq < 57600) {
            const d1 = Math.sqrt(d1Sq) || 1
            const k1 = 1 - d1 / 240
            f += k1 * k1 * 0.24
            const gSlope = (-0.48 * k1) / (240 * d1)
            dfx += gSlope * dx1
            dfy += gSlope * dy1
          }
          const dx2 = x - gx2
          const dy2 = y - gy2
          const d2Sq = dx2 * dx2 + dy2 * dy2
          if (d2Sq < 57600) {
            const d2 = Math.sqrt(d2Sq) || 1
            const k2 = 1 - d2 / 240
            f += k2 * k2 * 0.24
            const gSlope = (-0.48 * k2) / (240 * d2)
            dfx += gSlope * dx2
            dfy += gSlope * dy2
          }

          const z = f < 0 ? 0 : f > 1 ? 1 : f
          if (z < 0.05) continue

          const sx = -dfx * Z_SCALE
          const sy = -dfy * Z_SCALE
          const invN = 1 / Math.sqrt(sx * sx + sy * sy + 1)
          const nx = sx * invN
          const ny = sy * invN
          const nz = invN

          let drawX = x + nx * z * 2.4
          let drawY = y + ny * z * 2.4
          let r = z * G * 0.38
          let gleamBucket = -1

          if (lit) {
            const vx = lx - x
            const vy = ly - y
            const dSq = vx * vx + vy * vy
            if (dSq < r2Max) {
              const dist2 = Math.sqrt(dSq)
              const falloff = 1 - dist2 / R
              const atten = falloff * falloff * (3 - 2 * falloff)
              const vz = LIGHT_Z - z * 44
              const invL = 1 / Math.sqrt(dSq + vz * vz)
              const ldx = vx * invL
              const ldy = vy * invL
              const ldz = vz * invL
              const ndotl = Math.max(0, nx * ldx + ny * ldy + nz * ldz)
              const hzf = ldz + 1
              const invHalf = 1 / Math.sqrt(ldx * ldx + ldy * ldy + hzf * hzf)
              const ndoth = Math.max(0, (nx * ldx + ny * ldy + nz * hzf) * invHalf)
              const ndoth2 = ndoth * ndoth
              const ndoth4 = ndoth2 * ndoth2
              const spec = ndoth4 * ndoth4 * ndoth4
              const crestFactor = Math.max(0.06, Math.min(1, (wave + 0.72) * 0.68)) * (0.2 + 0.8 * z)
              const gleam = atten * energy * crestFactor * (0.42 * ndotl + 1.05 * spec)
              const reliefLift = gleam * (0.35 + 0.65 * z)
              r = Math.min(G * 0.48, r + reliefLift * G * 0.16)
              drawX -= (vx / R) * z * 2.2 * atten * energy
              drawY -= (vy / R) * z * 2.2 * atten * energy
              if (gleam > 0.07) gleamBucket = Math.min(5, Math.floor((gleam - 0.07) * 7.2))
            }
          }

          if (gleamBucket >= 0) glm[gleamBucket].push(drawX, drawY, r)
          else amb[z < 0.28 ? 0 : z < 0.56 ? 1 : 2].push(drawX, drawY, r)
        }
      }

      for (let b = 0; b < 3; b++) {
        const arr = amb[b]
        if (!arr.length) continue
        cx.globalAlpha = ambientAlphas[b]
        cx.beginPath()
        for (let k = 0; k < arr.length; k += 3) {
          const dx = arr[k]
          const dy = arr[k + 1]
          const dr = arr[k + 2]
          cx.moveTo(dx + dr, dy)
          cx.arc(dx, dy, dr, 0, 6.2832)
        }
        cx.fill()
      }
      for (let b = 0; b < 6; b++) {
        const arr = glm[b]
        if (!arr.length) continue
        cx.globalAlpha = gleamAlphas[b]
        cx.beginPath()
        for (let k = 0; k < arr.length; k += 3) {
          const dx = arr[k]
          const dy = arr[k + 1]
          const dr = arr[k + 2]
          cx.moveTo(dx + dr, dy)
          cx.arc(dx, dy, dr, 0, 6.2832)
        }
        cx.fill()
      }
      cx.globalAlpha = 1
    }

    const tick = () => {
      boost *= 0.9
      const target = inside ? Math.min(1, 0.72 + boost * 0.28) : 0
      energy += (target - energy) * (inside ? 0.18 : 0.08)
      if (lx < -5e3 && tx > -5e3) {
        lx = tx
        ly = ty
      } else if (tx > -5e3) {
        lx += (tx - lx) * 0.28
        ly += (ty - ly) * 0.28
      }
      draw()
      raf = energy > 0.01 || inside ? requestAnimationFrame(tick) : 0
    }

    const startLoop = () => {
      if (!raf && (energy > 0.01 || inside)) raf = requestAnimationFrame(tick)
    }

    const size = () => {
      const r = host.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = r.width
      H = r.height
      if (W < 1 || H < 1) return
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
      cv.style.width = `${W}px`
      cv.style.height = `${H}px`
      cx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.ceil(W / G) + 1
      rows = Math.ceil(H / G) + 1
      draw()
    }

    const move = (e: PointerEvent) => {
      if (calm || e.pointerType === 'touch') return
      const r = host.getBoundingClientRect()
      const nx = e.clientX - r.left
      const ny = e.clientY - r.top
      if (tx > -5e3) boost = Math.min(1.4, boost + Math.hypot(nx - tx, ny - ty) * 0.016)
      tx = nx
      ty = ny
      inside = true
      startLoop()
    }

    const leave = () => {
      inside = false
      startLoop()
    }

    size()
    const ro = new ResizeObserver(size)
    ro.observe(host)
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('mouseleave', leave, { passive: true })

    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('pointermove', move)
      document.removeEventListener('mouseleave', leave)
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

type Press = 'open'

export const Login = () => {
  const { standing, depart, request } = useSession()
  const [busy, setBusy] = useState<Press | null>(null)

  if (standing === 'in') return null

  const go = (press: Press, way: Way) => {
    setBusy(press)
    depart(way).catch(() => setBusy(null))
  }

  const working = busy !== null
  const label = (press: Press, idle: string) => (busy === press ? 'One moment…' : idle)

  return (
    <YStack flex={1} bg={paint.ground} overflow="scroll">
      {/* Top 68px Bar matching hanzo.ai, hanzo.app & hanzo.bot */}
      <XStack
        width="100%"
        minH={68}
        px={gap.wide}
        py={gap.tight}
        items="center"
        justify="space-between"
        borderBottomWidth={1}
        borderColor={paint.rule}
        bg={paint.ground}
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
          shrink={0}
          onPress={() => window.location.assign('/')}
        >
          <SizableText size={rung.row} color={paint.ink} fontWeight="600">
            {`Hanzo ${brand.title}`}
          </SizableText>
        </XStack>

        <XStack items="center" gap={gap.tight} shrink={0}>
          <div className="hz-landing-nav-links">
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
          </div>
          <Button
            size="sm"
            variant="outline"
            rounded={round.pill}
            onPress={() => window.location.assign('https://hanzo.ai/contact-sales')}
          >
            <SizableText size={rung.small} color={paint.ink} fontWeight="500">
              Contact sales
            </SizableText>
          </Button>
          <Button
            size="sm"
            rounded={round.pill}
            bg={paint.ink}
            disabled={working}
            onPress={() => go('open', 'login')}
          >
            <SizableText size={rung.small} color={paint.ground} fontWeight="600">
              {label('open', 'Open Team')}
            </SizableText>
          </Button>
        </XStack>
      </XStack>

      {/* First screen: Sign-in on left, Dual-Device Team Preview on right */}
      <main className="hz-signin">
        <HeroDots />
        <div className="hz-signin-row">
          <div className="hz-signin-copy">
            <SignInPanel
              bare
              title={`Sign in to Hanzo ${brand.title}`}
              line="AI cockpit, live streams, issue boards, channels, and bots for your team."
              request={request}
              termsHref={`${SITE}/terms`}
              privacyHref={`${SITE}/privacy`}
            />
            <XStack items="center" justify="center" pt={gap.tight}>
              <SizableText
                size={rung.small}
                color={paint.mute}
                cursor="pointer"
                onPress={() => window.location.assign(`${SITE}/team`)}
                style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}
              >
                Learn more about Hanzo Team →
              </SizableText>
            </XStack>
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
              }),
            )}
          </div>
        </div>
      </YStack>

      {/* Interactive Hanzo Team Showcase (ported from hanzo.ai/team) */}
      <TeamShowcase onOpen={() => go('open', 'login')} working={working} />

      {/* Shared Multi-Column Hanzo Footer matching platform.hanzo.ai & hanzo.ai */}
      <YStack
        width="100%"
        borderTopWidth={1}
        borderColor={paint.rule}
        bg={paint.ground}
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
                            cursor={link.href ? 'pointer' : undefined}
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

const ENROL_TRIED = 'team.enrol_tried'

/**
 * AuthGate wraps the router and renders the Login page when signed out,
 * handles `/auth/callback` and `/start`, and automatically provisions
 * workspace membership when signed in so users never hit a manual setup gate.
 */
export const AuthGate = ({ children }: { children: ReactNode }) => {
  const { standing: session, who, depart, leave } = useSession()
  const { standing: space, refusal, enrolNow, enrolment } = useSpace()
  const [enrolling, setEnrolling] = useState(false)
  const [autoFallback, setAutoFallback] = useState(false)

  useEffect(() => {
    if (space === 'settled') {
      try {
        sessionStorage.removeItem(ENROL_TRIED)
      } catch {
        /* ignore */
      }
      setAutoFallback(false)
    }
  }, [space])

  useEffect(() => {
    if (session !== 'in' || space !== 'stranger') return
    let alreadyTried = false
    try {
      alreadyTried = sessionStorage.getItem(ENROL_TRIED) === '1'
    } catch {
      alreadyTried = true
    }
    if (alreadyTried) {
      setAutoFallback(true)
      return
    }
    try {
      sessionStorage.setItem(ENROL_TRIED, '1')
    } catch {
      /* ignore */
    }
    setEnrolling(true)
    void enrolNow().then((ok) => {
      if (!ok) {
        if (!navigator.webdriver) {
          window.location.replace(enrolment)
        } else {
          setEnrolling(false)
          setAutoFallback(true)
        }
      } else {
        setEnrolling(false)
      }
    })
  }, [session, space, enrolNow, enrolment])

  if (window.location.pathname === CALLBACK) return <Callback />
  if (window.location.pathname === START) return <Forward to={cart(window.location.search, window.location.origin)} />
  if (session === 'unknown') return <Waiting />
  if (session === 'out') return <Login />

  const account = who?.email ?? who?.label ?? null
  const runEnrol = () => {
    try {
      sessionStorage.removeItem(ENROL_TRIED)
    } catch {
      /* ignore */
    }
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
        onOpen={runEnrol}
        working={enrolling}
      >
        <XStack items="center" justify="center" gap={gap.tight} flexWrap="wrap" pt={gap.tight}>
          <Button disabled={enrolling} rounded={round.pill} bg={paint.ink} onPress={runEnrol}>
            <SizableText size={rung.small} color={paint.ground} fontWeight="600">
              {enrolling ? 'Setting up…' : 'Set up workspace'}
            </SizableText>
          </Button>
          <Button
            variant="outline"
            rounded={round.pill}
            onPress={() => {
              void depart('another')
            }}
          >
            <SizableText size={rung.small} color={paint.ink} fontWeight="500">
              Switch account
            </SizableText>
          </Button>
        </XStack>
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
        onOpen={() => window.location.reload()}
        working={false}
      >
        <XStack items="center" justify="center" gap={gap.tight} flexWrap="wrap" pt={gap.tight}>
          <Button rounded={round.pill} bg={paint.ink} onPress={() => window.location.reload()}>
            <SizableText size={rung.small} color={paint.ground} fontWeight="600">
              Try again
            </SizableText>
          </Button>
          <Button
            variant="outline"
            rounded={round.pill}
            onPress={() => {
              void depart('another')
            }}
          >
            <SizableText size={rung.small} color={paint.ink} fontWeight="500">
              Switch account
            </SizableText>
          </Button>
        </XStack>
      </Word>
    )
  }

  if (space === 'unknown') return <Waiting account={account} onLeave={leave} />

  return <>{children}</>
}

const Forward = ({ to }: { to: string }) => {
  useEffect(() => window.location.replace(to), [to])
  return <Waiting />
}

const GateHeader = ({ account, onLeave }: { account?: string | null; onLeave?: () => void }) => {
  const productName = `Hanzo ${brand.title}`
  return (
    <XStack
      width="100%"
      minH={68}
      px={gap.wide}
      py={gap.tight}
      items="center"
      justify="space-between"
      borderBottomWidth={1}
      borderColor={paint.rule}
      bg={paint.ground}
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
        shrink={0}
        onPress={() => window.location.assign('/')}
      >
        <SizableText size={rung.row} color={paint.ink} fontWeight="600">
          {productName}
        </SizableText>
      </XStack>
      <XStack items="center" gap={gap.tight} shrink={0}>
        {account ? (
          <SizableText size={rung.small} color={paint.mute}>
            {account}
          </SizableText>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          rounded={round.pill}
          onPress={() => window.location.assign(`${SITE}/contact-sales`)}
        >
          <SizableText size={rung.small} color={paint.ink} fontWeight="500">
            Contact sales
          </SizableText>
        </Button>
        {onLeave ? (
          <Button size="sm" variant="outline" rounded={round.pill} onPress={onLeave}>
            <SizableText size={rung.small} color={paint.ink} fontWeight="500">
              Sign out
            </SizableText>
          </Button>
        ) : null}
      </XStack>
    </XStack>
  )
}

const Waiting = ({ account, onLeave }: { account?: string | null; onLeave?: () => void }) => (
  <YStack flex={1} minH="100vh" bg={paint.ground}>
    <GateHeader account={account} onLeave={onLeave} />
    <YStack flex={1} items="center" justify="center" gap={gap.tight}>
      <Spinner />
      <SizableText size={rung.body} color={paint.ink} fontWeight="500">
        {`Opening Hanzo ${brand.title}…`}
      </SizableText>
    </YStack>
  </YStack>
)

const Word = ({
  title,
  body,
  account,
  onLeave,
  onOpen,
  working,
  children,
}: {
  title: string
  body: string
  account?: string | null
  onLeave?: () => void
  onOpen: () => void
  working: boolean
  children: ReactNode
}) => (
  <YStack flex={1} bg={paint.ground} overflow="scroll">
    <GateHeader account={account} onLeave={onLeave} />
    <YStack width="100%" minH={540} items="center" justify="center" px={gap.wide} py={gap.wide}>
      <YStack
        width="100%"
        maxW={480}
        items="center"
        gap={gap.inset}
        p={gap.wide}
        rounded={round.panel}
        bg={paint.panel}
        borderWidth={1}
        borderColor={paint.rule}
      >
        <SizableText size={rung.title} color={paint.ink} fontWeight="600" style={{ textAlign: 'center' }}>
          {title}
        </SizableText>
        {body ? (
          <SizableText size={rung.body} color={paint.mute} style={{ textAlign: 'center' }}>
            {body}
          </SizableText>
        ) : null}
        {children}
      </YStack>
    </YStack>
    <TeamShowcase onOpen={onOpen} working={working} />
  </YStack>
)
