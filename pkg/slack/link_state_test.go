package slack

import (
	"strings"
	"testing"
)

// The link state round-trips (team, user) + a fresh nonce under the HMAC.
func TestLinkState_RoundTrip(t *testing.T) {
	now := int64(1_700_000_000)
	state, err := signLinkState("srv-secret", "T1", "U9", now)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	team, user, nonce, ok := verifyLinkState("srv-secret", state, now)
	if !ok || team != "T1" || user != "U9" || nonce == "" {
		t.Fatalf("verify: team=%q user=%q nonce=%q ok=%v", team, user, nonce, ok)
	}
}

// A tampered MAC or wrong secret is rejected (CSRF/forgery protection).
func TestLinkState_TamperedOrWrongSecret(t *testing.T) {
	now := int64(1_700_000_000)
	state, _ := signLinkState("srv-secret", "T1", "U9", now)
	dot := strings.LastIndexByte(state, '.')
	tampered := state[:dot+1] + flip(state[dot+1:])
	if _, _, _, ok := verifyLinkState("srv-secret", tampered, now); ok {
		t.Fatal("tampered MAC accepted")
	}
	if _, _, _, ok := verifyLinkState("other-secret", state, now); ok {
		t.Fatal("state verified under wrong secret")
	}
}

// The subject binds BOTH ids: a state minted for (T1,U9) recovers exactly that,
// so an attacker cannot smuggle a different (team,user) past the MAC.
func TestLinkState_BindsBothIDs(t *testing.T) {
	now := int64(1_700_000_000)
	state, _ := signLinkState("srv-secret", "T1", "U9", now)
	team, user, _, ok := verifyLinkState("srv-secret", state, now)
	if !ok || team != "T1" || user != "U9" {
		t.Fatalf("binding lost: team=%q user=%q ok=%v", team, user, ok)
	}
}

func TestLinkState_Expired(t *testing.T) {
	now := int64(1_700_000_000)
	state, _ := signLinkState("srv-secret", "T1", "U9", now)
	if _, _, _, ok := verifyLinkState("srv-secret", state, now+oauthStateTTLSec+1); ok {
		t.Fatal("expired link state accepted")
	}
}
