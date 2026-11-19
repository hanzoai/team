import { useEffect, useRef, useState } from 'react'
import { SizableText, XStack, YStack } from '@hanzo/ui'
import {
  AlertCircle,
  ArrowUp,
  Bell,
  Bot,
  Check,
  FileText,
  GitPullRequest,
  Hash,
  MessageSquare,
  PanelLeft,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  SquareCheck,
  Wifi,
} from '@hanzogui/lucide-icons-2'

import { gap, paint, rung } from '~/theme/theme.ts'

type SceneId = 0 | 1 | 2

const DESK_TABS: readonly { id: string; label: string; scene: SceneId }[] = [
  { id: 'chat', label: 'Chat', scene: 0 },
  { id: 'projects', label: 'Projects', scene: 1 },
  { id: 'tasks', label: 'Tasks', scene: 1 },
  { id: 'crm', label: 'CRM', scene: 2 },
  { id: 'docs', label: 'Docs', scene: 2 },
]

const CHANNELS = ['bugfix', 'engineering', 'launch', 'security', 'ops'] as const
const PR_TAG = `${'PR #'}${'418'}`

const SIDEBAR_AGENTS: readonly { name: string; role: string; hue: string }[] = [
  { name: 'Dev', role: PR_TAG, hue: 'var(--pv-blue)' },
  { name: 'Sci', role: '42/42 E2E', hue: 'var(--pv-green)' },
  { name: 'Mark', role: 'v2.4.1', hue: 'var(--pv-amber)' },
  { name: 'Opera', role: 'us-west', hue: 'var(--pv-violet)' },
]

const OPS_FLEET: readonly {
  name: string
  domain: string
  sandbox: string
  task: string
  badge: string
  hue: string
}[] = [
  {
    name: 'Dev',
    domain: 'Engineering',
    sandbox: 'sbx-eng-01',
    task: `Merged ${PR_TAG} · release PaySheet lock`,
    badge: '+14 −3',
    hue: 'var(--pv-blue)',
  },
  {
    name: 'Sci',
    domain: 'QA & Eval',
    sandbox: 'sbx-webkit-02',
    task: 'iOS 18.2 Safari checkout suite green',
    badge: '42/42 PASS',
    hue: 'var(--pv-green)',
  },
  {
    name: 'Cyber',
    domain: 'Security',
    sandbox: 'sbx-sec-03',
    task: 'Diff & webhook signature audit clean',
    badge: '0 CVEs',
    hue: 'var(--pv-rose)',
  },
  {
    name: 'Mark',
    domain: 'Growth',
    sandbox: 'sbx-mkt-04',
    task: 'Drafted release note for #launch',
    badge: 'READY',
    hue: 'var(--pv-amber)',
  },
  {
    name: 'Opera',
    domain: 'Infra & SRE',
    sandbox: 'sbx-sre-05',
    task: 'Canary rollout 100% healthy · 18ms p95',
    badge: 'LIVE',
    hue: 'var(--pv-violet)',
  },
  {
    name: 'Fin',
    domain: 'Revenue Ops',
    sandbox: 'sbx-fin-06',
    task: 'Apple Pay settlement ledger reconciled',
    badge: '$0 DRIFT',
    hue: 'var(--pv-green)',
  },
]

const SCENE_META: readonly { id: SceneId; label: string; short: string }[] = [
  { id: 0, label: 'Chat · #engineering', short: 'Chat' },
  { id: 1, label: 'Projects · Board', short: 'Projects' },
  { id: 2, label: 'Agents · Live Ops', short: 'Live Ops' },
]

function ProgressRingSvg({ pct, color }: { pct: number; color: string }) {
  const r = 6
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.max(0, Math.min(100, pct)) / 100)
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
      <circle cx="8" cy="8" r={r} fill="none" stroke="var(--pv-rule-strong)" strokeWidth="2" />
      <circle
        cx="8"
        cy="8"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.55s ease' }}
      />
    </svg>
  )
}

function AgentCursor({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <div
      className="hz-pv-cursor"
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
      }}
    >
      <svg width="13" height="15" viewBox="0 0 14 16" fill="none">
        <path
          d="M1.5 1.2L12.4 7.1L7.3 8.6L4.9 13.7L1.5 1.2Z"
          fill="var(--pv-ink)"
          stroke="var(--pv-bar)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
      <span className="hz-pv-cursor-tag">{label}</span>
    </div>
  )
}

