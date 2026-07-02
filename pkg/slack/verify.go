// Package slack is the Go port of the TypeScript pod-slack + @hanzoteam/slack:
// bidirectional Slack <-> Hanzo-channel relay with the SAME security properties.
//
//   - Webhook signature verification: constant-time HMAC-SHA256 over the exact
//     raw body, with a strict 5-minute anti-replay timestamp window (verify.go).
//   - Event routing: pure decision function that drops bot echoes + non-message
//     subtypes so a mirrored message never loops back into Slack (events.go).
//   - OAuth CSRF: workspace-bound, HMAC-signed, single-use `state` (verify.go +
//     the SeenSet nonce store in dedupe.go).
//   - Token at rest: the Slack bot token is stored via the CANONICAL KMS secrets
//     API (POST /v1/kms/orgs/{org}/secrets) — KMS encrypts at rest internally;
//     the token is NEVER written to a DB column and NEVER logged (tokens.go).
//   - Admin-gated + tenant-scoped: connect/map require workspace owner/admin;
//     mapChannel proves Slack-team ownership by a successful KMS token fetch
//     before it will bridge (slack.go).
package slack

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"strconv"
	"strings"
	"time"
)

// sigVersion is Slack's request-signing version prefix. Slack computes
//
//	v0=HMAC_SHA256(signingSecret, "v0:${timestamp}:${rawBody}")
//
// and sends it in X-Slack-Signature with X-Slack-Request-Timestamp.
// https://api.slack.com/authentication/verifying-requests-from-slack
const sigVersion = "v0"

// maxTimestampSkewSec rejects requests whose timestamp is older/newer than this
// (the replay window). Matches the TS MAX_TIMESTAMP_SKEW_SEC.
const maxTimestampSkewSec = 60 * 5 // 5 minutes

// oauthStateTTLSec is the OAuth CSRF `state` lifetime. Matches OAUTH_STATE_TTL_SEC.
const oauthStateTTLSec = 60 * 10 // 10 minutes

// verifySignature returns true iff the HMAC matches AND the timestamp is fresh.
// Constant-time comparison; never panics on bad input — returns false. `now` is
// injectable for tests (pass 0 for time.Now).
func verifySignature(signingSecret, signature, timestamp, rawBody string, now int64) bool {
	if signingSecret == "" || signature == "" || timestamp == "" {
		return false
	}
	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return false
	}
	if now == 0 {
		now = time.Now().Unix()
	}
	if abs64(now-ts) > maxTimestampSkewSec {
		return false
	}
	mac := hmac.New(sha256.New, []byte(signingSecret))
	mac.Write([]byte(sigVersion + ":" + timestamp + ":" + rawBody))
	expected := sigVersion + "=" + hex.EncodeToString(mac.Sum(nil))
	// hmac.Equal is constant-time and length-safe.
	return hmac.Equal([]byte(signature), []byte(expected))
}

// signOAuthState builds a signed OAuth `state` binding the initiating workspace,
// so the callback cannot be replayed/forged for another workspace (CSRF).
// Format: base64url("<workspace>.<exp>.<nonce>").base64url(hmac). `now`=0 → time.Now.
func signOAuthState(secret, workspace string, now int64) string {
	if now == 0 {
		now = time.Now().Unix()
	}
	exp := now + oauthStateTTLSec
	nonce := randHex(16)
	payload := base64.RawURLEncoding.EncodeToString([]byte(workspace + "." + strconv.FormatInt(exp, 10) + "." + nonce))
	mac := hmacB64URL(secret, payload)
	return payload + "." + mac
}

// oauthState is a verified OAuth state: the bound workspace, its expiry, and the
// single-use nonce (the caller enforces single-use via a nonce seen-set).
type oauthState struct {
	Workspace string
	Exp       int64
	Nonce     string
}

// verifyOAuthState verifies a signed OAuth `state`. Returns the bound workspace,
// expiry and nonce on success, or ok=false if the MAC is invalid or expired.
// Constant-time MAC. `now`=0 → time.Now.
func verifyOAuthState(secret, state string, now int64) (oauthState, bool) {
	dot := strings.LastIndexByte(state, '.')
	if dot <= 0 {
		return oauthState{}, false
	}
	payload := state[:dot]
	mac := state[dot+1:]
	expected := hmacB64URL(secret, payload)
	if !hmac.Equal([]byte(mac), []byte(expected)) {
		return oauthState{}, false
	}
	decoded, err := base64.RawURLEncoding.DecodeString(payload)
	if err != nil {
		return oauthState{}, false
	}
	parts := strings.SplitN(string(decoded), ".", 3)
	if len(parts) != 3 || parts[0] == "" || parts[2] == "" {
		return oauthState{}, false
	}
	exp, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return oauthState{}, false
	}
	if now == 0 {
		now = time.Now().Unix()
	}
	if now > exp {
		return oauthState{}, false
	}
	return oauthState{Workspace: parts[0], Exp: exp, Nonce: parts[2]}, true
}

// ── helpers ────────────────────────────────────────────────────────────────

func hmacB64URL(secret, payload string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func randHex(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		// crypto/rand failure is catastrophic; fall back to time-seeded bytes so
		// a nonce is still unpredictable-enough for single-use (the MAC + TTL are
		// the real security). In practice rand.Read never fails on Linux.
		t := time.Now().UnixNano()
		for i := range b {
			b[i] = byte(t >> (uint(i%8) * 8))
		}
	}
	return hex.EncodeToString(b)
}

func abs64(x int64) int64 {
	if x < 0 {
		return -x
	}
	return x
}
