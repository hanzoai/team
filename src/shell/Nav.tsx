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
import { Popover, Separator } from '@hanzo/gui'
import { Input, ScrollArea, SizableText, XStack, YStack } from '@hanzo/ui'
import { OrgMark } from '@hanzo/ui/product'
import { Check, ChevronDown, Plus, Search } from '@hanzogui/lucide-icons-2'
import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'

import { useSpace } from '~/data/space.tsx'
import { openConnectModal } from './ConnectOrgModal.tsx'
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

/** The navigator's own chrome: first-class Org Switcher (`Orgs` + `X-Org-Id`),
 *  ⌘K command trigger, ⌘B collapse button, then whatever the surface puts in it. */
export const Nav = ({ title, children }: { title: string; children: ReactNode }) => {
  const { all, current, choose } = useSpace()
  const [orgMenuOpen, setOrgMenuOpen] = useState(false)
  const activeOrg = current ?? all[0] ?? null
  const activeOrgLabel = activeOrg?.name?.trim() || title
  const activeOrgId = activeOrg?.org || activeOrg?.url || 'hanzo'
  const showSurfaceTag = Boolean(activeOrg?.name?.trim() && title && activeOrg.name.trim() !== title)

  return (
    <YStack flex={1} minH={0} pt={6} pb={8}>
      <XStack height={38} px={PAD} pb={4} items="center" justify="space-between" gap={6}>
        <Popover
          open={orgMenuOpen}
          onOpenChange={setOrgMenuOpen}
          placement="bottom-start"
          allowFlip
          stayInFrame
        >
          <Popover.Trigger asChild>
            <XStack
              {...press(() => setOrgMenuOpen((v) => !v), `Switch organization (${activeOrgLabel})`)}
              items="center"
              gap={6}
              px={5}
              py={3}
              ml={-5}
              rounded={round.field}
              minW={0}
              flex={1}
              hoverStyle={{ bg: '$hover' }}
              focusVisibleStyle={RING}
              data-testid="sidebar-org-switcher-trigger"
            >
              <OrgMark org={{ name: activeOrgLabel }} size={18} />
              <YStack minW={0} flex={1}>
                <XStack items="center" gap={4} minW={0}>
                  <SizableText fontSize={rung.body} fontWeight="600" color="$ink" numberOfLines={1}>
                    {activeOrgLabel}
                  </SizableText>
                  <ChevronDown size={12} color="$soft" />
                </XStack>
                {showSurfaceTag ? (
                  <SizableText fontSize={rung.chip} color="$faint" numberOfLines={1}>
                    {title} · {activeOrgId}
                  </SizableText>
                ) : null}
              </YStack>
            </XStack>
          </Popover.Trigger>

          <Popover.Content
            role="menu"
            aria-label="Organizations switcher"
            borderWidth={1}
            borderColor="$edge"
            bg="$panel"
            rounded={round.panel}
            p={8}
            width={236}
            style={{ zIndex: 100000 }}
            data-testid="sidebar-org-switcher-menu"
          >
            <YStack gap={4} width="100%">
              <XStack px={6} py={2} items="center" justify="space-between">
                <SizableText fontSize={rung.chip} fontWeight="600" color="$faint">
                  ORGANIZATIONS (X-ORG-ID)
                </SizableText>
                <SizableText fontSize={rung.chip} color="$faint">
                  {Math.max(all.length, 1)}
                </SizableText>
              </XStack>
              {all.length > 0 ? (
                all.map((space) => {
                  const active = space.url === activeOrg?.url
                  return (
                    <XStack
                      key={space.url}
                      {...press(() => {
                        setOrgMenuOpen(false)
                        if (!active) choose(space.url)
                      }, `Switch to organization ${space.name}`)}
                      px={8}
                      py={6}
                      gap={8}
                      rounded={round.field}
                      style={active ? { backgroundColor: paint.rowActive } : undefined}
                      hoverStyle={active ? undefined : { bg: '$hover' }}
                      items="center"
                      justify="space-between"
                      data-testid={`sidebar-org-option-${space.url}`}
                    >
                      <XStack items="center" gap={8} minW={0} flex={1}>
                        <OrgMark org={{ name: space.name }} size={18} />
                        <YStack minW={0} flex={1}>
                          <SizableText
                            fontSize={rung.small}
                            fontWeight={active ? '600' : '500'}
                            color="$ink"
                            numberOfLines={1}
                          >
                            {space.name}
                          </SizableText>
                          <SizableText fontSize={rung.chip} color="$faint" numberOfLines={1}>
                            {space.org || space.url}
                          </SizableText>
                        </YStack>
                      </XStack>
                      {active ? <Check size={13} color="$ink" /> : null}
                    </XStack>
                  )
                })
              ) : (
                <XStack
                  px={8}
                  py={6}
                  gap={8}
                  rounded={round.field}
                  style={{ backgroundColor: paint.rowActive }}
                  items="center"
                  justify="space-between"
                >
                  <XStack items="center" gap={8} minW={0} flex={1}>
                    <OrgMark org={{ name: activeOrgLabel }} size={18} />
                    <YStack minW={0} flex={1}>
                      <SizableText fontSize={rung.small} fontWeight="600" color="$ink" numberOfLines={1}>
                        {activeOrgLabel}
                      </SizableText>
                      <SizableText fontSize={rung.chip} color="$faint" numberOfLines={1}>
                        {activeOrgId}
                      </SizableText>
                    </YStack>
                  </XStack>
                  <Check size={13} color="$ink" />
                </XStack>
              )}
              <Separator my={2} borderColor="$edge" />
              <XStack
                {...press(() => {
                  setOrgMenuOpen(false)
                  openConnectModal('connect')
                }, 'Connect organization')}
                px={8}
                py={5}
                gap={6}
                rounded={round.field}
                hoverStyle={{ bg: '$hover' }}
                items="center"
              >
                <Plus size={13} color="$soft" />
                <SizableText fontSize={rung.small} color="$quiet">
                  Connect organization…
                </SizableText>
              </XStack>
            </YStack>
          </Popover.Content>
        </Popover>

        <XStack items="center" gap={4} shrink={0}>
          <XStack
            {...press(() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
              }
            }, 'Open Command Palette (⌘K)')}
            height={24}
            px={7}
            rounded={round.field}
            borderWidth={1}
            borderColor="$edge"
            bg="$panel"
            items="center"
            justify="center"
            hoverStyle={{ bg: '$hover' }}
            focusVisibleStyle={RING}
            data-testid="nav-command-palette-trigger"
          >
            <SizableText fontSize={rung.chip} fontWeight="500" color="$quiet">
              ⌘K
            </SizableText>
          </XStack>
          <XStack
            {...press(() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('hanzo:team-toggle-sidebar'))
              }
            }, 'Toggle sidebar (⌘B)')}
            height={24}
            px={7}
            rounded={round.field}
            borderWidth={1}
            borderColor="$edge"
            items="center"
            justify="center"
            hoverStyle={{ bg: '$hover' }}
            focusVisibleStyle={RING}
            data-testid="nav-collapse-sidebar-trigger"
          >
            <SizableText fontSize={rung.chip} fontWeight="500" color="$quiet">
              ⌘B
            </SizableText>
          </XStack>
        </XStack>
      </XStack>
      {children}
    </YStack>
  )
}

