package bots

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
)

// TestMachineToken_ConfiguredGate: with either cred unset, configured() is false
// and get() returns "" WITHOUT hitting the network (fail-secure — callers skip).
func TestMachineToken_ConfiguredGate(t *testing.T) {
	m := &machineToken{clientID: "", clientSecret: "x"}
	if m.configured() {
		t.Fatal("configured() true with empty clientID")
	}
	if got := m.get(context.Background()); got != "" {
		t.Fatalf("get() = %q, want empty when unconfigured", got)
	}
}

// TestMachineToken_MintsAndCaches: get() performs the client_credentials grant
// against /v1/iam/oauth/token, returns the access_token, and CACHES it — a
// second call within the TTL does not re-mint.
func TestMachineToken_MintsAndCaches(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		if r.URL.Path != "/v1/iam/oauth/token" {
			t.Errorf("wrong path: %s", r.URL.Path)
		}
		if err := r.ParseForm(); err != nil {
			t.Fatal(err)
		}
		if r.Form.Get("grant_type") != "client_credentials" {
			t.Errorf("grant_type = %q", r.Form.Get("grant_type"))
		}
		if r.Form.Get("client_id") != "hanzo-team" {
			t.Errorf("client_id = %q", r.Form.Get("client_id"))
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"access_token":"tok-1","expires_in":3600}`)
	}))
	defer srv.Close()

	m := &machineToken{
		iamEndpoint:  srv.URL,
		clientID:     "hanzo-team",
		clientSecret: "secret",
		client:       srv.Client(),
	}
	if !m.configured() {
		t.Fatal("configured() false with both creds set")
	}
	if got := m.get(context.Background()); got != "tok-1" {
		t.Fatalf("get() = %q, want tok-1", got)
	}
	if got := m.get(context.Background()); got != "tok-1" {
		t.Fatalf("cached get() = %q, want tok-1", got)
	}
	if n := atomic.LoadInt32(&calls); n != 1 {
		t.Fatalf("minted %d times, want 1 (cache miss)", n)
	}
}

// TestMachineToken_MintErrorFallsBack: an OAuth error response yields "" (no
// cached token to fall back to) rather than a panic or a garbage bearer.
func TestMachineToken_MintErrorFallsBack(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		fmt.Fprint(w, `{"error":"invalid_client","error_description":"bad secret"}`)
	}))
	defer srv.Close()

	m := &machineToken{
		iamEndpoint:  srv.URL,
		clientID:     "hanzo-team",
		clientSecret: "wrong",
		client:       srv.Client(),
	}
	if got := m.get(context.Background()); got != "" {
		t.Fatalf("get() = %q, want empty on mint error", got)
	}
}
