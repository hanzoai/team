//
// Copyright © 2025 Hanzo AI Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import { SeenSet } from '../dedupe'

const TTL = 5 * 60 * 1000 // must be >= Slack signature freshness window

describe('SeenSet (Slack event dedupe)', () => {
  it('first sight is not a duplicate; the second is (idempotent relay)', () => {
    const s = new SeenSet(TTL)
    expect(s.seenAndAdd('Ev1', 0)).toBe(false)
    expect(s.seenAndAdd('Ev1', 1)).toBe(true)
  })

  it('is atomic: two concurrent sightings before any await — one wins (no double relay)', () => {
    const s = new SeenSet(TTL)
    // Simulate the check-and-set both retries perform synchronously in the handler.
    const first = s.seenAndAdd('EvR', 100)
    const second = s.seenAndAdd('EvR', 100)
    expect(first).toBe(false)
    expect(second).toBe(true)
  })

  it('empty keys are never deduped (non-dedupable events always relay)', () => {
    const s = new SeenSet(TTL)
    expect(s.seenAndAdd('', 0)).toBe(false)
    expect(s.seenAndAdd('', 1)).toBe(false)
  })

  it('resists evict-then-replay: a flood cannot evict a target before its TTL', () => {
    const s = new SeenSet(TTL)
    expect(s.seenAndAdd('target', 0)).toBe(false)
    // Flood 10000 unique fresh events at t=1ms (all within TTL of the target).
    for (let i = 0; i < 10000; i++) {
      s.seenAndAdd(`flood-${i}`, 1)
    }
    // Within the signature window the target is still remembered — replay blocked.
    // (No count-based eviction: a fresh id is never flushed out early.)
    expect(s.seenAndAdd('target', TTL)).toBe(true)
  })

  it('expires entries strictly after the TTL (bounded memory, no permanent growth)', () => {
    const s = new SeenSet(TTL)
    expect(s.seenAndAdd('old', 0)).toBe(false)
    // Once past the TTL the id may be re-accepted — but by then any replayed Slack
    // request has a stale timestamp and fails signature verification upstream.
    expect(s.seenAndAdd('old', TTL + 1)).toBe(false)
  })
})
