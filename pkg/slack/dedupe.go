package slack

import (
	"sync"
	"time"
)

// seenSet is an age-based single-use / seen-set with an atomic test-and-set.
//
// Entries expire by AGE, not by count. Two independent uses share this one
// primitive:
//   - Slack event de-duplication (event_id): ttl >= the signature freshness
//     window, so a flood can never evict a target id before that id's own
//     signature would also expire — closing the evict-then-replay attack.
//   - OAuth `state` single-use (nonce): ttl = the state lifetime, so a signed
//     state can be redeemed exactly once within its TTL.
//
// Eviction is strictly age-based: a fresh (within-TTL) entry is NEVER evicted,
// which is what closes the evict-then-replay attack. Memory is bounded
// temporally (an entry lives at most ttl), not by count — a count cap would
// drop fresh ids and reopen the replay window. Go port of the TS SeenSet, made
// concurrency-safe with a mutex (the Go webhook handler is multi-goroutine).
type seenSet struct {
	mu    sync.Mutex
	ttl   time.Duration
	at    map[string]time.Time
	order []string // insertion order, for age-based pruning
}

func newSeenSet(ttl time.Duration) *seenSet {
	return &seenSet{ttl: ttl, at: make(map[string]time.Time)}
}

// prune drops expired entries oldest-first, stopping at the first still-fresh
// one. Caller must hold the lock.
func (s *seenSet) prune(now time.Time) {
	i := 0
	for ; i < len(s.order); i++ {
		k := s.order[i]
		t, ok := s.at[k]
		if !ok {
			continue // already removed via a re-insert
		}
		if now.Sub(t) > s.ttl {
			delete(s.at, k)
		} else {
			break // fresh — Go maps aren't ordered, but s.order is
		}
	}
	if i > 0 {
		s.order = append(s.order[:0], s.order[i:]...)
	}
}

// seenAndAdd atomically tests-and-sets: returns true if k was already seen (a
// duplicate); otherwise records it and returns false. The empty key is
// non-dedupable (always unique, never blocks). `now` zero → time.Now.
func (s *seenSet) seenAndAdd(k string, now time.Time) bool {
	if k == "" {
		return false
	}
	if now.IsZero() {
		now = time.Now()
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.prune(now)
	if _, ok := s.at[k]; ok {
		return true
	}
	s.at[k] = now
	s.order = append(s.order, k)
	return false
}
