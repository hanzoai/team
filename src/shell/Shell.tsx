/**
 * THE FOUR REGIONS.
 *
 *   rail        84   fixed, at every width
 *   navigator  208   fixed, dragged, a drawer when there is no room
 *   main         —   the ONLY fluid region: it absorbs every change of width and
 *                    scrolls its columns rather than reflowing them
 *   aside      308   fixed, dismissible, over main when there is no room
 *
 * Three fixed and one fluid is a FLEX layout, not a percentage split — a
 * percentage navigator grows with the window and the reference's does not. That
 * is why this does not reach for `ResizablePanelGroup`, whose panels are shares
 * of the whole; the one thing it would have brought is a drag, which is `Grip`
 * below and is twenty lines.
 *
 * The two raised panels float on the ground with one seam between them and the
 * same seam around them. The reference draws three widths there (8, 16, 20); one
 * value here, because a seam with three widths is three seams.
 *
 * WIDTH IS THIS ELEMENT'S, NOT THE WINDOW'S. What a region has to fit in is the
 * shell's width, which a desktop can make smaller than the viewport and which a
 * media query cannot see. `onLayout` is the measurement and the window is only
 * the seed, so the first paint is not one frame of the wrong layout.
 */
import { Popover, Separator } from '@hanzo/gui'
import { Screen, Sheet, SheetContent, SizableText, XStack, YStack } from '@hanzo/ui'
import { OrgMark } from '@hanzo/ui/product'
import { Check, Headphones, HeadphoneOff, Mic, MicOff, Settings } from '@hanzogui/lucide-icons-2'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useSession } from '~/data/session.tsx'
import { useSpace } from '~/data/space.tsx'
import { openSettingsModal, SettingsModal } from '~/settings/SettingsModal.tsx'
import { paint, round, rung, state } from '~/theme/theme.ts'
import { setAsideKind, toggleAsideKind, useAside, useAsideKind } from './aside.ts'
import { BusinessHeader } from './BusinessHeader.tsx'
import { ConnectOrgModal, openConnectModal } from './ConnectOrgModal.tsx'
import { ASIDE, INLINE_ASIDE, INLINE_NAV, NAV, NAV_MAX, NAV_MIN, PAD, PANE_ROUND, SEAM } from './measure.ts'
import { press } from './press.ts'
import { Rail } from './Rail.tsx'
import { surfaceAt } from './surfaces.ts'
import {
  matchTeamShortcut,
  TEAM_CROSS_APPS,
  TEAM_SHORTCUTS,
  type TeamCrossAppItem,
} from './unified.ts'

export type ShellProps = {
  /** The navigator region: a panel title, a search, a list. */
  nav: ReactNode
  /** The main region. Fluid; it is the only part that absorbs a resize. */
  children: ReactNode
  /** The dismissible right panel. Absent means main grows into the space. */
  aside?: ReactNode
}

