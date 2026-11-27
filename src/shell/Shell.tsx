/**
 * THE 4-COLUMN SHELL: Discord × Mattermost × Hanzo v8.8 (v1.1.1 Unified)
 *
 *   Top:   38px `#000000` Frameless Desktop Bar + Centered `#141414` Omnibox (`Ctrl+K`) + `⚙`
 *   Col 1: 56px `#000000` Guild / Organization Rail (`H` Hanzo, `L` Lux, `Z` Zoo, `S` Science)
 *   Col 2: 216px | 248px | 288px `#0c0c0c` Unified Channel, Voice & Workspace Sidebar + User Dock
 *   Col 3: Fluid `#090909` Main Stage (`#engineering`, `Home`, `Office`, `Work`, `Inbox`, `Spaces`, `Memory`)
 *   Col 4: 296px `#0c0c0c` Right Contextual Pane (Mattermost `Thread` RHS ↔ `Workforce` Roster)
 */
import { Separator } from '@hanzo/gui'
import { Screen, Sheet, SheetContent, SizableText, XStack, YStack } from '@hanzo/ui'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { isMacDesktop } from '~/data/desktop.ts'
import { useSession } from '~/data/session.tsx'
import { useSpace } from '~/data/space.tsx'
import { openSettingsModal, SettingsModal, type SettingsTab } from '~/settings/SettingsModal.tsx'
import { sidebarWidthPxFor, useTeamSettings } from '~/settings/preferences.ts'
import { paint, round, rung } from '~/theme/theme.ts'
import { toggleRightThreadPane } from '~/workspace/store.ts'
import { BusinessHeader } from './BusinessHeader.tsx'
import { ConnectOrgModal, openConnectModal } from './ConnectOrgModal.tsx'
import { INLINE_ASIDE, INLINE_NAV, PAD } from './measure.ts'
import { Rail } from './Rail.tsx'
import { RightPane } from './RightPane.tsx'
import { surfaceAt } from './surfaces.ts'
import { matchTeamShortcut, TEAM_SHORTCUTS } from './unified.ts'
import { UnifiedSidebar } from './UnifiedSidebar.tsx'

export type ShellProps = {
  nav?: ReactNode
  children: ReactNode
  aside?: ReactNode
}

const VIEW_SHORTCUT_PATHS: Record<string, string> = {
  'view-1': '/home',
  'view-2': '/chat',
  'view-3': '/inbox',
  'view-4': '/threads',
  'view-5': '/issues',
  'view-6': '/office',
}