/**
 * The search field. `$panel` over the ground, so it reads as a well rather than
 * a raised thing — measured at +4 luminance over the ground, the same step the
 * board's panel takes.
 */
export const Find = ({
  value,
  onChange,
  placeholder = 'Search…',
}: {
  value: string
  onChange: (q: string) => void
  placeholder?: string
}) => (
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
      placeholder={placeholder}
      value={value}
      onChangeText={onChange}
      data-testid="sidebar-find-input"
    />
  </XStack>
)

/** The hairline between groups of rows. */
export const Rule = () => <Separator my={6} mx={PAD} borderColor="$edge" />

/** A group's name. Clean sentence case with optional disclosure, count, and right action. */
export const Group = ({
  children,
  count,
  open = true,
  onToggle,
  action,
}: {
  children: ReactNode
  count?: number
  open?: boolean
  onToggle?: () => void
  action?: ReactNode
}) => (
  <XStack
    height={26}
    items="center"
    justify="space-between"
    px={PAD}
    gap={5}
  >
    <XStack
      {...(onToggle ? press(onToggle) : {})}
      items="center"
      gap={4}
      minW={0}
      flex={1}
    >
      {onToggle ? <Chevron open={open} /> : null}
      <SizableText fontSize={12} fontWeight="500" color="$soft" numberOfLines={1}>
        {children}
      </SizableText>
      {count !== undefined ? (
        <SizableText fontSize={rung.chip} color="$faint">
          {count}
        </SizableText>
      ) : null}
    </XStack>
    {action ?? null}
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
export const Row = ({ to, icon, children, indent, current }: {
  to: string
  icon?: ReactNode
  children: ReactNode
  /** A row under an open project: shorter, no glyph, same label column. */
  indent?: boolean
  /**
   * Whether this row is the page, for a row whose pages are not all under its
   * own address: an index at `/crm` that is not every page under `/crm`.
   */
  current?: (pathname: string) => boolean
}) => {
  const { pathname } = useLocation()
  const here = current ? current(pathname) : pathname === to || pathname.startsWith(`${to}/`)

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
