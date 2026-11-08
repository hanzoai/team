/**
 * THE RAIL — the app's spine: the inbox bell, one glyph per surface, the quick
 * launcher, and the user account menu anchored at the bottom-left corner (matching
 * Slack, Hanzo Desktop, and Hanzo Bot).
 *
 * The selected surface is a SOFT GLOW behind its glyph and a brighter glyph, not
 * a plate and not a pill.
 */
import { ScrollArea, Separator, SizableText, Tooltip, TooltipContent, TooltipTrigger, YStack } from '@hanzo/ui'
import { Bell, Plus } from '@hanzogui/lucide-icons-2'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'

import { RailAccountMenu, type RailAccountMenuProps } from './BusinessHeader.tsx'
import { useNotices } from './counts.ts'
import { ADD, GLOW, ICON, PAD, RAIL, STEP } from './measure.ts'
import { press } from './press.ts'
import { surfaceAt, SURFACES } from './surfaces.ts'
import { paint, round } from '~/theme/theme'

const RING = { outlineColor: '$outlineColor', outlineWidth: 2, outlineStyle: 'solid' } as const

/** The glow behind the selected glyph, from the same surface rung a raised thing
 *  uses — so it lifts with the theme rather than being a colour of its own. */
const HALO = { background: 'radial-gradient(closest-side, var(--surface-3, rgb(255 255 255 / .12)), transparent)' }

/** The one hue gui has no token for. Addressed-to-you is a categorical colour and
 *  it is `~/theme`'s, so it arrives as CSS rather than as a prop. */
const DOT = { background: paint.alert }

export type RailProps = {
  /** Whether the aside is showing, so the bell can say so. */
  notices: boolean
  onNotices: () => void
  /** The shell decides what a surface tap means: at this width it may open the
   *  navigator's drawer rather than go where you already are. */
  onSurface: (path: string) => void
  /** Account menu props rendered at the bottom-left corner of the rail. */
  account?: RailAccountMenuProps
}

export const Rail = ({ notices, onNotices, onSurface, account }: RailProps) => {
  const { pathname } = useLocation()
  const waiting = useNotices()

  return (
    <YStack
      width={RAIL}
      shrink={0}
      height="100%"
      items="center"
      justify="space-between"
      pt={8}
      pb={12}
      bg="$background"
      borderRightWidth={1}
      borderColor="$edge"
      data-parity-key="shell.rail"
    >
      <ScrollArea flex={1} minH={0} width="100%">
        <YStack items="center" width="100%" gap={2}>
          <Slot
            label={
              waiting > 0
                ? `${notices ? 'Hide' : 'Show'} Activity (${waiting} unread)`
                : notices
                  ? 'Hide Activity'
                  : 'Show Activity'
            }
            pressed={notices}
            onPress={onNotices}
          >
            <Bell size={ICON} color={notices ? '$ink' : '$soft'} />
            {waiting > 0 ? (
              <YStack
                position="absolute"
                t={4}
                r={3}
                minW={15}
                height={15}
                px={3}
                rounded={round.pill}
                items="center"
                justify="center"
                style={DOT}
              >
                <SizableText
                  fontSize={10}
                  lineHeight={12}
                  fontWeight="700"
                  style={{ color: paint.panel }}
                >
                  {waiting}
                </SizableText>
              </YStack>
            ) : null}
          </Slot>

          <Rule />

          {SURFACES.map((s) => {
            const here = surfaceAt(pathname)?.id === s.id
            return (
              <Slot key={s.id} label={s.label} here={here} onPress={() => onSurface(s.path)}>
                <s.icon size={ICON} color={here ? '$ink' : '$soft'} />
              </Slot>
            )
          })}
        </YStack>
      </ScrollArea>

      <YStack items="center" width="100%" gap={10} pt={6}>
        <Tooltip>
          <TooltipTrigger>
            <YStack
              {...press(() => onSurface('/apps'), 'Open Business Apps')}
              width={ADD}
              height={ADD}
              rounded={round.pill}
              borderWidth={1}
              borderStyle="dashed"
              borderColor="$edge"
              items="center"
              justify="center"
              hoverStyle={{ background: '$hover' }}
              focusVisibleStyle={RING}
            >
              <Plus size={15} color="$soft" />
            </YStack>
          </TooltipTrigger>
          <TooltipContent>All Hanzo Business Apps</TooltipContent>
        </Tooltip>

        <RailAccountMenu {...account} />
      </YStack>
    </YStack>
  )
}

const Rule = () => <Separator width={RAIL - PAD * 2} my={6} borderColor="$edge" />

const Slot = ({ label, here = false, pressed, onPress, children }: {
  label: string
  here?: boolean
  pressed?: boolean
  onPress: () => void
  children: ReactNode
}) => (
  <Tooltip>
    <TooltipTrigger>
      <YStack
        {...press(onPress, label)}
        aria-current={here ? 'page' : undefined}
        aria-pressed={pressed}
        width={STEP}
        height={STEP}
        items="center"
        justify="center"
        position="relative"
        rounded={round.field}
        focusVisibleStyle={RING}
      >
        {here ? (
          <YStack position="absolute" width={GLOW} height={GLOW} style={HALO} pointerEvents="none" />
        ) : null}
        {children}
      </YStack>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
)
