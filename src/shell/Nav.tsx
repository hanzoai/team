/**
 * THE NAVIGATOR — the column between the rail and main, and the vocabulary every
 * surface's navigator is written in.
 *
 * It sits on the app ground rather than on a panel of its own, which is why
 * nothing below has a surface: the reference draws NO background on a row,
 * selected or otherwise — the selected row's median luminance across the whole
 * column is the ground's — and the structure comes from weight, colour and one
 * hairline. A selection background here reads as a different product.
 *
 * Colour is a gui token on every prop. `~/theme`'s `paint.*` are `var(--team-…)`
 * strings, which gui's props reject by type: they are for CSS, and the neutral
 * ladder has a token for every rung this column needs.
 */
import { Input, ScrollArea, Separator, SizableText, XStack, YStack } from '@hanzo/ui'
import { ChevronDown, Search } from '@hanzogui/lucide-icons-2'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'

import { FIELD, ICON, LABEL, LEAF, PAD, ROW, SPINE } from './measure.ts'
import { press } from './press.ts'
import { paint, round, rung } from '~/theme/theme'

/** The system's ring, stated once for the column. */
const RING = { outlineColor: '$outlineColor', outlineWidth: 2, outlineStyle: 'solid' } as const

/**
 * A row's axis, for the one row that is an anchor.
 *
 * `asChild` hands gui's styles to the element you wrote, but not the frame's own
 * defaults, and a stack's direction is one of those: measured, the anchor came
 * out `flex-direction: column`, so the glyph sat above the label and a 36px row
 * carried 56px of content. Stating it as a style rather than as a prop is what
 * reaches the rendered element — a `flexDirection` prop is dropped on the same
 * path the default is.
 */
const ROW_AXIS = { flexDirection: 'row' } as const

/** The navigator's own chrome: its surface title, then whatever the surface puts in it.
 *  Organization switching and the user account menu live in the universal top BusinessHeader. */
export const Nav = ({ title, children }: { title: string; children: ReactNode }) => (
  <YStack flex={1} minH={0} pt={6} pb={8}>
    <XStack height={36} px={PAD} pb={4} items="center" justify="space-between">
      <XStack items="center" gap={4} minW={0}>
        <SizableText fontSize={rung.row} fontWeight="600" color="$ink" numberOfLines={1}>
          {title}
        </SizableText>
        <ChevronDown size={13} color="$soft" />
      </XStack>
    </XStack>
    {children}
  </YStack>
)

/**
 * The search field. `$panel` over the ground, so it reads as a well rather than
 * a raised thing — measured at +4 luminance over the ground, the same step the
 * board's panel takes.
 */
export const Find = ({ value, onChange }: { value: string; onChange: (q: string) => void }) => (
  <XStack
    mx={PAD}
    height={FIELD}
    items="center"
    gap={8}
    px={12}
    rounded={round.field}
    borderWidth={1}
    borderColor="$edge"
    bg="$panel"
    focusWithinStyle={RING}
  >
    <Search size={16} color="$soft" />
    <Input
      flex={1}
      unstyled
      height={FIELD - 2}
      borderWidth={0}
      bg="transparent"
      fontSize={rung.body}
      color="$ink"
      placeholderTextColor="$faint"
      placeholder="Search…"
      value={value}
      onChangeText={onChange}
    />
  </XStack>
)

/** The hairline between groups of rows. */
export const Rule = () => <Separator my={6} mx={PAD} borderColor="$edge" />

