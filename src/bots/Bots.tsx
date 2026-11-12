/**
 * THE BOTS SURFACE — the Bots app @hanzo/app draws, the same component hanzo.bot
 * draws, so a bot made there is here with its conversation: one list and one
 * thread, read from `/v1/agents` with the reader's own token.
 *
 * Nothing about a bot is kept by this client. What it supplies is what only the
 * host knows: the session (the provider the app's hooks read, built from the
 * same settings as this app's own IAM client), the org this app works in (the
 * open space's), the address (`?bot=`, held by this app's router) and where its
 * links go. The roster's foot is off: this app's rail and bar already hold the
 * account and the other apps.
 */
import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { IamProvider } from '@hanzo/iam/react'
import { configure } from '@hanzo/app/where'
import { pick } from '@hanzo/app/lib/session'
import { Bots as App } from '@hanzo/app/bots/Bots'

import { config } from '~/data/iam.ts'
import { useSpace } from '~/data/space.tsx'

configure({ site: 'https://hanzo.ai', home: '/', brand: 'Hanzo Team', signUp: '/start' })

export function Bots() {
  const settings = useMemo(() => config(), [])
  const [params, setParams] = useSearchParams()
  const { current } = useSpace()

  // The app scopes every read by the org it works in; here that is the open space's.
  useEffect(() => {
    if (current?.org) pick(current.org)
  }, [current?.org])

  return (
    <IamProvider config={settings}>
      <App
        foot={false}
        bot={params.get('bot')}
        onBot={(name, step) =>
          setParams(
            (now) => {
              const next = new URLSearchParams(now)
              if (name) next.set('bot', name)
              else next.delete('bot')
              return next
            },
            { replace: !step },
          )
        }
      />
    </IamProvider>
  )
}
