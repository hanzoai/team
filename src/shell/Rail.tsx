/**
 * THE RAIL — the app's spine: the mark, the gauge, the bell, one glyph per
 * surface, and the control that would add another.
 *
 * The selected surface is a SOFT GLOW behind its glyph and a brighter glyph, not
 * a plate and not a pill. Measured: across the rail's whole width the luminance
 * rises smoothly out of the ground over ~35px on every side of the icon, with no
 * edge anywhere, which is a radial gradient and not a rectangle. A plate here
 * reads as a different product, and it is the one thing about this column
 * somebody will get wrong.
 */
import { ScrollArea, Separator, SizableText, Tooltip, TooltipContent, TooltipTrigger, XStack, YStack } from '@hanzo/ui'
import { HanzoMark } from '@hanzo/ui/product'
import { Bell, Plus } from '@hanzogui/lucide-icons-2'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'

import { useSpace } from '~/data/space.tsx'
import { useNotices, useTodo } from './counts.ts'
import { press } from './press.ts'
import { ADD, GAUGE, GLOW, ICON, MARK, PAD, RAIL, STEP } from './measure.ts'
import { surfaceAt, SURFACES } from './surfaces.ts'
import { caps, paint, round, rung } from '~/theme/theme'

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
}

export const Rail = ({ notices, onNotices, onSurface }: RailProps) => {
  const { pathname } = useLocation()
  const waiting = useNotices()
  const { current } = useSpace()
  const orgName = current?.name ?? 'Hanzo AI'

  return (
    <YStack
      width={RAIL}
      shrink={0}
      height="100%"
      items="center"
      justify="space-between"
      pt={10}
      pb={10}
      bg="$background"
      borderRightWidth={1}
      borderColor="$edge"
      data-parity-key="shell.rail"
    >
      <ScrollArea flex={1} minH={0} width="100%">
        <YStack items="center" width="100%" gap={2}>
          {/* Single workspace mark at top of rail — org switching lives in the navigator header */}
          <Tooltip>
            <TooltipTrigger>
              <YStack
                {...press(() => onSurface('/chat'), orgName)}
                width={MARK}
                height={MARK}
                rounded="$4"
                items="center"
                justify="center"
                bg="$panel"
                borderWidth={1}
                borderColor="$edge"
                hoverStyle={{ background: '$hover' }}
              >
                <HanzoMark size={18} />
              </YStack>
            </TooltipTrigger>
            <TooltipContent>{orgName}</TooltipContent>
          </Tooltip>

          <Rule />

          <Slot
            label={
              waiting > 0
                ? `${notices ? 'Hide' : 'Show'} Inbox (${waiting} unread)`
                : notices
                  ? 'Hide Inbox'
                  : 'Show Inbox'
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

      <YStack items="center" width="100%" gap={8} pt={6}>
        <Gauge />

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
      </YStack>
    </YStack>
  )
}

const Rule = () => <Separator width={RAIL - PAD * 2} my={6} borderColor="$edge" />

/**
 * The value as a line. Two stacks rather than `Progress`, because that component
 * is a full-width control: it states `width="100%"` and lets its indicator run
 * past the track, which inside a 60px capsule paints a slab across the rail.
 */
const Bar = ({ value }: { value: number }) => (
  <YStack width="100%" height={4} rounded={round.pill} bg="$edge" overflow="hidden">
    <YStack width={`${value}%`} height="100%" bg="$ink" />
  </YStack>
)

/**
 * One place in the icon column: the touch target, the glow, and the glyph.
 *
 * `here` is a PLACE and `pressed` is a SWITCH, and they are separate because the
 * bell is not a surface: it turns the aside on and off without going anywhere,
 * so it announces itself pressed rather than current and it does not take the
 * glow. The reference agrees — only the surface you are on is lit.
 */
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

/**
 * THE GAUGE — how much of the work is still to do, as one figure.
 *
 * The reference draws it in the source brand's coral over a halftone field. The
 * texture is that brand's and does not come; the METER does, because it is what
 * the widget IS — a capsule that fills to the value with the figure over it.
 *
 * `null` is an em-dash, not a zero. Nothing to measure is not "0% to do", and a
 * gauge that invents a number is the one thing a gauge may not do. The number
 * arrives through `setTodo` from whoever holds the work; the rail has no data of
 * its own and cannot answer for a region it does not own.
 */
const Gauge = () => {
  const todo = useTodo()
  return (
    <YStack
      width={GAUGE.width}
      height={GAUGE.height}
      rounded="$5"
      borderWidth={1}
      borderColor="$edge"
      bg="$background"
      overflow="hidden"
      position="relative"
      aria-label={todo === null ? 'Nothing to do' : `${todo}% to do`}
    >
      {/* The value, as a level rising from the bottom. It is positioned, and
          everything else is not, so it paints UNDER the whole face — a
          positioned sibling paints above static ones whatever the order, which
          is how this covered the number, the bar and the label at once.

          The accent, held back to a wash: "how many" is what the accent is for,
          and at full strength a level this size is the loudest thing in a
          column of glyphs. A neutral surface rung is not an option — measured,
          one step over the ground is invisible at this size. */}
      <YStack
        position="absolute"
        l={0}
        r={0}
        b={0}
        height={`${todo ?? 0}%`}
        opacity={0.12}
        pointerEvents="none"
        style={{ backgroundColor: paint.accent }}
      />

      <YStack flex={1} z={1} p={4} items="center" justify="space-between">
        <YStack width="100%" rounded="$3" bg="$panel" borderWidth={1} borderColor="$edge" px={5} py={4} items="center">
          <XStack items="baseline" gap={1}>
            <SizableText fontSize={rung.small} lineHeight={16} fontWeight="700" color="$ink">
              {todo ?? '—'}
            </SizableText>
            {todo === null ? null : (
              <SizableText fontSize={9} lineHeight={11} color="$soft">
                %
              </SizableText>
            )}
          </XStack>
          <YStack height={3} />
          <Bar value={todo ?? 0} />
        </YStack>

        <SizableText {...caps} text="center" fontSize={9} fontWeight="600" color="$quiet">
          To do
        </SizableText>
      </YStack>
    </YStack>
  )
}
