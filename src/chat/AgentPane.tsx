/**
 * THE AGENT PANE — who the reader is talking to, from the roster and nothing
 * else. In a conversation with an agent the aside names it; anywhere else it
 * is the workspace Inbox. The agent's computer, schedule and settings are not
 * drawn here: they are hanzo.bot's, and the pane links there.
 */
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { ArrowUpRight, X } from '@hanzogui/lucide-icons-2'

import { useSpace } from '~/data/space.tsx'
import { Inbox } from '~/inbox'
import { press, useAsideKind } from '~/shell'
import { hideAside } from '~/shell/aside.ts'
import { PAD } from '~/shell/measure.ts'
import { paint, ring, round, rung } from '~/theme/theme'
import { hanzoBot } from './bots.ts'
import { useAgentHere } from './here.ts'
import { Face } from './Face.tsx'

export function AgentPane() {
  const asideKind = useAsideKind()
  const agent = useAgentHere()
  const org = useSpace().current?.org ?? null
  if (!agent || asideKind === 'inbox') return <Inbox />

  return (
    <YStack flex={1} minH={0} px={PAD} pt={12} pb={PAD} gap={14}>
      <XStack items="center" justify="space-between">
        <SizableText fontSize={rung.small} fontWeight="600" color="$quiet">
          {`${agent.name} · Agent`}
        </SizableText>
        <XStack
          {...press(hideAside, 'Close inspector')}
          width={24}
          height={24}
          items="center"
          justify="center"
          rounded={round.field}
          hoverStyle={{ background: paint.card }}
          focusVisibleStyle={ring}
        >
          <X size={14} color={paint.dim} />
        </XStack>
      </XStack>
      <YStack items="center" gap={6}>
        <Face person={agent} size={52} />
        <SizableText fontSize={rung.body} fontWeight="600" color="$ink">
          {agent.name}
        </SizableText>
      </YStack>
      <SizableText fontSize={rung.small} color="$dim" text="center">
        {`Mention @${agent.name} in a channel to ask it there. Its own thread, computer and schedule are on hanzo.bot.`}
      </SizableText>
      <XStack
        asChild
        self="center"
        px={10}
        py={6}
        rounded={round.field}
        borderWidth={1}
        borderColor="$edge"
        items="center"
        gap={6}
        hoverStyle={{ background: paint.card }}
        focusVisibleStyle={ring}
      >
        <a href={hanzoBot(agent.name, org)} target="_blank" rel="noopener">
          <SizableText fontSize={rung.small} fontWeight="500" color="$ink">
            Open on hanzo.bot
          </SizableText>
          <ArrowUpRight size={13} color={paint.dim} />
        </a>
      </XStack>
    </YStack>
  )
}
