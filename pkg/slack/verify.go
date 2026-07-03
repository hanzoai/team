// Package slack is the Go port of the TypeScript pod-slack + @hanzoteam/slack:
// bidirectional Slack <-> Hanzo relay AND the @hanzo agent front-door, with the
// SAME security properties:
//
//   - Webhook signature verification: constant-time HMAC-SHA256 over the exact
//     raw body, with a strict 5-minute anti-replay timestamp window (verify.go).
//     The same gate protects the Events webhook AND the slash-command endpoint.
//   - Event routing: pure decision function that drops bot echoes + non-message
//     subtypes, mirrors mapped channels, and routes @mentions/DMs to the agent
//     (events.go).
//   - CSRF/binding: workspace-bound OAuth `state` and (team,user)-bound link
//     `state`, both HMAC-signed + single-use (this file + the SeenSet in
//     dedupe.go). One signed-state primitive, two named subjects.
//   - Secrets at rest: the Slack bot token AND the per-user Hanzo refresh token
//     are stored via the canonical KMS secrets API; NEVER a DB column, NEVER
//     logged (tokens.go).
//   - Admin-gated + tenant-scoped: connect/map require workspace owner/admin;
//     the org is always resolved server-side (installOrg / WorkspaceOrg), never
//     trusted from the client.
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
// (the replay window).
const maxTimestampSkewSec = 60 * 5 // 5 minutes

// oauthStateTTLSec is the signed-state lifetime (OAuth CSRF state + link state).
const oauthStateTTLSec = 60 * 10 // 10 minutes

// verifySignature returns true iff the HMAC matches AND the timestamp is fresh.
// Constant-time comparison; never panics on bad input - returns false. `now` is
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

// ── signed single-use state (the ONE primitive) ─────────────────────────────

// subjectState is a verified signed state: an opaque bound subject, its expiry,
// and the single-use nonce (the caller enforces single-use via a nonce seen-set).
type subjectState struct {
	Subject string
	Exp     int64
	Nonce   string
}

// signSubjectState binds an opaque subject string into a signed, TTL'd,
// single-use-noncable state. Format:
//
//	base64url("<subject>.<exp>.<nonce>").base64url(hmac)
//
// The subject MUST NOT contain '.' (it is the field separator). `now`=0 ->
// time.Now. Returns an error only if the CSPRNG fails - we never emit a
// predictable nonce (which would let a redeemed state be replayed once the
// seen-set expires).
func signSubjectState(secret, subject string, now int64) (string, error) {
	if now == 0 {
		now = time.Now().Unix()
	}
	exp := now + oauthStateTTLSec
	nonce, err := randHex(16)
	if err != nil {
		return "", err
	}
	payload := base64.RawURLEncoding.EncodeToString([]byte(subject + "." + strconv.FormatInt(exp, 10) + "." + nonce))
	return payload + "." + hmacB64URL(secret, payload), nil
}

// verifySubjectState verifies a signed state. Returns the bound subject, expiry
// and nonce on success, or ok=false if the MAC is invalid, malformed, or expired.
// Constant-time MAC. `now`=0 -> time.Now.
func verifySubjectState(secret, state string, now int64) (subjectState, bool) {
	dot := strings.LastIndexByte(state, '.')
	if dot <= 0 {
		return subjectState{}, false
	}
	payload := state[:dot]
	mac := state[dot+1:]
	if !hmac.Equal([]byte(mac), []byte(hmacB64URL(secret, payload))) {
		return subjectState{}, false
	}
	decoded, err := base64.RawURLEncoding.DecodeString(payload)
	if err != nil {
		return subjectState{}, false
	}
	parts := strings.SplitN(string(decoded), ".", 3)
	if len(parts) != 3 || parts[0] == "" || parts[2] == "" {
		return subjectState{}, false
	}
	exp, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return subjectState{}, false
	}
	if now == 0 {
		now = time.Now().Unix()
	}
	if now > exp {
		return subjectState{}, false
	}
	return subjectState{Subject: parts[0], Exp: exp, Nonce: parts[2]}, true
}

// ── OAuth state (workspace-bound) ───────────────────────────────────────────

// oauthState is a verified OAuth state: the bound workspace, its expiry, and the
// single-use nonce.
type oauthState struct {
	Workspace string
	Exp       int64
	Nonce     string
}

// signOAuthState binds the initiating workspace UUID so the OAuth callback
// cannot be replayed/forged for another workspace (CSRF).
func signOAuthState(secret, workspace string, now int64) (string, error) {
	return signSubjectState(secret, workspace, now)
}

// verifyOAuthState verifies a workspace-bound OAuth state.
func verifyOAuthState(secret, state string, now int64) (oauthState, bool) {
	s, ok := verifySubjectState(secret, state, now)
	if !ok {
		return oauthState{}, false
	}
	return oauthState{Workspace: s.Subject, Exp: s.Exp, Nonce: s.Nonce}, true
}

// ── link state ((team, user)-bound) ─────────────────────────────────────────

// linkSep joins the Slack team + user into the state subject. Slack team/user
// ids are [A-Z0-9] (no ':' and no '.'), so the composite is unambiguous under
// both the linkSep split here and the '.' split in verifySubjectState.
const linkSep = ":"

// signLinkState binds (slack_team_id, slack_user_id) into a signed, single-use
// link state, so the hanzo.id OIDC link flow proves it originated from a
// server-minted prompt (which was itself gated by a verified Slack signature) -
// a forged team/user cannot be smuggled in.
func signLinkState(secret, teamID, slackUserID string, now int64) (string, error) {
	return signSubjectState(secret, teamID+linkSep+slackUserID, now)
}

// verifyLinkState verifies a link state and recovers the bound (team, user) +
// nonce. ok=false on any MAC/format/expiry failure.
func verifyLinkState(secret, state string, now int64) (teamID, slackUserID, nonce string, ok bool) {
	s, sok := verifySubjectState(secret, state, now)
	if !sok {
		return "", "", "", false
	}
	parts := strings.SplitN(s.Subject, linkSep, 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", "", false
	}
	return parts[0], parts[1], s.Nonce, true
}

// ── helpers ────────────────────────────────────────────────────────────────

func hmacB64URL(secret, payload string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

// randHex returns n cryptographically-random bytes hex-encoded. It surfaces a
// CSPRNG failure to the caller rather than degrading to a predictable value.
func randHex(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func abs64(x int64) int64 {
	if x < 0 {
		return -x
	}
	return x
}
