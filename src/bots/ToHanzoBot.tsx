/**
 * `/bots` — hanzo.bot, in the org this space works in.
 *
 * Working with one bot up close (its own thread, its computer, its schedule,
 * making one) is hanzo.bot's app, and hanzo.team no longer draws a second copy
 * of it. Bots as teammates stay here, in Chat: a direct message with one, or an
 * @-mention in a channel. This address is kept so the rail, a stale bookmark
 * and an old `/bots?bot=<name>` link all still arrive somewhere: hanzo.bot, open
 * on that bot, in the open space's org.
 *
 * The visit is replaced rather than added to, so Back from hanzo.bot returns to
 * the page before this one instead of bouncing here again.
 */
import { EmptyState } from '@hanzo/ui/product'
import { Bot } from '@hanzogui/lucide-icons-2'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router'

import { hanzoBot } from '~/chat/bots.ts'
import { Middle } from '~/chat/List.tsx'
import { useSpace } from '~/data/space.tsx'

export function ToHanzoBot() {
  const [params] = useSearchParams()
  const { standing, current } = useSpace()
  const to = hanzoBot(params.get('bot'), current?.org)
  // Until the space is known the org is not, and a link without it opens
  // whichever org hanzo.bot last had.
  const known = standing !== 'unknown'

  useEffect(() => {
    if (known) window.location.replace(to)
  }, [known, to])

  return (
    <Middle>
      <EmptyState
        icon={Bot}
        title="Opening hanzo.bot"
        description="A bot's own thread, computer and schedule are on hanzo.bot. In Hanzo Team, talk to a bot in Chat."
        primary={{ label: 'Open hanzo.bot', onPress: () => window.location.replace(to) }}
      />
    </Middle>
  )
}
