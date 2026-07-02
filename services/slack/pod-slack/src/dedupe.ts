//
// Copyright © 2025 Hanzo AI Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

/**
 * Age-based single-use / seen-set with an atomic test-and-set.
 *
 * Entries expire by AGE, not by count. Two independent uses share this one
 * primitive:
 *   - Slack event de-duplication (event_id): ttl >= the signature freshness
 *     window, so a flood can never evict a target id before that id's own
 *     signature would also expire — closing the evict-then-replay attack.
 *   - OAuth `state` single-use (nonce): ttl = the state lifetime, so a signed
 *     state can be redeemed exactly once within its TTL.
 *
 * Eviction is strictly age-based: a fresh (within-TTL) entry is NEVER evicted,
 * which is what closes the evict-then-replay attack — an attacker cannot flush a
 * target id out early. Memory is bounded temporally: an entry lives at most
 * `ttlMs`, so the set size is capped by (peak event rate × ttlMs). There is no
 * count-based cap on purpose, because count-eviction would drop fresh ids and
 * reopen the replay window.
 */
export class SeenSet {
  private readonly at = new Map<string, number>() // key -> insertion time (ms)
  constructor (private readonly ttlMs: number) {}

  private prune (now: number): void {
    // Walk oldest-first, drop expired entries, and stop at the first still-fresh
    // one (Map preserves insertion order).
    for (const [k, t] of this.at) {
      if (now - t > this.ttlMs) this.at.delete(k)
      else break
    }
  }

  /**
   * Atomically test-and-set. Returns true if `k` was already seen (a duplicate);
   * otherwise records it and returns false. Synchronous — call BEFORE any await
   * so concurrent callers cannot both pass the check (TOCTOU-safe).
   */
  seenAndAdd (k: string, now = Date.now()): boolean {
    if (k === '') return false // non-dedupable; treat as unique (never blocks)
    this.prune(now)
    if (this.at.has(k)) return true
    this.at.set(k, now)
    return false
  }
}