export const Shell = ({ nav, children, aside }: ShellProps) => {
  const { pathname, search } = useLocation()
  const go = useNavigate()
  const { who, leave, depart } = useSession()
  const { all, current, choose } = useSpace()

  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? INLINE_ASIDE : window.innerWidth,
  )
  const [span, setSpanState] = useState(() => {
    try {
      if (typeof window === 'undefined') return NAV
      const saved = Number(window.localStorage.getItem('hanzo.team.sidebar.width'))
      return Number.isFinite(saved) && saved >= NAV_MIN && saved <= NAV_MAX ? saved : NAV
    } catch {
      return NAV
    }
  })
  const setSpan = useCallback((next: number) => {
    const clamped = Math.min(NAV_MAX, Math.max(NAV_MIN, next))
    setSpanState(clamped)
    try {
      window.localStorage.setItem('hanzo.team.sidebar.width', String(Math.round(clamped)))
    } catch {
      // ignore storage errors
    }
  }, [])
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage.getItem('hanzo.team.sidebar.collapsed') === 'true'
    } catch {
      return false
    }
  })
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [drawer, setDrawer] = useState(false)
  // A destination picked in the drawer is where the person is going, so the
  // drawer steps aside. Left open it stands over the page it opened, and over
  // a dialog the address opened (/projects?new), which dismissing the drawer
  // then dismissed too.
  useEffect(() => setDrawer(false), [pathname, search])
  const [over, setOver] = useState(false)
  const showing = useAside()
  const asideKind = useAsideKind()

  const wide = width >= INLINE_ASIDE
  const roomy = width >= INLINE_NAV
  const inlineNavOpen = Boolean(roomy && nav && !navCollapsed)

  const toggleSidebar = useCallback(() => {
    if (!roomy) {
      setDrawer((v) => !v)
      return
    }
    setNavCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem('hanzo.team.sidebar.collapsed', String(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }, [roomy])

  const reach = useCallback(
    (path: string) => {
      if (!roomy && nav && (pathname === path || pathname.startsWith(`${path}/`))) return setDrawer(true)
      if (roomy && nav && navCollapsed && (pathname === path || pathname.startsWith(`${path}/`))) {
        setNavCollapsed(false)
        try {
          window.localStorage.setItem('hanzo.team.sidebar.collapsed', 'false')
        } catch {
          // ignore storage errors
        }
        return
      }
      go(path)
    },
    [go, nav, navCollapsed, pathname, roomy],
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const action = matchTeamShortcut({
        key: e.key,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        repeat: e.repeat,
        defaultPrevented: e.defaultPrevented,
        isComposing: e.isComposing,
        isContentEditable: Boolean((e.target as HTMLElement | null)?.isContentEditable),
      })
      if (!action) return
      if (action === 'toggle-sidebar') {
        e.preventDefault()
        toggleSidebar()
      } else if (action === 'shortcuts') {
        e.preventDefault()
        setShortcutsOpen((v) => !v)
      } else if (action === 'settings') {
        e.preventDefault()
        openSettingsModal('general')
      } else if (action === 'new-thread') {
        e.preventDefault()
        reach('/chat')
        window.dispatchEvent(new CustomEvent('hanzo:team-new-channel'))
      }
    }
    const onCustomToggle = () => toggleSidebar()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('hanzo:team-toggle-sidebar', onCustomToggle)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('hanzo:team-toggle-sidebar', onCustomToggle)
    }
  }, [reach, toggleSidebar])

  const orgs = all
  const activeOrg = current ?? orgs[0]

  const userIdentity = who
    ? {
        sub: who.id,
        name: who.label || who.name,
        email: who.email,
        avatar: who.avatar,
        owner: activeOrg?.org ?? '',
      }
    : {
        sub: '',
        name: '',
        email: '',
        owner: '',
      }

  const currentOrgInfo = {
    name: activeOrg?.url ?? '',
    displayName: activeOrg?.name ?? '',
  }
  const orgList = orgs.map((s) => ({ name: s.url, displayName: s.name }))

  return (
    <Screen style={{ backgroundColor: paint.ground }}>
      <BusinessHeader
        currentOrg={currentOrgInfo}
        onNavigate={reach}
        navSpan={span + SEAM}
        navOpen={inlineNavOpen}
        onToggleNav={nav ? toggleSidebar : undefined}
        surfaceTitle={surfaceAt(pathname)?.label}
      />
      <XStack
        flex={1}
        minH={0}
        pb={SEAM}
        pr={SEAM}
        onLayout={(e: { nativeEvent: { layout: { width: number } } }) =>
          setWidth(e.nativeEvent.layout.width)
        }
      >
        <Rail
          notices={!!aside && (wide ? showing && asideKind === 'inbox' : over)}
          onNotices={() => {
            if (wide) {
              toggleAsideKind('inbox')
            } else {
              setAsideKind('inbox')
              setOver(!over)
            }
          }}
          onSurface={reach}
          account={{
            user: userIdentity,
            currentOrg: currentOrgInfo,
            orgs: orgList,
            onSelectOrg: (url: string) => choose(url),
            onConnectOrg: () => openConnectModal('connect'),
            onAddAccount: () => void depart('another'),
            onSettings: () => openSettingsModal('general'),
            onSignOut: () => leave(),
          }}
        />

        {inlineNavOpen ? (
          <YStack width={span} shrink={0} minH={0} position="relative">
            <YStack
              flex={1}
              minH={0}
              rounded={PANE_ROUND}
              borderWidth={1}
              overflow="hidden"
              style={{ backgroundColor: paint.sidebar, borderColor: paint.paneEdge }}
              data-parity-key="shell.nav"
              data-testid="team-left-sidebar"
            >
              <YStack flex={1} minH={0}>
                {nav}
              </YStack>
              <SidebarAccountFooter
                user={userIdentity}
                currentOrg={currentOrgInfo}
                orgs={orgList}
                onSelectOrg={(url: string) => choose(url)}
                onSettings={() => openSettingsModal('general')}
                onOpenShortcuts={() => setShortcutsOpen(true)}
                onNavigate={reach}
                onSignIn={() => void depart('another')}
              />
            </YStack>
            <Grip value={span} onChange={setSpan} />
          </YStack>
        ) : null}

        <XStack flex={1} minW={0} minH={0} ml={inlineNavOpen ? SEAM : 0} gap={SEAM}>
          <Panel parity="shell.main">{children}</Panel>

          {aside && showing && wide ? (
            <YStack width={ASIDE} shrink={0} minH={0}>
              <Panel parity="shell.aside">{aside}</Panel>
            </YStack>
          ) : null}
        </XStack>
      </XStack>

      {/* No room beside main: the aside comes over it, at the width it would
          have had, so its contents are not a second layout. */}
      <Sheet open={!!aside && !wide && over} onOpenChange={setOver}>
        <SheetContent side="right" width={ASIDE} p={0} bg="$panel">
          {aside}
        </SheetContent>
      </Sheet>

      {/* No room for the column: the navigator comes over the ground it would
          have sat on, at the width it would have had. */}
      <Sheet open={!!nav && drawer && !roomy} onOpenChange={setDrawer}>
        <SheetContent side="left" width={NAV} p={0} style={{ backgroundColor: paint.sidebar }}>
          <YStack flex={1} minH={0}>
            <YStack flex={1} minH={0}>
              {nav}
            </YStack>
            <SidebarAccountFooter
              user={userIdentity}
              currentOrg={currentOrgInfo}
              orgs={orgList}
              onSelectOrg={(url: string) => choose(url)}
              onSettings={() => openSettingsModal('general')}
              onOpenShortcuts={() => setShortcutsOpen(true)}
              onNavigate={reach}
              onSignIn={() => void depart('another')}
            />
          </YStack>
        </SheetContent>
      </Sheet>

      <Sheet open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <SheetContent side="right" width={360} p={PAD} bg="$panel">
          <YStack gap={12}>
            <SizableText fontSize={rung.row} fontWeight="600" color="$ink">
              Keyboard shortcuts
            </SizableText>
            <Separator borderColor="$edge" />
            {TEAM_SHORTCUTS.map((s) => (
              <XStack key={s.action} items="center" justify="space-between" py={4}>
                <SizableText fontSize={rung.body} color="$quiet">
                  {s.label}
                </SizableText>
                <XStack
                  px={8}
                  py={2}
                  rounded={round.field}
                  borderWidth={1}
                  borderColor="$edge"
                  bg="$background"
                >
                  <SizableText fontSize={rung.chip} fontWeight="600" color="$ink">
                    {s.mac}
                  </SizableText>
                </XStack>
              </XStack>
            ))}
          </YStack>
        </SheetContent>
      </Sheet>

      <ConnectOrgModal />
      <SettingsModal user={userIdentity} orgName={currentOrgInfo.displayName} />
    </Screen>
  )
}

