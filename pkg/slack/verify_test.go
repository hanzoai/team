package slack

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"strconv"
	"strings"
	"testing"
)

// slackSig produces a valid X-Slack-Signature for a body at a timestamp.
func slackSig(secret, ts, body string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte("v0:" + ts + ":" + body))
	return "v0=" + hex.EncodeToString(mac.Sum(nil))
}

func TestVerifySignature_Valid(t *testing.T) {
	secret := "shh"
	now := int64(1_700_000_000)
	ts := strconv.FormatInt(now, 10)
	body := `{"type":"event_callback"}`
	sig := slackSig(secret, ts, body)
	if !verifySignature(secret, sig, ts, body, now) {
		t.Fatal("valid signature rejected")
	}
}

func TestVerifySignature_TamperedBody(t *testing.T) {
	secret := "shh"
	now := int64(1_700_000_000)
	ts := strconv.FormatInt(now, 10)
	sig := slackSig(secret, ts, `{"type":"event_callback"}`)
	// Same signature, different body → must fail (integrity).
	if verifySignature(secret, sig, ts, `{"type":"evil"}`, now) {
		t.Fatal("tampered body accepted")
	}
}

func TestVerifySignature_WrongSecret(t *testing.T) {
	now := int64(1_700_000_000)
	ts := strconv.FormatInt(now, 10)
	body := `x`
	sig := slackSig("real", ts, body)
	if verifySignature("attacker", sig, ts, body, now) {
		t.Fatal("wrong signing secret accepted")
	}
}

func TestVerifySignature_StaleTimestamp(t *testing.T) {
	secret := "shh"
	signed := int64(1_700_000_000)
	ts := strconv.FormatInt(signed, 10)
	body := `x`
	sig := slackSig(secret, ts, body)
	// now is 6 minutes after the signed timestamp → outside the 5-min window.
	now := signed + 6*60
	if verifySignature(secret, sig, ts, body, now) {
		t.Fatal("stale timestamp accepted (replay window not enforced)")
	}
	// A future-skewed timestamp is also rejected.
	if verifySignature(secret, sig, ts, body, signed-6*60) {
		t.Fatal("future-skewed timestamp accepted")
	}
}

func TestVerifySignature_EdgeOfWindow(t *testing.T) {
	secret := "shh"
	signed := int64(1_700_000_000)
	ts := strconv.FormatInt(signed, 10)
	body := `x`
	sig := slackSig(secret, ts, body)
	// Exactly at the boundary (300s) is allowed (abs == max, not >).
	if !verifySignature(secret, sig, ts, body, signed+maxTimestampSkewSec) {
		t.Fatal("timestamp exactly at window boundary rejected")
	}
	if verifySignature(secret, sig, ts, body, signed+maxTimestampSkewSec+1) {
		t.Fatal("timestamp 1s past window accepted")
	}
}

func TestVerifySignature_BadInput(t *testing.T) {
	now := int64(1_700_000_000)
	cases := []struct{ secret, sig, ts, body string }{
		{"", "v0=x", "1", "b"},                             // empty secret
		{"s", "", "1", "b"},                                // empty sig
		{"s", "v0=x", "", "b"},                             // empty ts
		{"s", "v0=x", "notanumber", "b"},                   // non-numeric ts
		{"s", "v0=short", strconv.FormatInt(now, 10), "b"}, // wrong-length sig
	}
	for i, c := range cases {
		if verifySignature(c.secret, c.sig, c.ts, c.body, now) {
			t.Fatalf("case %d: bad input accepted", i)
		}
	}
}

// ── OAuth state ──────────────────────────────────────────────────────────────

// mustState signs an OAuth state or fails the test (the CSPRNG never fails in
// practice; this keeps the callers terse while surfacing a genuine failure).
func mustState(t *testing.T, secret, ws string, now int64) string {
	t.Helper()
	s, err := signOAuthState(secret, ws, now)
	if err != nil {
		t.Fatalf("signOAuthState: %v", err)
	}
	return s
}

func TestOAuthState_RoundTrip(t *testing.T) {
	secret := "server-secret"
	now := int64(1_700_000_000)
	state := mustState(t, secret, "ws-uuid-123", now)
	st, ok := verifyOAuthState(secret, state, now)
	if !ok {
		t.Fatal("valid state rejected")
	}
	if st.Workspace != "ws-uuid-123" {
		t.Fatalf("workspace not bound: got %q", st.Workspace)
	}
	if st.Nonce == "" {
		t.Fatal("nonce empty")
	}
	if st.Exp != now+oauthStateTTLSec {
		t.Fatalf("exp wrong: got %d", st.Exp)
	}
}

func TestOAuthState_Tampered(t *testing.T) {
	secret := "server-secret"
	now := int64(1_700_000_000)
	state := mustState(t, secret, "ws-a", now)
	// Flip the last MAC char.
	dot := strings.LastIndexByte(state, '.')
	tampered := state[:dot+1] + flip(state[dot+1:])
	if _, ok := verifyOAuthState(secret, tampered, now); ok {
		t.Fatal("tampered MAC accepted")
	}
	// Different secret.
	if _, ok := verifyOAuthState("other", state, now); ok {
		t.Fatal("state verified under wrong secret")
	}
}

func TestOAuthState_ForgedWorkspace(t *testing.T) {
	// An attacker cannot re-point a signed state at another workspace: changing
	// the payload invalidates the MAC.
	secret := "server-secret"
	now := int64(1_700_000_000)
	state := mustState(t, secret, "victim-ws", now)
	dot := strings.LastIndexByte(state, '.')
	// Replace the payload with a forged workspace, keep the old MAC.
	forgedPayload := base64.RawURLEncoding.EncodeToString([]byte("attacker-ws.9999999999.deadbeef"))
	forged := forgedPayload + "." + state[dot+1:]
	if _, ok := verifyOAuthState(secret, forged, now); ok {
		t.Fatal("forged workspace state accepted (CSRF binding broken)")
	}
}

func TestOAuthState_Expired(t *testing.T) {
	secret := "server-secret"
	now := int64(1_700_000_000)
	state := mustState(t, secret, "ws", now)
	if _, ok := verifyOAuthState(secret, state, now+oauthStateTTLSec+1); ok {
		t.Fatal("expired state accepted")
	}
}

// flip mutates the last byte of a base64url string so the MAC no longer matches.
func flip(s string) string {
	if s == "" {
		return "x"
	}
	b := []byte(s)
	if b[len(b)-1] == 'A' {
		b[len(b)-1] = 'B'
	} else {
		b[len(b)-1] = 'A'
	}
	return string(b)
}
