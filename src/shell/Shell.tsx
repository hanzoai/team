/**
 * THE 4-COLUMN SHELL: Discord × Mattermost × Hanzo v8.8
 *
 *   Top:   38px `#000000` Frameless Desktop Bar + Centered `#141417` Omnibox (`Ctrl+K`)
 *   Col 1: 56px `#000000` Guild / Organization Rail (`H` Hanzo, `L` Lux, `Z` Zoo, `S` Science)
 *   Col 2: 244px `#0a0a0c` Unified Channel, Voice & Workspace Sidebar + Bottom User Dock
 *   Col 3: Fluid `#0f0f12` Main Stage (`#engineering`, `Home`, `Office`, `Work`, `Inbox`, `Spaces`, `Memory`)
 *   Col 4: 296px `#0b0b0e` Right Contextual Pane (Mattermost `Thread` RHS ↔ `Workforce` Roster)
 */
import { Separator } from '@hanzo/gui'
import { Screen, Sheet, SheetContent, SizableText, XStack, YStack } from '@hanzo/ui'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useSession } from '~/data/session.tsx'
import { useSpace } from '~/data/space.tsx'
import { openSettingsModal, SettingsModal } from '~/settings/SettingsModal.tsx'
import { paint, round, rung } from '~/theme/theme.ts'
import { BusinessHeader } from './BusinessHeader.tsx'
import { ConnectOrgModal, openConnectModal } from './ConnectOrgModal.tsx'
import { INLINE_ASIDE, INLINE_NAV, NAV, PAD } from './measure.ts'
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

export const Shell = ({ children }: ShellProps) => {
  const { pathname, search } = useLocation()
  const go = useNavigate()
  const { who, leave, guest } = useSession()
  const { all, current, choose } = useSpace()

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
      } else if (action === 'shortcuts') {
        e.preventDefault()
        setShortcutsOpen((v) => !v)
      } else if (action === 'settings') {
        e.preventDefault()
        openSettingsModal('general')
      } else if (action === 'new-thread') {
        e.preventDefault()
        reach('/chat/engineering')
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
    who && !guest && who.label && who.label !== 'Local Workspace'
      ? who.label
      : 'Zach Kelling'

  const userIdentity = {
    sub: who?.id || 'zach',
    name: resolvedName,
    email: who?.email || 'zach@hanzo.ai',
    avatar: who?.avatar || '/agents/zach.jpg',
    owner: activeOrg?.org ?? 'hanzo',
  }

  const currentOrgInfo = {
    name: activeOrg?.url ?? 'hanzo',
    displayName: activeOrg?.name ?? 'Hanzo',
  }
  const orgList = all.map((s) => ({ name: s.url, displayName: s.name }))

  return (
    <Screen style={{ backgroundColor: paint.ground }}>
      <BusinessHeader
        currentOrg={currentOrgInfo}
        onNavigate={reach}
        navSpan={NAV}
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

        {/* Col 2: 244px Discord × Mattermost Channel, Voice & Workspace Sidebar */}
        {inlineNavOpen ? (
          <YStack width={NAV} shrink={0} minH={0} data-parity-key="shell.nav">
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
        <SheetContent side="left" width={NAV} p={0} style={{ backgroundColor: paint.sidebar }}>
          <UnifiedSidebar
            userName={userIdentity.name}
            userEmail={userIdentity.email}
            userAvatar={userIdentity.avatar}
            onSignOut={leave}
          />
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