export const Shell = ({ children }: ShellProps) => {
  const { pathname, search } = useLocation()
  const go = useNavigate()
  const { who, leave, guest } = useSession()
  const { all, current, choose } = useSpace()
  const { settings } = useTeamSettings()

  const sidebarW = sidebarWidthPxFor(settings.sidebarWidth)

  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth,
  )
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage.getItem('hanzo.team.sidebar.collapsed') === 'true'
    } catch {
      return false
    }
  })
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [drawer, setDrawer] = useState(false)

  useEffect(() => setDrawer(false), [pathname, search])

  // Support `?settings=appearance` deep links on load
  useEffect(() => {
    if (!search) return
    const params = new URLSearchParams(search)
    const requested = params.get('settings')
    if (requested) {
      openSettingsModal(requested as SettingsTab)
    }
  }, [search])

  const wide = width >= INLINE_ASIDE
  const roomy = width >= INLINE_NAV
  const inlineNavOpen = Boolean(roomy && !navCollapsed)

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
      go(path)
    },
    [go],
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
      } else if (action === 'toggle-thread-pane') {
        e.preventDefault()
        toggleRightThreadPane()
      } else if (action === 'shortcuts') {
        e.preventDefault()
        setShortcutsOpen((v) => !v)
      } else if (action === 'settings') {
        e.preventDefault()
        openSettingsModal('general')
      } else if (action === 'new-thread') {
        e.preventDefault()
        reach('/chat')
      } else if (action in VIEW_SHORTCUT_PATHS) {
        e.preventDefault()
        reach(VIEW_SHORTCUT_PATHS[action]!)
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

  const activeOrg = current ?? all[0]
  const resolvedName =
    who && !guest && (who.label || who.name || who.email)
      ? (who.label || who.name || who.email)!
      : who?.label || 'Workspace Member'

  const userIdentity = {
    sub: who?.id || '',
    name: resolvedName,
    email: who?.email || '',
    avatar: who?.avatar,
    owner: activeOrg?.org ?? '',
  }

  const currentOrgInfo = {
    name: activeOrg?.url ?? '',
    displayName: activeOrg?.name ?? 'Workspace',
  }
  const orgList = all.map((s) => ({ name: s.url, displayName: s.name }))

  return (
    <Screen style={{ backgroundColor: paint.ground }}>
      <BusinessHeader
        currentOrg={currentOrgInfo}
        onNavigate={reach}
        navSpan={sidebarW}
        navOpen={inlineNavOpen}
        onToggleNav={toggleSidebar}
        surfaceTitle={surfaceAt(pathname)?.label}
      />

      <XStack
        flex={1}
        minH={0}
        onLayout={(e: { nativeEvent: { layout: { width: number } } }) =>
          setWidth(e.nativeEvent.layout.width)
        }
      >
        {/* Col 1: 56px Guild Rail */}
        <Rail
          onSurface={reach}
          account={{
            user: userIdentity,
            currentOrg: currentOrgInfo,
            orgs: orgList,
            onSelectOrg: (url: string) => {
              if (all.some((s) => s.url === url)) choose(url)
            },
            onConnectOrg: () => openConnectModal('connect'),
            onSettings: () => openSettingsModal('general'),
            onSignOut: () => leave(),
          }}
        />

        {/* Col 2: Configurable Width (216px | 248px | 288px) Discord × Mattermost Channel Sidebar */}
        {inlineNavOpen ? (
          <YStack
            width={sidebarW}
            shrink={0}
            minH={0}
            style={{ transition: 'width var(--team-panel-anim-ms, 150ms) ease' }}
            data-parity-key="shell.nav"
          >
            <UnifiedSidebar
              userName={userIdentity.name}
              userEmail={userIdentity.email}
              userAvatar={userIdentity.avatar}
              onSignOut={leave}
            />
          </YStack>
        ) : null}

        {/* Col 3: Main Stage */}
        <YStack
          flex={1}
          minW={0}
          minH={0}
          overflow="hidden"
          style={{ backgroundColor: paint.panel }}
          data-parity-key="shell.main"
          data-testid="team-main-stage"
        >
          {children}
        </YStack>

        {/* Col 4: 296px Contextual Right Pane (Mattermost Thread RHS or Workforce Roster) */}
        {wide ? <RightPane /> : null}
      </XStack>

      <Sheet open={drawer && !roomy} onOpenChange={setDrawer}>
        <SheetContent side="left" width={sidebarW} p={0} style={{ backgroundColor: paint.sidebar }}>
          <UnifiedSidebar
            userName={userIdentity.name}
            userEmail={userIdentity.email}
            userAvatar={userIdentity.avatar}
            onSignOut={leave}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <SheetContent side="right" width={360} p={PAD} style={{ backgroundColor: paint.sidebar }}>
          <YStack gap={12}>
            <SizableText fontSize={rung.row} fontWeight="600" style={{ color: paint.ink }}>
              Keyboard shortcuts
            </SizableText>
            <Separator borderColor={paint.rule} />
            {TEAM_SHORTCUTS.map((s) => (
              <XStack key={s.action} items="center" justify="space-between" py={4}>
                <SizableText fontSize={rung.body} style={{ color: paint.mute }}>
                  {s.label}
                </SizableText>
                <XStack
                  px={8}
                  py={2}
                  rounded={round.field}
                  borderWidth={1}
                  style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
                >
                  <SizableText fontSize={rung.chip} fontWeight="600" style={{ color: paint.ink, fontFamily: 'var(--font-mono)' }}>
                    {isMacDesktop() ? s.mac : s.pc}
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
