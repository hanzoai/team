/**
 * THE BOARD'S HEAD — where you are, what it is called, and which view of it.
 *
 * Four rows in one band, and the band ends on a hairline that crosses the whole
 * panel. Every number is image-derived from the reference at 2048×1138 divided
 * by 1.5, the scale the port shares: crumb centre 39, title centre 71, tabs
 * centre 120, rule 139, panel top 11, left inset 24.
 *
 * The head is CHROME rather than data, so it stays put while the board below it
 * is loading, empty or refusing. A header that vanishes with its contents makes
 * three screens out of one.
 */
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  Separator, SizableText, XStack, YStack,
} from '@hanzo/ui'
import { CalendarDays, EllipsisVertical, Kanban, List, Plus, SlidersHorizontal } from '@hanzogui/lucide-icons-2'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { People } from './board/People.tsx'
import type { Person, Priority } from './board/model.ts'
import { PRIORITY } from './board/model.ts'
import { caps, paint, ring, round, rung } from '~/theme/theme'

/** The band: 20 above the crumb, then the three rows and the two gaps between
 *  them. Measured centres, ÷1.5 from the reference: crumb 39, title 71, tabs
 *  120, and the rule that ends the band at 139. */
const INSET = 16
const TOP = 12
const CRUMB = 20
const BAND = 4
const TITLE = 28
const REST = 10
const TABS = 34

/** The three views of a project's issues, in the order the reference draws
 *  them. A view is an ADDRESS, so these are links and not a tab control: the
 *  back button has to work. */
export const VIEWS = [
  { id: 'kanban', label: 'Kanban', icon: Kanban },
  { id: 'list', label: 'List', icon: List },
  { id: 'timeline', label: 'Timeline', icon: CalendarDays },
] as const

export type View = (typeof VIEWS)[number]['id']

/** One step of the trail. Only the last has no address — it is where you are. */
export type Step = { label: string; to?: string }

export type HeadProps = {
  trail: Step[]
  title: string
  /** The board's own address. A view hangs off it: `${base}/list`. */
  base: string
  here: View
  people: Person[]
  /** The priorities showing. Empty means all of them, which is also the label. */
  only: readonly Priority[]
  onOnly: (only: Priority[]) => void
  /** Absent where this board has no project to open an issue in. */
  onAdd?: () => void
}

export const Head = ({ trail, title, base, here, people, only, onOnly, onAdd }: HeadProps) => (
  <YStack data-parity-key="board.head" pt={TOP}>
    <XStack px={INSET} height={CRUMB} items="center" gap={8}>
      <Trail steps={trail} />
      <XStack flex={1} minW={0} />
      {people.length > 0 ? (
        <XStack rounded={round.pill} bg="$hover" px={6} py={2} items="center">
          <People people={people} size={24} show={4} ground={paint.card} />
        </XStack>
      ) : null}
      {onAdd ? <Menu onAdd={onAdd} /> : null}
    </XStack>

    <YStack height={BAND} />

    <XStack px={INSET} height={TITLE} items="center">
      <SizableText fontSize={rung.title} fontWeight="500" color="$ink">
        {title}
      </SizableText>
    </XStack>

    <YStack height={REST} />

    <XStack px={INSET - 6} height={TABS} items="flex-end" gap={4}>
      {VIEWS.map((v) => (
        <Tab key={v.id} to={v.id === 'kanban' ? base : `${base}/${v.id}`} here={v.id === here}>
          <v.icon size={16} color={v.id === here ? '$ink' : '$soft'} />
          <SizableText fontSize={rung.row} color={v.id === here ? '$ink' : '$soft'}>
            {v.label}
          </SizableText>
        </Tab>
      ))}
      <XStack flex={1} minW={0} />
      <Filter only={only} onOnly={onOnly} />
      {onAdd ? (
        <XStack
          role="button"
          tabIndex={0}
          cursor="pointer"
          height={TABS - 8}
          mb={3}
          px={10}
          items="center"
          gap={6}
          rounded={round.field}
          style={{ backgroundColor: paint.accent }}
          focusVisibleStyle={ring}
          aria-label="New issue"
          onPress={onAdd}
        >
          <Plus size={14} color={paint.ground} />
          <SizableText fontSize={rung.small} fontWeight="600" style={{ color: paint.ground }}>
            New issue
          </SizableText>
        </XStack>
      ) : null}
    </XStack>

    <Separator borderColor="$edge" />
  </YStack>
)