export const Preview = () => {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [hostW, setHostW] = useState(680)
  const [scene, setScene] = useState<SceneId>(0)
  const [step, setStep] = useState(2)
  const [channel, setChannel] = useState<string>('engineering')
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const update = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setHostW(w)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (paused) return
    const timer = window.setInterval(() => {
      setStep((prev) => {
        if (prev < 3) return prev + 1
        setScene((s) => ((s + 1) % 3) as SceneId)
        return 0
      })
    }, 1650)
    return () => window.clearInterval(timer)
  }, [paused])

  const selectScene = (next: SceneId) => {
    setScene(next)
    setStep(2)
  }

  // Responsive stage geometry:
  // >= 540px: 640x400 coordinate stage (540x338 16:9 desktop + 184x348 9:16 iPhone)
  // < 540px:  500x336 compact dual-device stage so both Desktop + Mobile stay sharp on phones
  const wide = hostW >= 540
  const stageW = wide ? 640 : 500
  const stageH = wide ? 400 : 336
  const deskW = wide ? 540 : 412
  const deskH = wide ? 338 : 284
  const phoneW = wide ? 184 : 156
  const phoneH = wide ? 348 : 292
  const scale = Math.max(0.45, Math.min(1.16, hostW / stageW))
  const scaledH = Math.round(stageH * scale)

  // Named cursor choreography per scene & step (kept inside uncovered desktop bounds)
  const cursor =
    scene === 0
      ? step === 0
        ? { x: wide ? 248 : 124, y: 108, label: '◆ Dev' }
        : step === 1
          ? { x: wide ? 316 : 186, y: 184, label: '◆ Dev' }
          : step === 2
            ? { x: wide ? 298 : 174, y: 238, label: '◆ Sci' }
            : { x: wide ? 344 : 196, y: deskH - 28, label: '◆ Zoe' }
      : scene === 1
        ? step <= 1
          ? { x: wide ? 336 : 188, y: 158, label: '◆ Dev' }
          : { x: wide ? 378 : 218, y: 132, label: '◆ Dev' }
        : {
            x: (wide ? 204 : 84) + (step % 3) * (wide ? 82 : 68),
            y: step < 2 ? 126 : 212,
            label: step % 2 === 0 ? '◆ Opera' : '◆ Sci',
          }

  const cardMoved = scene === 1 && step >= 2
  const sprintPct = scene === 1 ? (step === 0 ? 76 : step === 1 ? 84 : step === 2 ? 94 : 100) : 94

  return (
    <div
      style={{ width: '100%', maxWidth: 740 }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <div ref={hostRef} className="hz-pv-host" style={{ height: scaledH }}>
        <div
          className="hz-pv-stage"
          style={{
            width: stageW,
            height: stageH,
            transform: `scale(${scale})`,
          }}
        >
          {/* ── 16:9 DESKTOP HANZO.TEAM WORKSPACE WINDOW ─────────────────────── */}
          <div className="hz-pv-desk" style={{ width: deskW, height: deskH }}>
            {/* Top 34px Unified Chrome Bar */}
            <div className="hz-pv-topbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div className="hz-pv-traffic">
                  <span className="hz-pv-dot" style={{ background: 'var(--pv-dot-red)' }} />
                  <span className="hz-pv-dot" style={{ background: 'var(--pv-dot-yellow)' }} />
                  <span className="hz-pv-dot" style={{ background: 'var(--pv-dot-green)' }} />
                </div>
                <span style={{ color: 'var(--pv-mute)', display: 'inline-flex' }}>
                  <PanelLeft size={12} color="var(--pv-mute)" />
                </span>
                <span className="hz-pv-pill">
                  <span className="hz-pv-live-dot" />
                  <span>hanzo.team</span>
                </span>
              </div>

              <div className="hz-pv-tabs" role="tablist" aria-label="Hanzo Team preview surfaces">
                {(wide ? DESK_TABS : DESK_TABS.slice(0, 4)).map((t) => {
                  const active =
                    (t.id === 'chat' && scene === 0) ||
                    (t.id === 'projects' && scene === 1) ||
                    (t.id === 'crm' && scene === 2)
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className="hz-pv-tab"
                      data-active={active ? 'true' : 'false'}
                      onClick={() => selectScene(t.scene)}
                    >
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Body: 36px Icon Rail + 124px Workspace Sidebar + Fluid Scene Canvas */}
            <div className="hz-pv-body">
              {/* Left 36px Icon Rail */}
              <div className="hz-pv-rail">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <button
                    type="button"
                    aria-label="Hanzo AI organization"
                    onClick={() => selectScene(0)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      border: 0,
                      background: 'var(--pv-ink)',
                      color: 'var(--pv-bar)',
                      fontSize: 10,
                      fontWeight: 800,
                      cursor: 'pointer',
                      marginBottom: 2,
                    }}
                  >
                    H
                  </button>
                  <button
                    type="button"
                    aria-label="Chat channels"
                    className="hz-pv-rail-btn"
                    data-active={scene === 0 ? 'true' : 'false'}
                    onClick={() => selectScene(0)}
                  >
                    <MessageSquare size={13} color={scene === 0 ? 'var(--pv-ink)' : 'var(--pv-mute)'} />
                  </button>
                  <button
                    type="button"
                    aria-label="Project boards"
                    className="hz-pv-rail-btn"
                    data-active={scene === 1 ? 'true' : 'false'}
                    onClick={() => selectScene(1)}
                  >
                    <SquareCheck size={13} color={scene === 1 ? 'var(--pv-ink)' : 'var(--pv-mute)'} />
                  </button>
                  <button
                    type="button"
                    aria-label="Activity inbox"
                    className="hz-pv-rail-btn"
                    data-active="false"
                    onClick={() => selectScene(0)}
                  >
                    <Bell size={13} color="var(--pv-mute)" />
                  </button>
                  <button
                    type="button"
                    aria-label="Workspace docs"
                    className="hz-pv-rail-btn"
                    data-active="false"
                    onClick={() => selectScene(1)}
                  >
                    <FileText size={13} color="var(--pv-mute)" />
                  </button>
                  <button
                    type="button"
                    aria-label="AI Teammates"
                    className="hz-pv-rail-btn"
                    data-active={scene === 2 ? 'true' : 'false'}
                    onClick={() => selectScene(2)}
                  >
                    <Bot size={13} color={scene === 2 ? 'var(--pv-ink)' : 'var(--pv-mute)'} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <span className="hz-pv-rail-btn" aria-hidden="true">
                    <Settings size={12} color="var(--pv-mute)" />
                  </span>
                  <div
                    style={{
                      position: 'relative',
                      width: 20,
                      height: 20,
                      borderRadius: 999,
                      background: 'var(--pv-send)',
                      color: 'var(--pv-ink)',
                      fontSize: 8,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ZK
                    <span
                      style={{
                        position: 'absolute',
                        right: -1,
                        bottom: -1,
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background: 'var(--pv-green)',
                        border: '1.5px solid var(--pv-rail)',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 124px Workspace Sidebar (Channels + Live Teammates) */}
              {wide ? (
                <div className="hz-pv-sidebar">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div className="hz-pv-sec-head">Channels</div>
                    {CHANNELS.map((ch) => {
                      const isHere = scene === 0 && channel === ch
                      return (
                        <button
                          key={ch}
                          type="button"
                          className="hz-pv-nav-row"
                          data-active={isHere ? 'true' : 'false'}
                          onClick={() => {
                            setChannel(ch)
                            selectScene(0)
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                            <Hash size={10} color={isHere ? 'var(--pv-ink)' : 'var(--pv-mute)'} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ch}
                            </span>
                          </span>
                          {ch === 'engineering' ? (
                            <span
                              style={{
                                fontSize: 7.5,
                                fontWeight: 700,
                                padding: '1px 4px',
                                borderRadius: 999,
                                background: 'var(--pv-send)',
                                color: 'var(--pv-ink)',
                              }}
                            >
                              3
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>

                  <div style={{ height: 1, background: 'var(--pv-rule)' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div className="hz-pv-sec-head">Teammates</div>
                    {SIDEBAR_AGENTS.map((ag) => (
                      <button
                        key={ag.name}
                        type="button"
                        className="hz-pv-nav-row"
                        data-active={scene === 2 && ag.name === 'Dev' ? 'true' : 'false'}
                        onClick={() => selectScene(2)}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span className="hz-pv-live-dot" />
                          <span>{ag.name}</span>
                        </span>
                        <span style={{ fontSize: 7.5, color: 'var(--pv-dim)' }}>{ag.role}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Center Workspace Canvas */}
              <div className="hz-pv-main">
                {/* ── SCENE 0: CHAT · #engineering ───────────────────────────── */}
                {scene === 0 ? (
                  <>
                    <div className="hz-pv-pane-head">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <Hash size={12} color="var(--pv-mute)" />
                        <span style={{ fontSize: 10.5, fontWeight: 600 }}>{channel}</span>
                        <span style={{ fontSize: 8.5, color: 'var(--pv-dim)', whiteSpace: 'nowrap' }}>
                          · Checkout &amp; Apple Pay
                        </span>
                      </div>
                      <span
                        style={{
                          marginRight: wide ? 78 : 98,
                          fontSize: 8,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 999,
                          background: 'var(--pv-green-bg)',
                          border: '1px solid var(--pv-green-edge)',
                          color: 'var(--pv-green)',
                          flexShrink: 0,
                        }}
                      >
                        Agents active
                      </span>
                    </div>

                    <div
                      style={{
                        flex: 1,
                        padding: '8px 11px 6px',
                        paddingRight: wide ? 96 : 122,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 7,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Turn 1: Zoe user bubble */}
                      <div className="hz-pv-rise" style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 999,
                            background: 'var(--pv-amber)',
                            color: 'var(--pv-bar)',
                            fontSize: 9,
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          Z
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 2 }}>
                            <span style={{ fontSize: 9.5, fontWeight: 600 }}>Zoe</span>
                            <span style={{ fontSize: 7.5, color: 'var(--pv-dim)' }}>9:40 AM</span>
                          </div>
                          <div
                            style={{
                              display: 'inline-block',
                              padding: '5px 9px',
                              borderRadius: 9,
                              background: 'var(--pv-bubble)',
                              color: 'var(--pv-bubble-ink)',
                              fontSize: 9.2,
                              lineHeight: 1.35,
                              maxWidth: wide ? '92%' : '88%',
                            }}
                          >
                            <span style={{ color: 'var(--pv-amber)', fontWeight: 600 }}>@Dev</span> Checkout fails on
                            mobile Safari when Apple Pay closes early.
                          </div>
                        </div>
                      </div>

                      {/* Turn 2: @Dev root cause + pull request card */}
                      {step >= 1 ? (
                        <div className="hz-pv-rise" style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 999,
                              background: 'var(--pv-blue)',
                              color: 'var(--pv-bar)',
                              fontSize: 9,
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            D
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                              <span style={{ fontSize: 9.5, fontWeight: 600 }}>Dev</span>
                              <span
                                style={{
                                  fontSize: 7.5,
                                  padding: '0.5px 4px',
                                  borderRadius: 4,
                                  background: 'var(--pv-card)',
                                  border: '1px solid var(--pv-rule-strong)',
                                  color: 'var(--pv-mute)',
                                }}
                              >
                                Agent
                              </span>
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--pv-mute)', lineHeight: 1.32 }}>
                              PaySheet mutex stayed locked on cancel. Opened PR and linked{' '}
                              <span style={{ color: 'var(--pv-ink)', fontWeight: 600 }}>TEAM-142</span>:
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                padding: '4.5px 7px',
                                borderRadius: 7,
                                background: 'var(--pv-card)',
                                border: '1px solid var(--pv-rule-strong)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 6,
                                maxWidth: wide ? '86%' : '76%',
                              }}
                            >
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  fontSize: 8.5,
                                  fontWeight: 600,
                                  minWidth: 0,
                                }}
                              >
                                <GitPullRequest size={11} color="var(--pv-green)" />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {`${PR_TAG} · fix(checkout): release PaySheet lock`}
                                </span>
                              </span>
                              <span style={{ fontSize: 8, color: 'var(--pv-green)', fontWeight: 700, flexShrink: 0 }}>
                                +14 −3
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="hz-pv-rise"
                          style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 27, paddingTop: 4 }}
                        >
                          <span className="hz-pv-live-dot" />
                          <span style={{ fontSize: 8.8, color: 'var(--pv-mute)' }}>
                            Dev is inspecting checkout/pay-sheet.ts…
                          </span>
                        </div>
                      )}

                      {/* Turn 3: @Sci 42/42 E2E GREEN */}
                      {step >= 2 ? (
                        <div className="hz-pv-rise" style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 999,
                              background: 'var(--pv-green)',
                              color: 'var(--pv-bar)',
                              fontSize: 9,
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            S
                          </div>
                          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 9.2, fontWeight: 600 }}>Sci</span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                fontSize: 8,
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: 5,
                                background: 'var(--pv-green-bg)',
                                border: '1px solid var(--pv-green-edge)',
                                color: 'var(--pv-green)',
                              }}
                            >
                              <Check size={9} color="var(--pv-green)" />
                              42/42 E2E GREEN
                            </span>
                            <span style={{ fontSize: 8.5, color: 'var(--pv-mute)' }}>
                              WebKit iOS 18.2 verified
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Unified Composer + Full access + Send */}
                    <div className="hz-pv-composer" style={{ marginRight: wide ? 92 : 118 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <Plus size={11} color="var(--pv-mute)" />
                        <span
                          style={{
                            fontSize: 8.8,
                            color: step === 3 ? 'var(--pv-ink)' : 'var(--pv-mute)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {step === 3 ? (
                            <>
                              @Opera deploy v2.4.1 to prod
                              <span className="hz-pv-caret" />
                            </>
                          ) : (
                            `Message #${channel}`
                          )}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: 7.8,
                            fontWeight: 600,
                            color: 'var(--pv-warn)',
                          }}
                        >
                          <AlertCircle size={9} color="var(--pv-warn)" />
                          Full access
                        </span>
                        <span className="hz-pv-send">
                          <ArrowUp size={11} color="var(--pv-ink)" />
                        </span>
                      </div>
                    </div>
                  </>
                ) : null}

                {/* ── SCENE 1: PROJECTS · KANBAN BOARD ───────────────────────── */}
                {scene === 1 ? (
                  <>
                    <div className="hz-pv-pane-head">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <SquareCheck size={12} color="var(--pv-blue)" />
                        <span style={{ fontSize: 10.5, fontWeight: 600 }}>Projects · Cycle 18</span>
                        <span style={{ fontSize: 8.5, color: 'var(--pv-dim)' }}>4 columns</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingRight: wide ? 78 : 96 }}>
                        <ProgressRingSvg pct={sprintPct} color="var(--pv-green)" />
                        <span style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--pv-ink)' }}>{sprintPct}%</span>
                      </div>
                    </div>

                    <div
                      style={{
                        flex: 1,
                        padding: '8px 9px',
                        paddingRight: wide ? 92 : 118,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                        gap: 6,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Col 1: Backlog */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="hz-pv-dot" style={{ width: 6, height: 6, background: 'var(--pv-amber)' }} />
                          <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--pv-mute)' }}>Backlog</span>
                        </div>
                        <KanbanMiniCard
                          code="TEAM-151"
                          title="Webhook retry jitter"
                          agent="O"
                          hue="var(--pv-violet)"
                          pct={25}
                        />
                      </div>

                      {/* Col 2: To Do */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="hz-pv-dot" style={{ width: 6, height: 6, background: 'var(--pv-mute)' }} />
                          <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--pv-mute)' }}>To Do</span>
                        </div>
                        <KanbanMiniCard
                          code="TEAM-148"
                          title="Apple Pay telemetry"
                          agent="M"
                          hue="var(--pv-amber)"
                          pct={40}
                        />
                      </div>

                      {/* Col 3: In Progress */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="hz-pv-dot" style={{ width: 6, height: 6, background: 'var(--pv-blue)' }} />
                          <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--pv-ink)' }}>In Progress</span>
                        </div>
                        <KanbanMiniCard
                          code="TEAM-145"
                          title="Stripe 3DS fallback"
                          agent="S"
                          hue="var(--pv-green)"
                          pct={step >= 1 ? 82 : 64}
                        />
                        {!cardMoved ? (
                          <KanbanMiniCard
                            code="TEAM-142"
                            title="Release PaySheet lock"
                            agent="D"
                            hue="var(--pv-blue)"
                            pct={step === 0 ? 68 : 92}
                            highlight
                          />
                        ) : null}
                      </div>

                      {/* Col 4: Done */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="hz-pv-dot" style={{ width: 6, height: 6, background: 'var(--pv-green)' }} />
                          <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--pv-green)' }}>Done</span>
                        </div>
                        {cardMoved ? (
                          <KanbanMiniCard
                            code="TEAM-142"
                            title="Release PaySheet lock"
                            agent="D"
                            hue="var(--pv-green)"
                            pct={100}
                            done
                            highlight
                          />
                        ) : null}
                        <KanbanMiniCard
                          code="TEAM-139"
                          title="Unified SSO cookie"
                          agent="C"
                          hue="var(--pv-rose)"
                          pct={100}
                          done
                        />
                      </div>
                    </div>
                  </>
                ) : null}

                {/* ── SCENE 2: AGENTS · LIVE OPS ─────────────────────────────── */}
                {scene === 2 ? (
                  <>
                    <div className="hz-pv-pane-head">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Sparkles size={12} color="var(--pv-amber)" />
                        <span style={{ fontSize: 10.5, fontWeight: 600 }}>Agents · Live Ops</span>
                        <span style={{ fontSize: 8.5, color: 'var(--pv-dim)' }}>6 teammates online</span>
                      </div>
                      <span
                        style={{
                          marginRight: wide ? 78 : 96,
                          fontSize: 7.8,
                          fontWeight: 700,
                          color: 'var(--pv-green)',
                        }}
                      >
                        Sandboxes healthy
                      </span>
                    </div>

                    <div
                      style={{
                        flex: 1,
                        padding: '8px 10px 6px',
                        paddingRight: wide ? 92 : 118,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: 6,
                        alignContent: 'start',
                      }}
                    >
                      {OPS_FLEET.map((bot, idx) => {
                        const focused = idx === step || (step === 3 && idx === 4)
                        return (
                          <div
                            key={bot.name}
                            className="hz-pv-rise"
                            style={{
                              padding: '6px 7px',
                              borderRadius: 8,
                              background: focused ? 'var(--pv-card-hi)' : 'var(--pv-card)',
                              border: focused ? '1px solid var(--pv-blue)' : '1px solid var(--pv-rule-strong)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 3.5,
                              transition: 'border-color 0.2s ease, background-color 0.2s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <span
                                  style={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: 999,
                                    background: bot.hue,
                                    color: 'var(--pv-bar)',
                                    fontSize: 7.5,
                                    fontWeight: 800,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {bot.name[0]}
                                </span>
                                <span style={{ fontSize: 8.8, fontWeight: 700 }}>{bot.name}</span>
                              </span>
                              <span className="hz-pv-live-dot" />
                            </div>
                            <div
                              style={{
                                fontSize: 7.6,
                                color: 'var(--pv-mute)',
                                lineHeight: 1.28,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {bot.task}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginTop: 'auto',
                                paddingTop: 1,
                              }}
                            >
                              <span style={{ fontSize: 7, color: 'var(--pv-dim)' }}>{bot.sandbox}</span>
                              <span style={{ fontSize: 7, fontWeight: 700, color: bot.hue }}>{bot.badge}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div
                      style={{
                        margin: '0 10px 8px',
                        marginRight: wide ? 92 : 118,
                        padding: '4.5px 8px',
                        borderRadius: 7,
                        background: 'var(--pv-bar)',
                        border: '1px solid var(--pv-rule)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 8,
                        color: 'var(--pv-mute)',
                      }}
                    >
                      <span>Handoff: #engineering → @Dev → @Sci → @Opera</span>
                      <span style={{ color: 'var(--pv-green)', fontWeight: 700 }}>v2.4.1 live · 48s</span>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {/* Animated Named Agent Cursor */}
            <AgentCursor x={cursor.x} y={cursor.y} label={cursor.label} />
          </div>

          {/* ── OVERLAPPING 9:16 TITANIUM IPHONE HANDSET ─────────────────────── */}
          <div className="hz-pv-phone" style={{ width: phoneW, height: phoneH }}>
            <div className="hz-pv-phone-screen">
              {/* iOS Status Bar + Dynamic Island */}
              <div className="hz-pv-phone-status">
                <span>9:41</span>
                <div className="hz-pv-island">
                  <span className="hz-pv-island-lens" />
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Wifi size={8.5} color="var(--pv-ink)" />
                  <span
                    style={{
                      width: 12,
                      height: 6.5,
                      borderRadius: 2,
                      border: '1px solid var(--pv-mute)',
                      padding: 1,
                      display: 'inline-flex',
                    }}
                  >
                    <span style={{ flex: 1, background: 'var(--pv-green)', borderRadius: 0.5 }} />
                  </span>
                </span>
              </div>

              {/* Mobile hanzo.team App Header */}
              <div
                style={{
                  height: 25,
                  padding: '0 9px',
                  borderBottom: '1px solid var(--pv-rule)',
                  background: 'var(--pv-bar)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 8.5, fontWeight: 700 }}>
                  <span
                    style={{
                      width: 13,
                      height: 13,
                      borderRadius: 4,
                      background: 'var(--pv-ink)',
                      color: 'var(--pv-bar)',
                      fontSize: 7.5,
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    H
                  </span>
                  <span>{scene === 0 ? `#${channel}` : scene === 1 ? 'Projects' : 'Live Ops'}</span>
                </span>
                <span className="hz-pv-live-dot" />
              </div>

              {/* Synchronized Mobile Screen Body */}
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  background: 'var(--pv-canvas)',
                  padding: '7px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  overflow: 'hidden',
                }}
              >
                {scene === 0 ? (
                  <>
                    <div
                      style={{
                        alignSelf: 'flex-end',
                        padding: '5px 7px',
                        borderRadius: '9px 9px 3px 9px',
                        background: 'var(--pv-bubble)',
                        color: 'var(--pv-bubble-ink)',
                        fontSize: 7.8,
                        lineHeight: 1.32,
                        maxWidth: '92%',
                      }}
                    >
                      @Dev Safari Apple Pay closes early on checkout
                    </div>

                    {step >= 1 ? (
                      <div
                        className="hz-pv-rise"
                        style={{
                          padding: '5px 7px',
                          borderRadius: 8,
                          background: 'var(--pv-card)',
                          border: '1px solid var(--pv-rule-strong)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 3,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 7.8, fontWeight: 700, color: 'var(--pv-blue)' }}>◆ Dev</span>
                          <span style={{ fontSize: 7, color: 'var(--pv-green)', fontWeight: 700 }}>+14 −3</span>
                        </div>
                        <div style={{ fontSize: 7.5, color: 'var(--pv-ink)' }}>{`${PR_TAG} · Release PaySheet lock`}</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 7.5, color: 'var(--pv-mute)' }}>◆ Dev is fixing PaySheet…</div>
                    )}

                    {step >= 2 ? (
                      <div
                        className="hz-pv-rise"
                        style={{
                          padding: '4px 7px',
                          borderRadius: 7,
                          background: 'var(--pv-green-bg)',
                          border: '1px solid var(--pv-green-edge)',
                          color: 'var(--pv-green)',
                          fontSize: 7.5,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>◆ Sci · 42/42 E2E</span>
                        <span>GREEN</span>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {scene === 1 ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 7.5, color: 'var(--pv-mute)', fontWeight: 600 }}>Cycle 18 Sprint</span>
                      <span style={{ fontSize: 7.8, color: 'var(--pv-green)', fontWeight: 700 }}>{sprintPct}%</span>
                    </div>
                    <div
                      style={{
                        padding: '5.5px 7px',
                        borderRadius: 8,
                        background: 'var(--pv-card-hi)',
                        border: cardMoved ? '1px solid var(--pv-green)' : '1px solid var(--pv-blue)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 7.2, color: 'var(--pv-dim)', fontWeight: 700 }}>TEAM-142</span>
                        <span
                          style={{
                            fontSize: 6.8,
                            fontWeight: 700,
                            color: cardMoved ? 'var(--pv-green)' : 'var(--pv-blue)',
                          }}
                        >
                          {cardMoved ? '✓ Done' : 'In Progress'}
                        </span>
                      </div>
                      <div style={{ fontSize: 7.8, fontWeight: 600 }}>Release PaySheet lock</div>
                    </div>

                    <div
                      style={{
                        padding: '5px 7px',
                        borderRadius: 8,
                        background: 'var(--pv-card)',
                        border: '1px solid var(--pv-rule)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: 7.5 }}>TEAM-145 · 3DS</span>
                      <span style={{ fontSize: 7, color: 'var(--pv-mute)' }}>82%</span>
                    </div>

                    <div
                      style={{
                        padding: '5px 7px',
                        borderRadius: 8,
                        background: 'var(--pv-card)',
                        border: '1px solid var(--pv-rule)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: 7.5 }}>TEAM-139 · SSO</span>
                      <span style={{ fontSize: 7, color: 'var(--pv-green)', fontWeight: 700 }}>Done</span>
                    </div>
                  </>
                ) : null}

                {scene === 2 ? (
                  <>
                    {OPS_FLEET.slice(0, 4).map((bot) => (
                      <div
                        key={bot.name}
                        style={{
                          padding: '4.5px 6.5px',
                          borderRadius: 7,
                          background: 'var(--pv-card)',
                          border: '1px solid var(--pv-rule)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 4,
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                          <span className="hz-pv-live-dot" />
                          <span style={{ fontSize: 7.8, fontWeight: 700 }}>{bot.name}</span>
                        </span>
                        <span style={{ fontSize: 6.8, fontWeight: 700, color: bot.hue }}>{bot.badge}</span>
                      </div>
                    ))}
                  </>
                ) : null}
              </div>

              {/* Mobile Pill Composer + Home Indicator */}
              <div style={{ padding: '4px 7px 5px', background: 'var(--pv-canvas)' }}>
                <div
                  style={{
                    height: 22,
                    padding: '0 4px 0 8px',
                    borderRadius: 999,
                    background: 'var(--pv-composer)',
                    border: '1px solid var(--pv-composer-rule)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: 7.4, color: 'var(--pv-mute)' }}>Message team…</span>
                  <span
                    style={{
                      width: 15,
                      height: 15,
                      borderRadius: 999,
                      background: 'var(--pv-send)',
                      color: 'var(--pv-ink)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ArrowUp size={9} color="var(--pv-ink)" />
                  </span>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 3,
                    borderRadius: 999,
                    background: 'var(--pv-rule-strong)',
                    margin: '5px auto 0',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Scene Selector Pills */}
      <div className="hz-pv-scene-pills" role="tablist" aria-label="Preview scenes">
        {SCENE_META.map((item) => {
          const active = scene === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className="hz-pv-scene-pill"
              data-active={active ? 'true' : 'false'}
              onClick={() => selectScene(item.id)}
            >
              {active ? <span className="hz-pv-live-dot" /> : <ShieldCheck size={11} color="var(--muted-foreground)" />}
              <span>{wide ? item.label : item.short}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function KanbanMiniCard({
  code,
  title,
  agent,
  hue,
  pct,
  done = false,
  highlight = false,
}: {
  code: string
  title: string
  agent: string
  hue: string
  pct: number
  done?: boolean
  highlight?: boolean
}) {
  return (
    <div
      className="hz-pv-rise"
      style={{
        padding: '6px 6.5px',
        borderRadius: 7,
        background: highlight ? 'var(--pv-card-hi)' : 'var(--pv-card)',
        border: highlight
          ? done
            ? '1px solid var(--pv-green)'
            : '1px solid var(--pv-blue)'
          : '1px solid var(--pv-rule-strong)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 7.2, fontWeight: 700, color: 'var(--pv-dim)' }}>{code}</span>
        <ProgressRingSvg pct={pct} color={done ? 'var(--pv-green)' : hue} />
      </div>
      <div style={{ fontSize: 8, fontWeight: 600, lineHeight: 1.25, color: 'var(--pv-ink)' }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            width: 13,
            height: 13,
            borderRadius: 999,
            background: hue,
            color: 'var(--pv-bar)',
            fontSize: 7,
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {agent}
        </span>
        <span style={{ fontSize: 7, fontWeight: 700, color: done ? 'var(--pv-green)' : 'var(--pv-mute)' }}>
          {done ? 'Merged' : `${pct}%`}
        </span>
      </div>
    </div>
  )
}

const POINTS = [
  ['Channels', 'Your people and your agents, in one conversation.'],
  ['Agents', 'Hand an agent the work; it reports back when it is done.'],
  ['Issue boards', 'Every task from backlog to done, on one board.'],
] as const

/** What Team is, in three lines, under the picture of it. */
export const Points = () => (
  <XStack width="100%" maxW={740} gap={gap.wide} flexWrap="wrap">
    {POINTS.map(([title, line]) => (
      <YStack key={title} flex={1} minW={180} gap={4}>
        <SizableText size={rung.body} color={paint.ink} fontWeight="600">
          {title}
        </SizableText>
        <SizableText size={rung.small} color={paint.mute}>
          {line}
        </SizableText>
      </YStack>
    ))}
  </XStack>
)
