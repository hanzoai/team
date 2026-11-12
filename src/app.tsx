import { useEffect } from 'react'
import { BrowserRouter, useRoutes } from 'react-router'
import { Hanzo, Toaster, TooltipProvider } from '@hanzo/ui'
import { Consent } from '@hanzo/ui/consent'
import { iam } from '~/data/iam.ts'
import { Session } from '~/data/session.tsx'
import { Space } from '~/data/space.tsx'
import { routes } from '~/routes'
import { AuthGate } from '~/login/Login.tsx'
import { Serve } from '~/serve.tsx'
import {
  applyAppearanceToDocument,
  readAppearancePreferences,
  syncAccountAppearance,
  useHanzoPreferences,
} from '~/settings/preferences.ts'

const Routed = () => useRoutes(routes)

/** How long a hint waits before it appears, everywhere. ONE provider, so the
 *  product cannot have two hover speeds depending on which subtree the pointer
 *  is in — and the rail is glyphs alone, so every one of them has a hint. */
const HINT = 200

const AppearanceBridge = () => {
  const { effectiveTheme } = useHanzoPreferences()
  useEffect(() => {
    applyAppearanceToDocument(readAppearancePreferences())
    void syncAccountAppearance(iam().getAccessToken())
  }, [])
  return <Toaster theme={effectiveTheme} position="top-center" />
}

export const App = () => (
  <Hanzo>
    <TooltipProvider delay={HINT}>
      <Session>
        <Space>
          <Serve />
          <AuthGate>
            <BrowserRouter>
              <Routed />
            </BrowserRouter>
          </AuthGate>
        </Space>
      </Session>
    </TooltipProvider>
    <AppearanceBridge />
    <Consent floating={false} />
  </Hanzo>
)
