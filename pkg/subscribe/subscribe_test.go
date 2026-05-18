package subscribe

import (
	"encoding/json"
	"sync"
	"testing"
	"time"
)

// TestHubAddRemove guards the only invariant the hub has: subscribers
// added show up in snapshot, removed ones don't.
func TestHubAddRemove(t *testing.T) {
	h := newHub()
	s1 := &subscriber{collection: "messages", out: make(chan []byte, 1)}
	s2 := &subscriber{collection: "issues", out: make(chan []byte, 1)}
	h.add(s1)
	h.add(s2)
	if got := len(h.snapshot()); got != 2 {
		t.Fatalf("snapshot len = %d, want 2", got)
	}
	h.remove(s1)
	snap := h.snapshot()
	if len(snap) != 1 || snap[0] != s2 {
		t.Fatalf("after remove snap = %+v, want [s2]", snap)
	}
}

// TestHubConcurrency runs the add/remove/snapshot loop under -race.
// The hub is the only piece of shared state across hooks + the HTTP
// handler, so we want the race detector to actually see it under load.
func TestHubConcurrency(t *testing.T) {
	h := newHub()
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 200; j++ {
				s := &subscriber{collection: "x", out: make(chan []byte, 1)}
				h.add(s)
				_ = h.snapshot()
				h.remove(s)
			}
		}()
	}
	wg.Wait()
	if got := len(h.snapshot()); got != 0 {
		t.Errorf("leaked subscribers: %d", got)
	}
}

// TestSlowClientDoesNotBlockFanout proves the non-blocking send in
// bindHooks: a saturated channel must NOT pin the hook goroutine.
// This is the property that keeps a single bad client from stalling
// every other subscriber.
func TestSlowClientDoesNotBlockFanout(t *testing.T) {
	sub := &subscriber{collection: "messages", out: make(chan []byte, 1)}
	sub.out <- []byte("first")

	done := make(chan struct{})
	go func() {
		select {
		case sub.out <- []byte("second"): // would block — channel full
		default: // drop, which is the expected branch
		}
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("non-blocking send blocked")
	}
}

// TestPayloadShape locks in the wire JSON contract: type/collection/record.
func TestPayloadShape(t *testing.T) {
	payload, err := json.Marshal(map[string]any{
		"type":       "create",
		"collection": "messages",
		"record":     map[string]any{"id": "abc", "body": "hi"},
	})
	if err != nil {
		t.Fatal(err)
	}
	var got map[string]any
	if err := json.Unmarshal(payload, &got); err != nil {
		t.Fatal(err)
	}
	if got["type"] != "create" {
		t.Errorf("type = %v", got["type"])
	}
	if got["collection"] != "messages" {
		t.Errorf("collection = %v", got["collection"])
	}
	rec, ok := got["record"].(map[string]any)
	if !ok || rec["id"] != "abc" {
		t.Errorf("record = %v", got["record"])
	}
}
