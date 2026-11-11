import { useState, type ReactNode } from 'react'
import { SizableText, Spinner, XStack, YStack } from '@hanzo/ui'

import { caps, chip, gap, paint, round, rung, state } from '~/theme/theme.ts'

/**
 * Team at work, drawn rather than pictured, for the signed-out page: a channel
 * where a person hands a task to an agent and the agent answers with the issue
 * it moved. It is the same primitives and tokens as the app itself, so it costs
 * no image and no request and wears whatever the sheet says, and it reads at
 * phone width: below NARROW the channel list folds away and the thread takes
 * the whole width.
 *
 * Hidden from assistive technology. It is a picture of a conversation nobody
 * had, and the three lines under it (`Points`) say what it shows.
 */
const NARROW = 520

const CHANNELS = ['general', 'engineering', 'revenue', 'support'] as const
const HERE = 'engineering'

export const Preview = () => {
  const [wide, setWide] = useState(true)

  return (
    <div aria-hidden="true" style={{ width: '100%', maxWidth: 780 }}>
      <YStack
        width="100%"
        rounded={round.panel}
        bg={paint.panel}
        borderWidth={1}
        borderColor={paint.rule}
        overflow="hidden"
        onLayout={(e: { nativeEvent: { layout: { width: number } } }) =>
          setWide(e.nativeEvent.layout.width >= NARROW)
        }
      >
        <XStack px={gap.inset} py={gap.tight} gap={gap.tight} items="center" borderBottomWidth={1} borderColor={paint.rule}>
          {[0, 1, 2].map((i) => (
            <YStack key={i} width={8} height={8} rounded={round.pill} bg={paint.rule} />
          ))}
          <SizableText size={rung.chip} color={paint.dim} ml={gap.tight}>
            hanzo.team
          </SizableText>
        </XStack>

        <XStack>
          {wide ? (
            <YStack width={168} p={gap.inset} gap={gap.tight} borderRightWidth={1} borderColor={paint.rule}>
              <SizableText {...caps} size={rung.chip} color={paint.dim}>
                Channels
              </SizableText>
              {CHANNELS.map((c) => (
                <XStack key={c} px={gap.tight} py={4} rounded={round.field} bg={c === HERE ? paint.card : undefined}>
                  <SizableText size={rung.small} color={c === HERE ? paint.ink : paint.mute}>
                    # {c}
                  </SizableText>
                </XStack>
              ))}
            </YStack>
          ) : null}

          <YStack flex={1} minW={0} p={gap.inset} gap={gap.inset}>
            <SizableText size={rung.small} color={paint.ink} fontWeight="600">
              # {HERE}
            </SizableText>

            <Said who="Ana" text="@dev refunds are missing from the checkout webhook. Can you take it?" />

            <Said who="Dev" agent text="On it. Fixed the handler and opened a pull request: 14 of 14 checks pass.">
              <XStack
                mt={gap.tight}
                p={gap.tight}
                gap={gap.tight}
                items="center"
                rounded={round.card}
                bg={paint.card}
                borderWidth={1}
                borderColor={paint.rule}
              >
                <YStack width={8} height={8} rounded={round.pill} bg={state.doing} />
                <SizableText size={rung.chip} color={paint.dim}>
                  TEAM-142
                </SizableText>
                <SizableText size={rung.small} color={paint.ink} flex={1} minW={0} numberOfLines={1}>
                  Refunds missing from checkout webhook
                </SizableText>
                <SizableText size={rung.chip} color={paint.mute}>
                  In review
                </SizableText>
              </XStack>
            </Said>

            <XStack items="center" gap={gap.tight}>
              <Spinner size={16} />
              <SizableText size={rung.small} color={paint.dim}>
                Dev is deploying the fix…
              </SizableText>
            </XStack>
          </YStack>
        </XStack>
      </YStack>
    </div>
  )
}

/**
 * One message: the sender's initial in their slot's hue, their name (and that
 * they are an agent), what they said, and what they attached under it.
 */
const Said = ({ who, agent = false, text, children }: { who: string; agent?: boolean; text: string; children?: ReactNode }) => {
  return (
    <XStack gap={gap.tight} items="flex-start">
      <YStack width={26} height={26} rounded={round.pill} items="center" justify="center" style={chip(who)} shrink={0}>
        <SizableText size={rung.chip} fontWeight="700" style={{ color: chip(who).color }}>
          {who[0]}
        </SizableText>
      </YStack>
      <YStack flex={1} minW={0} gap={2}>
        <XStack items="center" gap={gap.tight}>
          <SizableText size={rung.small} color={paint.ink} fontWeight="600">
            {who}
          </SizableText>
          {agent ? (
            <XStack px={6} py={1} rounded={round.field} borderWidth={1} borderColor={paint.rule}>
              <SizableText size={rung.chip} color={paint.mute}>
                Agent
              </SizableText>
            </XStack>
          ) : null}
        </XStack>
        <SizableText size={rung.small} color={paint.mute}>
          {text}
        </SizableText>
        {children}
      </YStack>
    </XStack>
  )
}

const POINTS = [
  ['Channels', 'Your people and your agents, in one conversation.'],
  ['Agents', 'Hand an agent the work; it reports back when it is done.'],
  ['Issue boards', 'Every task from backlog to done, on one board.'],
] as const

/** What Team is, in three lines, under the picture of it. */
export const Points = () => (
  <XStack width="100%" maxW={780} gap={gap.wide} flexWrap="wrap">
    {POINTS.map(([title, line]) => (
      <YStack key={title} flex={1} minW={200} gap={4}>
        <SizableText size={rung.body} color={paint.ink} fontWeight="600">
          {title}
        </SizableText>
        <SizableText size={rung.small} color={paint.mute}>
          {line}
        </SizableText>
      </YStack>
    ))}
  </XStack>
)