/** A group's name. Clean sentence case with optional disclosure and count, matching Projects & Recents. */
export const Group = ({
  children,
  count,
  open = true,
  onToggle,
}: {
  children: ReactNode
  count?: number
  open?: boolean
  onToggle?: () => void
}) => (
  <XStack
    {...(onToggle ? press(onToggle) : {})}
    height={26}
    items="center"
    justify="space-between"
    px={PAD}
    gap={5}
  >
    <XStack items="center" gap={4} minW={0} flex={1}>
      {onToggle ? <Chevron open={open} /> : null}
      <SizableText fontSize={12} fontWeight="500" color="$soft" numberOfLines={1}>
        {children}
      </SizableText>
    </XStack>
    {count !== undefined ? (
      <SizableText fontSize={rung.chip} color="$faint">
        {count}
      </SizableText>
    ) : null}
  </XStack>
)

/** The disclosure mark. Drawn rather than imported, so it can turn. */
const Chevron = ({ open = true }: { open?: boolean }) => (
  <YStack width={ICON} height={ICON} items="center" justify="center" rotate={open ? '0deg' : '-90deg'}>
    <YStack
      width={7}
      height={7}
      borderBottomWidth={1.5}
      borderRightWidth={1.5}
      borderColor="$soft"
      rotate="45deg"
      mt={-3}
    />
  </YStack>
)

/**
 * A row that goes somewhere.
 *
 * Selection is COLOUR AND WEIGHT and nothing else — measured, and the one thing
 * about this column that is not a matter of taste. Hover is a faint ground,
 * which the reference cannot show and is ours: it lands on a different channel
 * from selection, so a hovered row and the selected row never compete.
 */
export const Row = ({ to, icon, children, indent }: {
  to: string
  icon?: ReactNode
  children: ReactNode
  /** A row under an open project: shorter, no glyph, same label column. */
  indent?: boolean
}) => {
  const { pathname } = useLocation()
  const here = pathname === to || pathname.startsWith(`${to}/`)

  return (
    <XStack
      asChild
      style={here ? { ...ROW_AXIS, backgroundColor: paint.rowActive } : ROW_AXIS}
      height={indent ? LEAF : ROW}
      items="center"
      gap={8}
      pl={indent ? LABEL - 4 : PAD - 2}
      pr={PAD - 2}
      mx={6}
      rounded={8}
      hoverStyle={here ? undefined : { bg: '$hover' }}
      focusVisibleStyle={RING}
    >
      <Link to={to} aria-current={here ? 'page' : undefined}>
        {icon ? (
          <YStack width={ICON} height={ICON} items="center" justify="center">
            {icon}
          </YStack>
        ) : null}
        <SizableText
          fontSize={rung.small}
          fontWeight={here ? '500' : '400'}
          color={here ? '$ink' : '$quiet'}
          numberOfLines={1}
        >
          {children}
        </SizableText>
      </Link>
    </XStack>
  )
}

/** A row that opens what is under it rather than going anywhere. */
export const Fold = ({ icon, children, open, onPress }: {
  icon?: ReactNode
  children: ReactNode
  open: boolean
  onPress: () => void
}) => (
  <XStack
    {...press(onPress)}
    aria-expanded={open}
    height={ROW}
    items="center"
    gap={8}
    px={PAD}
    mx={4}
    rounded={round.field}
    hoverStyle={{ bg: '$hover' }}
    focusVisibleStyle={RING}
  >
    {icon ? (
      <YStack width={ICON} height={ICON} items="center" justify="center">
        {icon}
      </YStack>
    ) : null}
    <SizableText fontSize={rung.row} color="$quiet" numberOfLines={1}>
      {children}
    </SizableText>
  </XStack>
)

/** The line under an open project, at its glyph's centre, so the rows under it
 *  read as hanging off it rather than as another flat list. */
export const Spine = ({ children }: { children: ReactNode }) => (
  <YStack position="relative">
    <YStack position="absolute" l={SPINE + 4} t={0} b={0} width={1} bg="$edge" />
    {children}
  </YStack>
)

/** The scrolling part of a navigator. Everything above it stays put. */
export const Roll = ({ children }: { children: ReactNode }) => (
  <ScrollArea flex={1} minH={0}>
    <YStack pb={PAD}>{children}</YStack>
  </ScrollArea>
)
