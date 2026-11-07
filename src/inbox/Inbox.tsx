/**
 * The Inbox: the panel, its tabs, and the list.
 *
 * It draws inside the shell's `aside`, which owns the 307 width, the panel
 * surface and the corner; what is here is the panel's own anatomy.
 *
 * The header rhythm is image-derived (÷1.5 from 2048×1138): 12 above the title,
 * 20 from the title to the tab row, a 38-tall tab row ending ON a hairline that
 * spans the FULL panel width, and 10 from that rail to the first row. A rail
 * running edge to edge under a tab row inset by the panel padding is what makes
 * this read as one component rather than a row of buttons.
 *
 * Five states, each entered deliberately and none inheriting a neighbour's
 * verdict — see fixture.ts. Only the last of them has a reference.
 */
import { CopyCheck, List as ListMark, MessageCircleMore, X } from '@hanzogui/lucide-icons-2'
import {
  ScrollArea,
  SizableText,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  XStack,
  YStack,
} from '@hanzo/ui'
import { useState, type ReactNode } from 'react'

import { hideAside } from '~/shell/aside.ts'
import { PAD } from '~/shell/measure.ts'
import { gap, paint, ring, round, rung } from '~/theme/theme'
import { see, seeAll, useNotes, useUnseen } from './feed.ts'
import { inTab, TABS, unseen, type Note, type Tab } from './note.ts'
import { press } from '~/shell'
import { Row } from './Row.tsx'

/** title 24img above · title→tabs 30img · tab row 57img · rail→list 15img */
const HEAD = 12
/** Measured 18.7 between the title's box and the tab row's; the ramp's 16 lands
 *  the rail at 90 against the reference's 90.7, and a rhythm off the ramp reads
 *  as no product at all. */
const BAND = 12
const TAB = 36
const LIST = 6
const MARK = 17
const BADGE = 16
const SHUT = 24

type Filter = 'all' | 'unread' | 'mentions'

const face = { all: ListMark, task: CopyCheck, chat: MessageCircleMore } as const
const label = { all: 'All', task: 'Tasks', chat: 'Chat' } as const

const hasMention = (note: Note): boolean =>
  note.line.some((s) => s.mention || s.text.includes('mentioned')) ||
  (note.quote?.some((s) => s.mention) ?? false)

/** A quiet middle, for the states the reference never shows. */
const Say = ({ children }: { children: ReactNode }) => (
  <YStack flex={1} items="center" justify="center" p={PAD} gap={gap.inset}>
    {children}
  </YStack>
)

const Feed = ({ tab, filter }: { tab: Tab; filter: Filter }) => {
  const feed = useNotes()

  if (feed.phase === 'loading')
    return (
      <Say>
        <Spinner />
      </Say>
    )

  if (feed.phase === 'failure')
    return (
      <Say>
        <SizableText size={rung.body} color={paint.mute}>
          The inbox is not answering.
        </SizableText>
        <SizableText
          size={rung.body}
          color={paint.ink}
          textDecorationLine="underline"
          {...press(feed.reload)}
          focusVisibleStyle={ring}
        >
          Try again
        </SizableText>
      </Say>
    )

  const baseNotes: Note[] = inTab(feed.data ?? [], tab)
  const notes = baseNotes.filter((n) => {
    if (filter === 'unread') return !n.seen
    if (filter === 'mentions') return hasMention(n)
    return true
  })

  if (notes.length === 0)
    return (
      <Say>
        <SizableText size={rung.body} color={paint.dim}>
          {filter === 'unread'
            ? 'All caught up — no unread notifications.'
            : filter === 'mentions'
              ? 'No mentions in this view.'
              : 'Nothing here.'}
        </SizableText>
      </Say>
    )

  return (
    <ScrollArea data-parity-key="inbox.list" flex={1} pt={LIST}>
      <YStack role="list">
        {notes.map((n) => (
          <Row key={n.id} note={n} onSee={see} />
        ))}
      </YStack>
    </ScrollArea>
  )
}