/** Unified bottom-left Hanzo IAM Account & Org Switcher (`X-Org-Id`) pill in sidebar footer. */
const SidebarAccountFooter = ({
  user,
  currentOrg,
  orgs,
  onSelectOrg,
  onSettings,
  onOpenShortcuts,
  onNavigate,
  onSignIn,
}: {
  user: { sub: string; name: string; email?: string; avatar?: string; owner: string }
  currentOrg: { name: string; displayName: string }
  orgs: Array<{ name: string; displayName: string }>
  onSelectOrg: (orgName: string) => void
  onSettings: () => void
  onOpenShortcuts: () => void
  onNavigate: (path: string) => void
  onSignIn: () => void
}) => {
  const [open, setOpen] = useState(false)
  const [muted, setMuted] = useState(false)
  const [deafened, setDeafened] = useState(false)
  const displayUser = user.name.trim() || user.email?.split('@')[0] || 'Account'
  const orgId = currentOrg.name.trim() || 'hanzo'

  const handleCrossApp = (item: TeamCrossAppItem) => {
    setOpen(false)
    if (item.internalPath) {
      onNavigate(item.internalPath)
    } else if (typeof window !== 'undefined') {
      window.open(item.href, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <XStack
      px={6}
      py={6}
      gap={2}
      items="center"
      justify="space-between"
      borderTopWidth={1}
      style={{ borderTopColor: paint.rule }}
      data-testid="sidebar-account-org-footer"
    >
      <Popover open={open} onOpenChange={setOpen} placement="top-start" allowFlip stayInFrame>
        <Popover.Trigger asChild>
          <XStack
            {...press(() => setOpen(!open), 'Hanzo Account & Organization Switcher')}
            height={34}
            px={6}
            flex={1}
            minW={0}
            rounded={round.field}
            items="center"
            justify="space-between"
            gap={6}
            hoverStyle={{ bg: '$hover' }}
            data-testid="sidebar-account-org-pill"
          >
            <XStack items="center" gap={7} minW={0} flex={1}>
              <YStack position="relative" shrink={0}>
                <OrgMark org={{ name: displayUser, logo: user.avatar }} size={22} />
                <YStack
                  position="absolute"
                  b={-1}
                  r={-1}
                  width={7}
                  height={7}
                  rounded={round.pill}
                  borderWidth={1.5}
                  style={{ backgroundColor: state.done, borderColor: paint.sidebar }}
                />
              </YStack>
              <YStack flex={1} minW={0}>
                <SizableText fontSize={rung.small} fontWeight="600" color="$ink" numberOfLines={1}>
                  {displayUser}
                </SizableText>
                <SizableText fontSize={rung.chip} color="$faint" numberOfLines={1}>
                  {`Online · ${orgId}`}
                </SizableText>
              </YStack>
            </XStack>
          </XStack>
        </Popover.Trigger>

        <Popover.Content
          role="menu"
          aria-label="Hanzo Account and Organization Switcher"
          borderWidth={1}
          borderColor="$edge"
          bg="$panel"
          rounded={round.panel}
          p={10}
          width={248}
          style={{ zIndex: 100000 }}
        >
          <YStack gap={6} width="100%">
            <YStack px={6} py={4}>
              <SizableText fontSize={rung.small} fontWeight="600" color="$ink">
                {displayUser}
              </SizableText>
              <SizableText fontSize={rung.chip} color="$quiet">
                {user.email || 'hanzo.id'} · X-Org-Id: {orgId}
              </SizableText>
              <XStack
                {...press(() => {
                  setOpen(false)
                  onSignIn()
                }, 'Switch or sign in via hanzo.id')}
                mt={6}
                py={4}
                px={8}
                rounded={round.field}
                borderWidth={1}
                borderColor="$edge"
                hoverStyle={{ bg: '$hover' }}
              >
                <SizableText fontSize={rung.chip} fontWeight="600" color="$ink">
                  Switch account via hanzo.id →
                </SizableText>
              </XStack>
            </YStack>

            <Separator borderColor="$edge" />

            <SizableText px={6} fontSize={rung.chip} fontWeight="600" color="$faint">
              ORGANIZATIONS (X-ORG-ID)
            </SizableText>
            {orgs.map((o) => {
              const active = o.name === currentOrg.name
              return (
                <XStack
                  key={o.name}
                  {...press(() => {
                    setOpen(false)
                    onSelectOrg(o.name)
                  }, `Switch org to ${o.displayName}`)}
                  px={8}
                  py={5}
                  rounded={round.field}
                  bg={active ? '$hover' : 'transparent'}
                  hoverStyle={{ bg: '$hover' }}
                  items="center"
                  justify="space-between"
                >
                  <SizableText fontSize={rung.small} color="$ink" numberOfLines={1}>
                    {o.displayName}
                  </SizableText>
                  {active ? <Check size={13} color="$ink" /> : null}
                </XStack>
              )
            })}

            <Separator borderColor="$edge" />

            <SizableText px={6} fontSize={rung.chip} fontWeight="600" color="$faint">
              SWITCH HANZO APP
            </SizableText>
            <XStack flexWrap="wrap" gap={4} px={4}>
              {TEAM_CROSS_APPS.map((item) => (
                <XStack
                  key={item.id}
                  {...press(() => handleCrossApp(item), `Open Hanzo ${item.label}`)}
                  px={8}
                  py={4}
                  rounded={round.field}
                  borderWidth={1}
                  borderColor="$edge"
                  hoverStyle={{ bg: '$hover' }}
                >
                  <SizableText fontSize={rung.chip} color="$ink">
                    {item.label}
                  </SizableText>
                </XStack>
              ))}
            </XStack>

            <Separator borderColor="$edge" />

            <XStack
              {...press(() => {
                setOpen(false)
                onSettings()
              }, 'Settings (⌘,)')}
              px={8}
              py={5}
              rounded={round.field}
              hoverStyle={{ bg: '$hover' }}
              items="center"
              justify="space-between"
            >
              <SizableText fontSize={rung.small} color="$quiet">
                Settings
              </SizableText>
              <SizableText fontSize={rung.chip} color="$faint">
                ⌘,
              </SizableText>
            </XStack>

            <XStack
              {...press(() => {
                setOpen(false)
                onOpenShortcuts()
              }, 'Keyboard shortcuts (⌘/)')}
              px={8}
              py={5}
              rounded={round.field}
              hoverStyle={{ bg: '$hover' }}
              items="center"
              justify="space-between"
            >
              <SizableText fontSize={rung.small} color="$quiet">
                Shortcuts
              </SizableText>
              <SizableText fontSize={rung.chip} color="$faint">
                ⌘/
              </SizableText>
            </XStack>
          </YStack>
        </Popover.Content>
      </Popover>

      {/* Discord-style bottom-left voice/settings quick controls */}
      <XStack items="center" gap={2} shrink={0} data-testid="sidebar-user-controls">
        <XStack
          {...press(() => setMuted((v) => !v), muted ? 'Unmute microphone' : 'Mute microphone')}
          aria-pressed={muted}
          minW={26}
          minH={26}
          items="center"
          justify="center"
          rounded={round.field}
          hoverStyle={{ bg: '$hover' }}
          data-testid="sidebar-mic-toggle"
        >
          {muted ? <MicOff size={14} color={paint.alert} /> : <Mic size={14} color="$quiet" />}
        </XStack>
        <XStack
          {...press(() => setDeafened((v) => !v), deafened ? 'Undeafen audio' : 'Deafen audio')}
          aria-pressed={deafened}
          minW={26}
          minH={26}
          items="center"
          justify="center"
          rounded={round.field}
          hoverStyle={{ bg: '$hover' }}
          data-testid="sidebar-deafen-toggle"
        >
          {deafened ? (
            <HeadphoneOff size={14} color={paint.alert} />
          ) : (
            <Headphones size={14} color="$quiet" />
          )}
        </XStack>
        <XStack
          {...press(onSettings, 'User Settings')}
          minW={26}
          minH={26}
          items="center"
          justify="center"
          rounded={round.field}
          hoverStyle={{ bg: '$hover' }}
          data-testid="sidebar-settings-trigger"
        >
          <Settings size={14} color="$quiet" />
        </XStack>
      </XStack>
    </XStack>
  )
}

/** Curved inset main / aside canvas matching hanzo.app & hanzo.bot (`12px` radius, `1px` `--pane-edge`). */
const Panel = ({ parity, children }: { parity: string; children: ReactNode }) => (
  <YStack
    flex={1}
    minW={0}
    minH={0}
    rounded={PANE_ROUND}
    borderWidth={1}
    overflow="hidden"
    style={{ backgroundColor: paint.panel, borderColor: paint.paneEdge }}
    data-parity-key={parity}
  >
    {children}
  </YStack>
)

/**
 * The navigator's edge, sitting in the 4px gutter between `shell.nav` and `shell.main`.
 *
 * Invisible until hovered or focused, with a 12px hit band and arrow-key support.
 */
const Grip = ({ value, onChange }: { value: number; onChange: (n: number) => void }) => {
  const from = useRef(0)
  const start = useRef(value)
  /** Whether this grip is being dragged. Pointer CAPTURE cannot answer that
   *  here: gui hands the handler its own event, whose `currentTarget` need not
   *  be a DOM node, so `setPointerCapture` is a silent no-op and
   *  `hasPointerCapture` answers undefined — measured, and it made every drag
   *  return on its first move while the arrow keys worked. The capture is still
   *  requested, because when it lands the pointer may leave the 17px band and
   *  the drag survives. */
  const pulling = useRef(false)
  const hold = (n: number) => Math.min(NAV_MAX, Math.max(NAV_MIN, n))

  return (
    <YStack
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the navigator"
      aria-valuenow={value}
      aria-valuemin={NAV_MIN}
      aria-valuemax={NAV_MAX}
      tabIndex={0}
      position="absolute"
      t={8}
      b={8}
      r={-SEAM}
      width={SEAM}
      z={10}
      rounded={round.pill}
      cursor="col-resize"
      hoverStyle={{ bg: '$soft' }}
      focusVisibleStyle={{ bg: '$outlineColor' }}
      onPointerDown={(e: React.PointerEvent<HTMLElement>) => {
        pulling.current = true
        from.current = e.clientX
        start.current = value
        e.currentTarget.setPointerCapture?.(e.pointerId)
      }}
      onPointerMove={(e: React.PointerEvent<HTMLElement>) => {
        if (!pulling.current) return
        onChange(hold(start.current + e.clientX - from.current))
      }}
      onPointerUp={(e: React.PointerEvent<HTMLElement>) => {
        pulling.current = false
        e.currentTarget.releasePointerCapture?.(e.pointerId)
      }}
      onPointerCancel={() => {
        pulling.current = false
      }}
      // gui types a key handler with the platform's own event, which carries no
      // `key`; on web react-native-web hands the DOM event straight through. The
      // parameter is stated as what this reads and nothing else, which is the
      // widest type the handler can take and still be assignable.
      onKeyDown={(e: { key?: string; shiftKey?: boolean; type?: string }) => {
        const step = e.shiftKey ? 1 : 8
        if (e.key === 'ArrowLeft') onChange(hold(value - step))
        if (e.key === 'ArrowRight') onChange(hold(value + step))
      }}
    >
      {/* The band. 1px is the line; a pointer needs more than that to find it. */}
      <YStack position="absolute" t={0} b={0} l={-8} r={-8} />
    </YStack>
  )
}
