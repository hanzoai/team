import { BrowserRouter, useRoutes } from 'react-router'
import { Hanzo, Toaster, TooltipProvider } from '@hanzo/ui'
import { Consent } from '@hanzo/ui/consent'
import { Session } from '~/data/session.tsx'
import { Space } from '~/data/space.tsx'
import { routes } from '~/routes'
import { Doorway } from '~/login/Doorway.tsx'
import { Serve } from '~/serve.tsx'

const Routed = () => useRoutes(routes)

/** How long a hint waits before it appears, everywhere. ONE provider, so the
 *  product cannot have two hover speeds depending on which subtree the pointer
 *  is in — and the rail is glyphs alone, so every one of them has a hint. */
const HINT = 200

/**
 * `Hanzo` carries the stylesheet and the theme context, so it wraps the router
 * rather than sitting inside a route: a theme that mounts per route re-mounts
 * every provider under it on every navigation.
 *
 * `Doorway` is the one place a stranger is turned around, and it is above the
 * router rather than inside it — and below `Space`, because the last thing it
 * has to answer for is a session this workspace has no account for: a check per screen is a check a new screen
 * forgets, and the screen it forgets on renders somebody else's board.
 *
 * `Session` and `Space` are LOAD-BEARING and not decoration: every region reads
 * one of them, and a tree without them throws `useSpace outside <Space>` on the
 * first render of the navigator, the chat and the board alike. They sit here
 * for the same reason the theme does — who this browser is, and which org and
 * space they are acting in, are settled once per visit rather than once per
 * screen. `Serve` hands each region its backend and renders nothing.
 *
 * `Toaster` is not a provider and wraps nothing; it is the viewport `toast()`
 * paints into, mounted once, here, because a second one renders every message
 * twice. Its theme is forced rather than `system`: the product is dark, and
 * `system` paints a light toast over a dark page for anyone whose OS disagrees.
 *
 * `Consent` is the cookie banner and the preference sheet, @hanzo/ui's one
 * component: where cloud's rule asks first (the EU, the UK and the rest of the
 * opt-in regions), the ad tags wait on it (main.tsx `startTags`). It draws no
 * floating button: the rail's account menu holds "Your Privacy Choices".
 */
export const App = () => (
  <Hanzo>
    <TooltipProvider delay={HINT}>
      <Session>
        <Space>
          <Serve />
          <Doorway>
            <BrowserRouter>
              <Routed />
            </BrowserRouter>
          </Doorway>
        </Space>
      </Session>
    </TooltipProvider>
    <Toaster theme="dark" position="top-center" />
    <Consent floating={false} />
  </Hanzo>
)
