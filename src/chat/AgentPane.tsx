/**
 * THE AGENT PANE — who the reader is talking to, from the roster and nothing
 * else. In a conversation with an agent the aside names it; anywhere else it
 * is the workspace Inbox. Tabs for a library or a computer screen are not
 * here: the server returns nothing to put in them.
 */
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { X } from '@hanzogui/lucide-icons-2'

import { Inbox } from '~/inbox'
import { press, useAsideKind } from '~/shell'
import { hideAside } from '~/shell/aside.ts'
import { PAD } from '~/shell/measure.ts'
import { paint, ring, round, rung } from '~/theme/theme'
import { useAgentHere } from './here.ts'
import { Face } from './Face.tsx'

export function AgentPane() {
  const asideKind = useAsideKind()
  const agent = useAgentHere()
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
    </YStack>
  )
}