/** Where you are, one step at a time. The last step is where you already are,
 *  so it takes the accent and is not a link to itself. */
const Trail = ({ steps }: { steps: Step[] }) => (
  <XStack items="center" gap={8} minW={0}>
    {steps.map((step, i) => (
      <XStack key={`${step.label}-${i}`} items="center" gap={8} minW={0}>
        {i > 0 ? (
          <SizableText fontSize={rung.small} color="$faint">
            /
          </SizableText>
        ) : null}
        {step.to ? (
          <XStack asChild style={AXIS} rounded={round.field} focusVisibleStyle={ring}>
            <Link to={step.to}>
              <SizableText fontSize={rung.small} color="$soft" numberOfLines={1} hoverStyle={{ color: '$ink' }}>
                {step.label}
              </SizableText>
            </Link>
          </XStack>
        ) : (
          <SizableText
            fontSize={rung.small}
            numberOfLines={1}
            aria-current="page"
            style={{ color: paint.accent }}
          >
            {step.label}
          </SizableText>
        )}
      </XStack>
    ))}
  </XStack>
)

/** `asChild` hands gui's styles to the element you wrote and not the frame's own
 *  defaults, and a stack's direction is one of those. Stated as a style, which
 *  is what reaches the rendered element. */
const AXIS = { flexDirection: 'row', alignItems: 'center' } as const

/**
 * One view. The underline is the whole selected state — it is what the
 * reference draws and it is the one mark that survives the label going dim.
 */
const Tab = ({ to, here, children }: { to: string; here: boolean; children: ReactNode }) => (
  <YStack
    asChild
    style={{ alignItems: 'center' }}
    rounded={round.field}
    focusVisibleStyle={ring}
  >
    <Link to={to} aria-current={here ? 'page' : undefined}>
      <XStack height={TABS - 4} px={6} items="center" gap={8}>
        {children}
      </XStack>
      <YStack
        height={2}
        width="100%"
        rounded={round.pill}
        style={{ backgroundColor: here ? paint.accent : 'transparent' }}
      />
    </Link>
  </YStack>
)

/**
 * Which priorities the board shows.
 *
 * A menu of the four the model ranks, and nothing else: filtering by a field
 * the plane does not hold would be a control that lies. Nothing checked is
 * every issue, which is why the label says "Filter" until something is.
 */
const Filter = ({ only, onOnly }: { only: readonly Priority[]; onOnly: (only: Priority[]) => void }) => {
  const held = new Set(only)
  const toggle = (p: Priority) =>
    onOnly(held.has(p) ? only.filter((x) => x !== p) : [...only, p])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <XStack
          role="button"
          tabIndex={0}
          cursor="pointer"
          height={TABS - 4}
          px={8}
          items="center"
          gap={8}
          rounded={round.field}
          hoverStyle={{ background: '$hover' }}
          focusVisibleStyle={ring}
          aria-label="Filter issues"
        >
          <SlidersHorizontal size={16} color={only.length ? '$ink' : '$soft'} />
          <SizableText fontSize={rung.row} color={only.length ? '$ink' : '$soft'}>
            {only.length ? `Filter · ${only.length}` : 'Filter'}
          </SizableText>
        </XStack>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Priority</DropdownMenuLabel>
        {PRIORITY.map((p) => (
          <DropdownMenuCheckboxItem key={p} checked={held.has(p)} onCheckedChange={() => toggle(p)}>
            <SizableText {...caps} fontSize={rung.small}>
              {p}
            </SizableText>
          </DropdownMenuCheckboxItem>
        ))}
        {only.length ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onOnly([])}>Show every priority</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** The board's own menu. One item, because one is what this build does. */
const Menu = ({ onAdd }: { onAdd: () => void }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <XStack
        role="button"
        tabIndex={0}
        cursor="pointer"
        width={24}
        height={24}
        items="center"
        justify="center"
        rounded={round.field}
        hoverStyle={{ background: '$hover' }}
        focusVisibleStyle={ring}
        aria-label="Board actions"
      >
        <EllipsisVertical size={16} color="$soft" />
      </XStack>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onSelect={onAdd}>New issue</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)