export const Inbox = () => {
  const [tab, setTab] = useState<Tab>('all')
  const [filter, setFilter] = useState<Filter>('all')
  const feed = useNotes()
  const notes = feed.data ?? []
  const unreadTotal = useUnseen()
  const mentionCount = notes.filter(hasMention).length

  return (
    <YStack data-parity-key="inbox.panel" flex={1} minH={0}>
      <XStack px={PAD} pt={HEAD} items="center" justify="space-between">
        <XStack items="center" gap={8}>
          <SizableText data-parity-key="inbox.title" size={rung.row} fontWeight="600" color={paint.ink}>
            Inbox
          </SizableText>
          {unreadTotal > 0 ? (
            <XStack
              px={7}
              py={2}
              rounded={round.pill}
              items="center"
              justify="center"
              bg={paint.alert}
            >
              <SizableText size={rung.chip} fontWeight="700" color={paint.panel}>
                {`${unreadTotal} unread`}
              </SizableText>
            </XStack>
          ) : null}
        </XStack>

        <XStack items="center" gap={6}>
          {unreadTotal > 0 ? (
            <XStack
              {...press(seeAll, 'Mark all notifications as read')}
              px={7}
              py={3}
              rounded={round.field}
              hoverStyle={{ background: paint.card }}
              focusVisibleStyle={ring}
            >
              <SizableText size={rung.chip} fontWeight="500" color={paint.mute}>
                Mark all read
              </SizableText>
            </XStack>
          ) : null}

          <XStack
            data-parity-key="inbox.close"
            {...press(hideAside, 'Close the inbox')}
            width={SHUT}
            height={SHUT}
            items="center"
            justify="center"
            rounded={round.field}
            hoverStyle={{ background: paint.card }}
            focusVisibleStyle={ring}
          >
            <X size={14} color={paint.dim} />
          </XStack>
        </XStack>
      </XStack>

      <Tabs
        value={tab}
        onValueChange={(v: string) => setTab(v as Tab)}
        orientation="horizontal"
        flex={1}
        minH={0}
        gap={0}
        mt={BAND}
      >
        <YStack data-parity-key="inbox.rail" borderBottomWidth={1} borderColor={paint.rule}>
          <TabsList
            height={TAB}
            self="stretch"
            justify="flex-start"
            items="stretch"
            p={0}
            pl={gap.tight}
            gap={gap.tight}
            bg="transparent"
            rounded={0}
          >
            {TABS.map((t) => {
              const on = t === tab
              const Mark = face[t]
              const count = t === 'all' ? 0 : unseen(notes, t)
              return (
                <TabsTrigger
                  key={t}
                  data-parity-key={`inbox.tab.${t}`}
                  value={t}
                  height="100%"
                  flexDirection="row"
                  px={gap.tight}
                  gap="$1.5"
                  items="center"
                  justify="center"
                  rounded={0}
                  bg="transparent"
                  borderBottomWidth={2}
                  borderColor={on ? paint.accent : 'transparent'}
                  activeStyle={{ background: 'transparent' }}
                  hoverStyle={{ background: 'transparent' }}
                  focusStyle={{ background: 'transparent' }}
                  focusVisibleStyle={ring}
                >
                  <Mark size={MARK} color={on ? paint.ink : paint.dim} />
                  <SizableText size={rung.small} fontWeight={on ? '600' : '500'} color={on ? paint.ink : paint.dim}>
                    {label[t]}
                  </SizableText>
                  {count > 0 ? (
                    <YStack
                      data-parity-key="inbox.badge"
                      minW={BADGE}
                      height={BADGE}
                      px={4}
                      rounded={round.pill}
                      items="center"
                      justify="center"
                      bg={paint.alert}
                    >
                      <SizableText size={rung.chip} fontWeight="600" color={paint.panel}>
                        {count}
                      </SizableText>
                    </YStack>
                  ) : null}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </YStack>

        {/* Notification Filter Bar: All · Unread · Mentions */}
        <XStack
          px={PAD}
          py={8}
          gap={6}
          items="center"
          borderBottomWidth={1}
          borderColor={paint.rule}
        >
          {(
            [
              ['all', `All (${notes.length})`],
              ['unread', `Unread (${unreadTotal})`],
              ['mentions', `Mentions (${mentionCount})`],
            ] as const
          ).map(([key, text]) => {
            const active = filter === key
            return (
              <XStack
                key={key}
                {...press(() => setFilter(key), `Filter ${text}`)}
                px={8}
                py={3}
                rounded={round.pill}
                bg={active ? paint.card : 'transparent'}
                borderWidth={1}
                borderColor={active ? paint.ink : paint.rule}
                hoverStyle={{ background: paint.card }}
                focusVisibleStyle={ring}
              >
                <SizableText
                  size={rung.chip}
                  fontWeight={active ? '600' : '500'}
                  color={active ? paint.ink : paint.mute}
                >
                  {text}
                </SizableText>
              </XStack>
            )
          })}
        </XStack>

        {TABS.map((t) => (
          <TabsContent key={t} value={t} flex={1} minH={0}>
            {t === tab ? <Feed tab={t} filter={filter} /> : null}
          </TabsContent>
        ))}
      </Tabs>
    </YStack>
  )
}
