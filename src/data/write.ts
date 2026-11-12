/**
 * How a change is expressed: a transaction, and there are three kinds.
 *
 * The platform has no update endpoint. A change is a document appended to the
 * space's log, applied by the server and broadcast to every live session — so
 * building one correctly here is the whole write path, and there is no second
 * shape a caller could reach for.
 */
import { Tx, type Doc } from './model.ts'

/** A platform id: twelve bytes, hex, time-ordered like the ones the model ships. */
export const mint = (): string => {
  const seconds = Math.floor(Date.now() / 1000)
  const random = crypto.getRandomValues(new Uint8Array(8))
  return (
    seconds.toString(16).padStart(8, '0') +
    Array.from(random, (b) => b.toString(16).padStart(2, '0')).join('')
  )
}

const stamp = (space: string, by: string) => ({
  _id: mint(),
  space: 'core:space:Tx',
  objectSpace: space,
  modifiedBy: by,
  modifiedOn: Date.now(),
})

export const create = (space: string, by: string, cls: string, attributes: Record<string, unknown>, id = mint()) => ({
  ...stamp(space, by),
  _class: Tx.create,
  objectId: id,
  objectClass: cls,
  attributes,
})

export const update = (doc: Doc, by: string, operations: Record<string, unknown>) => ({
  ...stamp(doc.space, by),
  _class: Tx.update,
  objectId: doc._id,
  objectClass: doc._class,
  operations,
})

export const remove = (doc: Doc, by: string) => ({
  ...stamp(doc.space, by),
  _class: Tx.remove,
  objectId: doc._id,
  objectClass: doc._class,
})

/**
 * A rank between two others, so a card can be dropped between two cards.
 *
 * Ordering is a STRING and not a number on purpose: inserting between two
 * integers eventually runs out of integers and forces a renumber of the whole
 * column — a write per card, and a race per person. Between two strings there
 * is always room, so one card moving is always one write.
 *
 * Base 36, and the whole algorithm is: skip what the two share, then find a
 * character in the gap. The case that decides whether it works is the one where
 * the two are ADJACENT, or where one is a prefix of the other — there the
 * answer is longer than either input, and getting that branch wrong produces a
 * rank on the wrong side of its neighbour, which reads as a card that snaps
 * back after a drag.
 */
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'
const LOW = 0
const HIGH = DIGITS.length - 1
const MID = DIGITS[Math.floor(DIGITS.length / 2)]

const at = (s: string, i: number) => DIGITS.indexOf(s[i])

export const between = (before?: string, after?: string): string => {
  const a = before ?? ''
  const b = after ?? ''
  let n = 0
  while (n < a.length && n < b.length && a[n] === b[n]) n++
  return a.slice(0, n) + gap(a.slice(n), b.slice(n))
}

/** Something strictly between two tails that share no leading character. */
const gap = (a: string, b: string): string => {
  if (b === '') return above(a)
  if (a === '') return below(b)
  const low = at(a, 0)
  const high = at(b, 0)
  if (high - low > 1) return DIGITS[Math.floor((low + high) / 2)]
  // Adjacent, so the answer keeps a's first character and goes past its tail —
  // which is unbounded above, because anything under a's first character is
  // still under b's.
  return a[0] + above(a.slice(1))
}

/** Strictly greater than `a`, with nothing above it. */
const above = (a: string): string => {
  for (let i = a.length - 1; i >= 0; i--) {
    if (at(a, i) < HIGH) return a.slice(0, i) + DIGITS[at(a, i) + 1]
  }
  return a + MID
}

/**
 * Strictly greater than nothing and strictly less than `b`.
 *
 * The recursion is what keeps the bottom of a column open forever: a leading
 * `0` is always below a leading `1`, and no rank this produces is ever `0`
 * alone — which is the one string with nothing beneath it.
 */
const below = (b: string): string => {
  const first = at(b, 0)
  if (first > 1) return DIGITS[Math.floor(first / 2)]
  if (first === 1) return DIGITS[LOW] + MID
  return DIGITS[LOW] + below(b.slice(1))
}

/** The rank the first card in an empty column gets. */
export const START = MID
