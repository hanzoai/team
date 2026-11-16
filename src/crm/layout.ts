/**
 * Where the record panel stands, by how wide the CRM's main area is.
 *
 * Beside the table when both fit, so a list can be read while one record is
 * open. Over the table when they do not: a 380px panel pinned beside a table on
 * a phone leaves the table no width at all and pushes itself past the edge.
 */

/** The record panel's width when it stands beside the table. */
export const DETAIL = 380

/** The least table worth keeping beside it: two columns. */
export const TABLE_MIN = 320

/** True when the panel stands beside the table; false when it covers it. */
export const docked = (width: number): boolean => width >= DETAIL + TABLE_MIN
