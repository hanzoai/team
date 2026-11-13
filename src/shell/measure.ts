/**
 * SHELL GEOMETRY — every number the four regions are built from, and the one
 * decision the rest descend from.
 *
 * THE SCALE. The reference is a 2048×1138 render at an arbitrary scale, so its
 * pixels are not CSS pixels and only the ratios are the contract. The scale is a
 * DECISION and it is 1.5: eight independently measured cap heights (12 13 14 15
 * 16 22 23 39 image px) divided by 1.5 and by a grotesque's 0.727 cap ratio land
 * on 11 13 14 15 21 36 — four of them exactly on rungs the ladder already
 * publishes ($1 11 · $2 13 · $3 14 · $7 21), with nothing to round. 1.6 lands
 * none of them. So: image px ÷ 1.5, snapped to the 4px ramp, and where the two
 * disagree the RAMP wins — a rhythm 2px off reads as this product, one off the
 * ramp reads as none.
 *
 * Every number carries the image measurement it came from, so a remeasurement
 * can be checked against the same evidence rather than argued.
 */

/** Image px per CSS px. Recorded so the derivation can be replayed. */
export const SCALE = 1.5

// ── the four regions ─────────────────────────────────────────────────────────
// Seams measured off flat background runs, so they are exact: the rail's
// hairline at image x124, the navigator ending at 439, the board at 1559, the
// aside spanning 1568–2027. Three are FIXED and the board absorbs every change
// of width — the reference proves it by cutting its fourth column mid-card
// rather than reflowing, so the board scrolls sideways and never re-wraps.

/** The icon rail. Fixed at every width, including the narrowest: it
 *  is how you leave the screen you are on. */
export const RAIL = 48
/** The navigator. Fixed, dragged by the grip, a drawer when there is
 *  no room for it. */
export const NAV = 220
export const NAV_MIN = 188
export const NAV_MAX = 340
/** The dismissible right panel. */
export const ASIDE = 284

/** 4px `--pane-gap` gutter and 12px `--pane-round` radius matching hanzo.app & hanzo.bot. */
export const SEAM = 4
export const PANE_ROUND = 12

// ── inside a region ──────────────────────────────────────────────────────────

/** Panel padding: the navigator and the aside alike. */
export const PAD = 10

/** A navigator row: a standing entry or a project. */
export const ROW = 29
/** A row under an expanded project. */
export const LEAF = 27
/** The rail's icon pitch, which is also the 36x36 rounded-10 active/hover square (6px inset inside 48px rail). */
export const STEP = 36
/** Every glyph in the rail and the navigator. */
export const ICON = 18
/** The search field. */
export const FIELD = 30

/** The rail's mark. */
export const MARK = 36
/** The rail's gauge. */
export const GAUGE = { width: 36, height: 52 }
/** The rail's add control, and the pill behind the selected glyph. */
export const ADD = 28
export const GLOW = 36

/** Where a row's label starts, and where the tree's spine runs. Padding, the
 *  icon box, then the gap — so a row with no glyph indents to the same place and
 *  a spine at the glyph's centre passes through every glyph above it. Measured:
 *  label x192 and spine x165 in image space, against 44 and 26 here. */
export const LABEL = PAD + ICON + 8
export const SPINE = PAD + ICON / 2

// ── where the layout gives up a region ───────────────────────────────────────
// OURS BY DESIGN. The reference is one width and shows no breakpoint, so nothing
// here is measured. The numbers are what the regions need rather than device
// classes: four inline needs rail 84 + navigator 208 + two board columns 480 +
// aside 308 + seams; the navigator inline needs the first three.
//
// WIDTH COMES FROM THE SHELL, NOT THE WINDOW. What a region has to fit in is
// this element's width, which a desktop shell can make smaller than the viewport
// and which a media query cannot see.

export const INLINE_ASIDE = 1120
export const INLINE_NAV = 800
