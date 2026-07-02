package slack

import (
	"sync"
	"testing"
	"time"
)

func TestSeenSet_FirstThenDuplicate(t *testing.T) {
	s := newSeenSet(time.Minute)
	now := time.Unix(1_700_000_000, 0)
	if s.seenAndAdd("ev1", now) {
		t.Fatal("first sighting reported as duplicate")
	}
	if !s.seenAndAdd("ev1", now) {
		t.Fatal("second sighting not caught as duplicate")
	}
}

func TestSeenSet_EmptyKeyNeverBlocks(t *testing.T) {
	s := newSeenSet(time.Minute)
	now := time.Unix(1_700_000_000, 0)
	if s.seenAndAdd("", now) || s.seenAndAdd("", now) {
		t.Fatal("empty key must be non-dedupable (never blocks)")
	}
}

func TestSeenSet_ExpiryAllowsReuse(t *testing.T) {
	s := newSeenSet(time.Minute)
	base := time.Unix(1_700_000_000, 0)
	if s.seenAndAdd("ev", base) {
		t.Fatal("first add flagged duplicate")
	}
	// Within TTL → still a duplicate.
	if !s.seenAndAdd("ev", base.Add(30*time.Second)) {
		t.Fatal("within-TTL replay not caught")
	}
	// After TTL → the entry has aged out, so it's a fresh sighting again.
	if s.seenAndAdd("ev", base.Add(2*time.Minute)) {
		t.Fatal("entry did not expire after TTL")
	}
}

// TestSeenSet_EvictThenReplayResistance: a flood of fresh keys must NOT evict a
// still-fresh target key (age-based, not count-based). This is the property that
// closes the evict-then-replay attack.
func TestSeenSet_NoEarlyEvictionUnderFlood(t *testing.T) {
	s := newSeenSet(time.Minute)
	base := time.Unix(1_700_000_000, 0)
	// Record the target.
	s.seenAndAdd("target", base)
	// Flood with 10k fresh keys, all within the TTL window.
	for i := 0; i < 10000; i++ {
		s.seenAndAdd("flood-"+string(rune('a'+i%26))+itoa(i), base.Add(time.Duration(i)*time.Millisecond))
	}
	// The target is still fresh (well within 1 min) → must still be seen.
	if !s.seenAndAdd("target", base.Add(2*time.Second)) {
		t.Fatal("fresh target was evicted by flood (evict-then-replay window open)")
	}
}

func TestSeenSet_ConcurrentTestAndSet(t *testing.T) {
	// Two goroutines racing on the SAME key: exactly one must see false (the
	// winner), the rest true. Proves the test-and-set is atomic.
	s := newSeenSet(time.Minute)
	now := time.Now()
	const n = 64
	var wg sync.WaitGroup
	var mu sync.Mutex
	firsts := 0
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if !s.seenAndAdd("k", now) {
				mu.Lock()
				firsts++
				mu.Unlock()
			}
		}()
	}
	wg.Wait()
	if firsts != 1 {
		t.Fatalf("test-and-set not atomic: %d goroutines saw first (want 1)", firsts)
	}
}

func itoa(i int) string {
	if i == 0 {
		return "0"
	}
	var b []byte
	neg := i < 0
	if neg {
		i = -i
	}
	for i > 0 {
		b = append([]byte{byte('0' + i%10)}, b...)
		i /= 10
	}
	if neg {
		b = append([]byte{'-'}, b...)
	}
	return string(b)
}
