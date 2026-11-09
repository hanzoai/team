import { Button, SizableText, Spinner, YStack } from '@hanzo/ui'
import { useEffect, type ReactNode } from 'react'

import { fixture } from '~/data/fixture.ts'
import { useSession } from '~/data/session.tsx'
import { useSpace } from '~/data/space.tsx'
import { gap, paint, rung } from '~/theme/theme.ts'

import { Callback } from './Callback.tsx'
import { Login } from './Login.tsx'
import { cart, START } from './start.ts'

/** Where the issuer returns a browser. Registered at IAM, so it is fixed. */
const CALLBACK = '/auth/callback'

/**
 * The door, and there is one.
 *
 * A product that reads a person's own work cannot be entered by a stranger, so
 * the whole tree sits behind this rather than each screen checking for itself —
 * a check per screen is a check a new screen forgets, and the screen it forgets
 * on is the one that renders somebody else's board.
 *
 * It answers the callback address HERE, above the router, because that renders
 * while the browser still has no identity and every route below expects one.
 * /start is answered here for the same reason: it forwards to the checkout,
 * which signs a stranger in itself (./start.ts).
 * And `unknown` draws neither door: a flash of the sign-in screen in front of
 * somebody who is already signed in is worse than a moment of nothing.
 *
 * `?state=` opens it, because a fixture stands in for the whole plane and a
 * session is part of the plane. That is what makes a deterministic capture of
 * any screen possible without a credential — and it is the SAME knob, not a
 * second one: a build that could be entered another way would be a way in.
 */
export const Doorway = ({ children }: { children: ReactNode }) => {
  const { standing: session } = useSession()
  const { standing: space, refusal, enrolment } = useSpace()

  if (window.location.pathname === CALLBACK) return <Callback />
  if (window.location.pathname === START) return <Forward to={cart(window.location.search, window.location.origin)} />
  if (fixture.on) return <>{children}</>
  if (session === 'unknown') return <Waiting />
  if (session === 'out' && window.location.pathname === '/login') return <Login />

  // Signed in to Hanzo, and unknown to this workspace. The account and the
  // person's first space are made by the workspace's own sign-in, and nothing
  // else makes them — so the way through is to walk it once.
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

/** Leaves for `to`, replacing this entry so Back does not return to a forward. */
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
