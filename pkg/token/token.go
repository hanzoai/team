// Package token mints and verifies the JWTs that the Huly frontend, the
// account API and the transactor all share.
//
// The wire format is byte-compatible with Huly's `jwt-simple` HS256 tokens
// (foundations/core/packages/token/src/token.ts): header
// {"typ":"JWT","alg":"HS256"}, a COMPACT JSON payload whose keys appear in
// the fixed order {extra, account, workspace, grant, sub, exp, nbf} with
// undefined/empty keys omitted, base64url WITHOUT padding, and a raw
// HMAC-SHA256 signature over `header.payload`.
//
// account and workspace, when present, MUST be UUIDs — the upstream
// `generateToken` throws otherwise and the transactor client refuses a
// workspace token that is missing either, so we enforce the same invariant
// at mint time.
//
// The secret is the shared `SERVER_SECRET` (default "secret", matching the
// upstream metadata fallback). One secret, one wire format — every team-go
// surface signs and verifies through this package.
package token

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

// DefaultSecret mirrors the upstream `getSecret()` fallback. Production
// always sets SERVER_SECRET; the literal exists only so dev parity with the
// Huly pods (which also default to "secret") holds.
const DefaultSecret = "secret"

// header is the constant jwt-simple HS256 header, pre-encoded. jwt-simple
// emits exactly {"typ":"JWT","alg":"HS256"} (typ before alg); we hardcode
// the bytes so the segment is identical down to key order.
var header = base64.RawURLEncoding.EncodeToString([]byte(`{"typ":"JWT","alg":"HS256"}`))

// Token is the decoded payload. Field order is the jwt-simple emit order so
// that marshalling reproduces the upstream byte layout; `omitempty` drops the
// keys jwt-simple leaves `undefined`. account carries no omitempty: it is
// always present (the upstream payload always includes `account`).
type Token struct {
	Extra     map[string]any `json:"extra,omitempty"`
	Account   string         `json:"account"`
	Workspace string         `json:"workspace,omitempty"`
	Sub       string         `json:"sub,omitempty"`
	Exp       int64          `json:"exp,omitempty"`
	Nbf       int64          `json:"nbf,omitempty"`
}

// ErrMalformed is returned when a token is not three base64url segments.
var ErrMalformed = errors.New("token: malformed")

// ErrSignature is returned when HMAC verification fails.
var ErrSignature = errors.New("token: signature mismatch")

// Generate mints an HS256 token for account (always) and workspace
// (optional — pass "" for an account/login token that is not yet scoped to a
// workspace). extra is folded in as the leading `extra` claim when non-empty
// (e.g. {"service":"team"}). Both ids are validated as UUIDs.
func Generate(account, workspace string, extra map[string]any, secret string) (string, error) {
	if err := requireUUID("account", account); err != nil {
		return "", err
	}
	if workspace != "" {
		if err := requireUUID("workspace", workspace); err != nil {
			return "", err
		}
	}
	if secret == "" {
		secret = DefaultSecret
	}
	payload, err := marshalCompact(Token{Extra: extra, Account: account, Workspace: workspace})
	if err != nil {
		return "", err
	}
	body := base64.RawURLEncoding.EncodeToString(payload)
	signing := header + "." + body
	return signing + "." + sign(signing, secret), nil
}

// Decode verifies (when verify is true) and parses an HS256 token. It does not
// interpret exp/nbf — the upstream `decodeToken` likewise leaves expiry policy
// to callers; team-go tokens are minted without exp by default.
func Decode(tok, secret string, verify bool) (*Token, error) {
	h, body, sig, err := split(tok)
	if err != nil {
		return nil, err
	}
	if secret == "" {
		secret = DefaultSecret
	}
	if verify {
		if !hmac.Equal([]byte(sig), []byte(sign(h+"."+body, secret))) {
			return nil, ErrSignature
		}
	}
	raw, err := base64.RawURLEncoding.DecodeString(body)
	if err != nil {
		return nil, fmt.Errorf("token: bad payload: %w", err)
	}
	var t Token
	if err := json.Unmarshal(raw, &t); err != nil {
		return nil, fmt.Errorf("token: decode payload: %w", err)
	}
	return &t, nil
}

// Alg returns the `alg` from a token header without verifying anything. The
// account layer uses it to route IAM-issued RS* tokens (verified against the
// IAM JWKS upstream) away from the HS256 path.
func Alg(tok string) (string, error) {
	h, _, _, err := split(tok)
	if err != nil {
		return "", err
	}
	raw, err := base64.RawURLEncoding.DecodeString(h)
	if err != nil {
		return "", fmt.Errorf("token: bad header: %w", err)
	}
	var hd struct {
		Alg string `json:"alg"`
	}
	if err := json.Unmarshal(raw, &hd); err != nil {
		return "", fmt.Errorf("token: decode header: %w", err)
	}
	return hd.Alg, nil
}

func split(tok string) (h, body, sig string, err error) {
	parts := strings.Split(tok, ".")
	if len(parts) != 3 || parts[0] == "" || parts[1] == "" || parts[2] == "" {
		return "", "", "", ErrMalformed
	}
	return parts[0], parts[1], parts[2], nil
}

func sign(signing, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signing))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

// marshalCompact encodes v the way JSON.stringify does: compact and WITHOUT
// Go's default HTML escaping of <, > and &, which JSON.stringify never applies
// — disabling it keeps the bytes identical to the upstream signer.
func marshalCompact(v any) ([]byte, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	return bytes.TrimRight(buf.Bytes(), "\n"), nil
}

func requireUUID(field, v string) error {
	if err := uuid.Validate(v); err != nil {
		return fmt.Errorf("token: invalid %s uuid: %q", field, v)
	}
	return nil
}
