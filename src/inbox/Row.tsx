/**
 * One notification.
 *
 * Every number here is image-derived from the reference at 2048×1138 and
 * divided by 1.5, the scale the whole port shares; the image px stay in the
 * comments so a later measurement can check the arithmetic instead of repeating
 * it. Where the reference states a rhythm the 4px ramp does not carry, the
 * measured value stands.
 *
 * The dot lane is REAL SPACE rather than an overlay, and that is measured, not
 * assumed: read rows wrap at the same width as unread ones, so the text column
 * is 214 whether a dot is drawn in it or not. Overlaying the dot would have let
 * a read row run 17px wider, and the two would have wrapped differently.
 */
import { Avatar, AvatarFallback, AvatarImage, RelativeTime, SizableText, XStack, YStack } from '@hanzo/ui'

import { PAD } from '~/shell/measure.ts'
import { chip, gap, paint, ring, round, rung } from '~/theme/theme'
import type { Note, Span } from './note.ts'
import { press } from '~/shell'

/** avatar ⌀52img · line pitch 32img · dot ⌀13img · meta 40img below line 2 */
const FACE = 36
const LEAD = 21
const DOT = 9
const META = 18

/** Initials, and never three of them. */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()

/**
 * The sentence.
 *
 * One text host with the runs nested inside it, so the whole thing wraps as
 * prose. A row of sibling blocks would only ever break at a block boundary,
 * which is how "Elizabeth Reynolds" ends up alone on a line above its verb.
 */
const Line = ({ spans, clamp, parity }: { spans: readonly Span[]; clamp?: number; parity: string }) => (
  <SizableText
    data-parity-key={parity}
    size={rung.body}
    lineHeight={LEAD}
    color={paint.mute}
    numberOfLines={clamp}
  >
    {spans.map((s, i) => (
      <SizableText
        key={i}
        size={rung.body}
        lineHeight={LEAD}
        fontWeight={s.strong ? '600' : '400'}
        color={s.mention ? paint.alert : s.strong ? paint.ink : paint.mute}
      >
        {s.text}
      </SizableText>
    ))}
  </SizableText>
)

export type RowProps = {
  note: Note
  /** Reading it clears it. What that means belongs to the feed, not here. */
  onSee: (id: string) => void
  /** Clicking a row opens the conversation or issue it refers to (#394/#400). */
  onOpen?: (note: Note) => void
}

export const Row = ({ note, onSee, onOpen }: RowProps) => (
  <XStack
    data-parity-key="inbox.row"
    data-seen={note.seen ? 'yes' : 'no'}
    {...press(() => {
      onSee(note.id)
      onOpen?.(note)
    }, note.line.map((s) => s.text).join(''))}
    px={PAD}
    py={gap.inset}
    gap={gap.tight}
    // An unread row is an OBJECT on the sheet — the rung a card sits on. That
    // is the whole of this design's grammar for "this is a thing", and the dot
    // alone would not carry it.
    bg={note.seen ? 'transparent' : paint.card}
    // Full-bleed, ignoring the panel's own padding: measured edge to edge,
    // 1568..2027 of a 1568..2027 panel. The board's card divider does the same,
    // so it is the product's rule rather than this panel's exception.
    borderBottomWidth={1}
    borderColor={paint.rule}
    // Ours by design. The capture is one frame and shows no hover, no focus
    // ring and no pressed state anywhere on the screen.
    hoverStyle={{ background: paint.card }}
    focusVisibleStyle={ring}
  >
    <Avatar data-parity-key="inbox.face" size={FACE}>
      {note.actor.face ? <AvatarImage src={note.actor.face} alt="" /> : null}
      {/* The categorical ramp, keyed by the name, so one person keeps one
          colour everywhere and nobody writes a per-person table. */}
      <AvatarFallback bg={chip(note.actor.name).background}>
        <SizableText size={rung.small} fontWeight="600" color={chip(note.actor.name).color}>
          {initials(note.actor.name)}
        </SizableText>
      </AvatarFallback>
    </Avatar>

    <YStack flex={1} minW={0} gap={gap.tight}>
      <YStack>
        <Line spans={note.line} parity="inbox.line" />
        {/* The quote clamps to ONE line. The reference ellipsises it mid-word
            ("Let's discu…") while never truncating the sentence above it, which
            is what holds every row to the same height whatever was said. */}
        {note.quote ? <Line spans={note.quote} clamp={1} parity="inbox.quote" /> : null}
      </YStack>

      {/* elapsed · place. One line, never two: it is the quietest thing in the
          row, and a wrapped one would out-measure the sentence above it.

          RelativeTime keeps its own clock and re-renders only itself, so an
          open panel stays honest without the list re-rendering. It types its
          props as `<time>`'s, so the type role comes from the text host around
          it and `inherit` is what carries it down.

          `short` rather than `auto`, and it is a measurement not a taste: the
          reference writes "10 min ago", the published component's `auto` writes
          "10 minutes ago", and at this size that is 213 of the 214 the column
          has — so the project name beside it truncated. `short` writes "10m",
          which fits with room and says the same thing. Elapsed wording belongs
          to the component for the whole estate, so the choice is which of its
          forms to ask for and never a fourth one written here. */}
      <XStack data-parity-key="inbox.meta" items="center" gap={gap.tight} overflow="hidden">
        <SizableText size={rung.small} lineHeight={META} color={paint.dim}>
          <RelativeTime
            date={new Date(note.at)}
            format="short"
            style={{ fontSize: 'inherit', lineHeight: 'inherit', color: 'inherit', whiteSpace: 'nowrap' }}
          />
        </SizableText>
        {note.place ? (
          <>
            <SizableText size={rung.small} lineHeight={META} color={paint.dim}>
              •
            </SizableText>
            <SizableText size={rung.small} lineHeight={META} color={paint.dim} numberOfLines={1}>
              {note.place}
            </SizableText>
          </>
        ) : null}
      </XStack>
    </YStack>

    {/* The lane. It holds its width whether or not it draws the dot. */}
    <YStack data-parity-key="inbox.lane" width={DOT} shrink={0} pt={(LEAD - DOT) / 2}>
      {note.seen ? null : (
        <YStack
          data-parity-key="inbox.dot"
          role="img"
          aria-label="unread"
          width={DOT}
          height={DOT}
          rounded={round.pill}
          // The alert hue, not the accent. Our accent IS the product's ink, so
          // an accent dot would be a white mark beside white emphasised names
          // and would stop reading as a mark. The hue is the estate's token for
          // "addressed to you", which is what every row in your own inbox is.
          bg={paint.alert}
        />
      )}
    </YStack>
  </XStack>
)
