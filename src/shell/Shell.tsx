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
import { Screen, Sheet, SheetContent, XStack, YStack } from '@hanzo/ui'
import { useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useSession } from '~/data/session.tsx'
import { useSpace } from '~/data/space.tsx'
import { setAsideKind, toggleAsideKind, useAside, useAsideKind } from './aside.ts'
import { BusinessHeader, type BusinessAppItem } from './BusinessHeader.tsx'
import { ConnectOrgModal, openConnectModal } from './ConnectOrgModal.tsx'
import { ASIDE, INLINE_ASIDE, INLINE_NAV, NAV, NAV_MAX, NAV_MIN, SEAM } from './measure.ts'
import { Rail } from './Rail.tsx'
import { round } from '~/theme/theme'

export type ShellProps = {
  /** The navigator region: a panel title, a search, a list. */
  nav: ReactNode
  /** The main region. Fluid; it is the only part that absorbs a resize. */
  children: ReactNode
  /** The dismissible right panel. Absent means main grows into the space. */
  aside?: ReactNode
}

export const Shell = ({ nav, children, aside }: ShellProps) => {
  const { pathname } = useLocation()
  const go = useNavigate()
  const { who, leave, depart } = useSession()
  const { all, current, choose } = useSpace()

  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? INLINE_ASIDE : window.innerWidth,
  )
  const [span, setSpan] = useState(NAV)
  const [drawer, setDrawer] = useState(false)
  const [over, setOver] = useState(false)
  const showing = useAside()
  const asideKind = useAsideKind()

  const wide = width >= INLINE_ASIDE
  const roomy = width >= INLINE_NAV

  const reach = (path: string) => {
    if (!roomy && nav && (pathname === path || pathname.startsWith(`${path}/`))) return setDrawer(true)
    go(path)
  }

  const orgs = all.length > 0 ? all : [{ uuid: 'hanzo', name: 'Hanzo AI', url: 'fixture', org: 'hanzo', isDisabled: false }]
  const activeOrg = current ?? orgs[0]
  const currentAppId = pathname.startsWith('/crm')
    ? 'crm'
    : pathname.startsWith('/bots')
      ? 'bots'
      : pathname.startsWith('/calendar')
        ? 'cal'
        : 'team'

  const handleSelectApp = (app: BusinessAppItem) => {
    if (app.id === 'crm') {
      go('/crm/opportunities')
    } else if (app.id === 'team' || app.id === 'work') {
      go('/issues')
    } else if (app.id === 'chat') {
      go('/chat/c-general')
    } else if (app.id === 'bots') {
      go('/bots')
    } else if (app.id === 'cal') {
      go('/calendar')
    } else if (typeof window !== 'undefined') {
      window.location.href = app.href
    }
  }

  const userIdentity = who
    ? {
        sub: who.id,
        name: who.label || who.name,
        email: who.email,
        avatar: who.avatar,
        owner: activeOrg?.org ?? 'hanzo',
      }
    : {
        sub: 'zeekay',
        name: 'Zach Kelling',
        email: 'z@hanzo.ai',
        owner: 'hanzo',
      }

  const currentOrgInfo = {
    name: activeOrg?.url ?? 'hanzo',
    displayName: activeOrg?.name ?? 'Hanzo AI',
  }
  const orgList = orgs.map((s) => ({ name: s.url, displayName: s.name }))

  return (
    <Screen bg="$background">
      <BusinessHeader
        appId={currentAppId}
        showAppTitle={pathname.startsWith('/crm')}
        currentOrg={currentOrgInfo}
        orgs={orgList}
        onSelectOrg={(url: string) => choose(url)}
        onCreateOrg={() => openConnectModal('create-org')}
        onSelectApp={handleSelectApp}
        onNavigate={reach}
        user={userIdentity}
      />
      <XStack
        flex={1}
        minH={0}
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
            onCreateOrg: () => openConnectModal('create-org'),
            onConnectOrg: () => openConnectModal('connect'),
            // hanzo.ai's account chooser, for this app's request: the person
            // picks one of the accounts signed in there, or signs in as another.
            onAddAccount: () => void depart('another'),
            onSettings: () => reach('/bots'),
            onSignOut: () => leave(),
          }}
        />

        {roomy && nav ? (
          <>
            <YStack width={span} shrink={0} minH={0} data-parity-key="shell.nav">
              {nav}
            </YStack>
            <Grip value={span} onChange={setSpan} />
          </>
        ) : null}

        {/* Ground above, below, right and between — and NOT on the left, where
            main butts the navigator. That is what the reference draws (its
            navigator ends at 439 and its board begins at 440), and it is what
            gives main its width back. */}
        <XStack flex={1} minW={0} minH={0} pt={SEAM} pb={SEAM} pr={SEAM} gap={SEAM}>
          <Panel parity="shell.main">{children}</Panel>

          {aside && showing && wide ? (
            <YStack width={ASIDE} shrink={0}>
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
        <SheetContent side="left" width={NAV} p={0} bg="$background">
          {nav}
        </SheetContent>
      </Sheet>

      <ConnectOrgModal />
    </Screen>
  )
}

/** A raised panel on the ground. Main and the aside are the same shape. */
const Panel = ({ parity, children }: { parity: string; children: ReactNode }) => (
  <YStack
    flex={1}
    minW={0}
    minH={0}
    bg="$panel"
    rounded={round.panel}
    overflow="hidden"
    data-parity-key={parity}
  >
    {children}
  </YStack>
)

/**
 * The navigator's edge, and the app's one resize.
 *
 * A hairline you can see, a 17px band you can hit, and arrow keys for anyone not
 * using a pointer. Pointer capture, because at 1px wide the pointer leaves the
 * line immediately and a drag that ends there ends on the first move.
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
      width={1}
      shrink={0}
      bg="$edge"
      position="relative"
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
