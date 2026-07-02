package slack

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// tokenStore persists Slack OAuth tokens via the CANONICAL Hanzo KMS secrets
// API. KMS encrypts at rest internally (KMS_ENCRYPTION_KEY_B64) — we store the
// token JSON as the secret VALUE and never touch a wrap/unwrap route (which does
// not exist). The token is never written to a DB column and never logged.
//
//	PUT    POST   /v1/kms/orgs/{org}/secrets            {path,name,value}
//	GET    GET    /v1/kms/orgs/{org}/secrets/{path}/{name}
//	DELETE DELETE /v1/kms/orgs/{org}/secrets/{path}/{name}
//
// Scope: path="team/slack", name="token-<teamId>". One secret per (org, Slack
// team). Tenant isolation is enforced by the {org} in the path — the KMS bearer
// (team-go's machine identity) is authorized per-org by KMS's own RBAC.
type tokenStore struct {
	base   string // KMS_ENDPOINT
	bearer string // machine identity (HANZO_API_KEY)
	client *http.Client
}

func newTokenStore(base, bearer string) *tokenStore {
	return &tokenStore{
		base:   strings.TrimRight(base, "/"),
		bearer: bearer,
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

const (
	slackSecretPath   = "team/slack"
	slackSecretPrefix = "token-"
)

func secretName(teamID string) string { return slackSecretPrefix + teamID }

// save upserts the token for (org, token.TeamID). POST /v1/kms/orgs/{org}/secrets.
func (t *tokenStore) save(ctx context.Context, org string, tok slackToken) error {
	if t.base == "" || t.bearer == "" {
		return fmt.Errorf("slack: KMS not configured (KMS_ENDPOINT/HANZO_API_KEY)")
	}
	value, err := json.Marshal(tok)
	if err != nil {
		return err
	}
	body, _ := json.Marshal(map[string]string{
		"path":  slackSecretPath,
		"name":  secretName(tok.TeamID),
		"value": string(value),
	})
	u := t.base + "/v1/kms/orgs/" + url.PathEscape(org) + "/secrets"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+t.bearer)
	req.Header.Set("Content-Type", "application/json")
	resp, err := t.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("slack: KMS put status %d: %s", resp.StatusCode, strings.TrimSpace(string(msg)))
	}
	return nil
}

// get fetches the token for (org, teamID). Returns ok=false on 404 (not
// connected). Used both to read the bot token AND as a tenant-ownership proof:
// a successful fetch under (org, teamID) proves this org connected that team.
func (t *tokenStore) get(ctx context.Context, org, teamID string) (slackToken, bool, error) {
	if t.base == "" || t.bearer == "" {
		return slackToken{}, false, fmt.Errorf("slack: KMS not configured")
	}
	u := t.base + "/v1/kms/orgs/" + url.PathEscape(org) + "/secrets/" +
		url.PathEscape(slackSecretPath) + "/" + url.PathEscape(secretName(teamID))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return slackToken{}, false, err
	}
	req.Header.Set("Authorization", "Bearer "+t.bearer)
	resp, err := t.client.Do(req)
	if err != nil {
		return slackToken{}, false, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode == http.StatusNotFound {
		return slackToken{}, false, nil
	}
	if resp.StatusCode != http.StatusOK {
		return slackToken{}, false, fmt.Errorf("slack: KMS get status %d", resp.StatusCode)
	}
	// KMS returns {"secret":{"value":"..."}} (canonical) or {"value":"..."} (flat).
	var wrapped struct {
		Secret struct {
			Value string `json:"value"`
		} `json:"secret"`
		Value string `json:"value"`
	}
	if err := json.Unmarshal(body, &wrapped); err != nil {
		return slackToken{}, false, fmt.Errorf("slack: KMS decode: %w", err)
	}
	raw := wrapped.Secret.Value
	if raw == "" {
		raw = wrapped.Value
	}
	if raw == "" {
		return slackToken{}, false, nil
	}
	var tok slackToken
	if err := json.Unmarshal([]byte(raw), &tok); err != nil {
		return slackToken{}, false, fmt.Errorf("slack: token decode: %w", err)
	}
	return tok, true, nil
}

// deleteToken removes the token for (org, teamID).
func (t *tokenStore) deleteToken(ctx context.Context, org, teamID string) error {
	u := t.base + "/v1/kms/orgs/" + url.PathEscape(org) + "/secrets/" +
		url.PathEscape(slackSecretPath) + "/" + url.PathEscape(secretName(teamID))
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, u, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+t.bearer)
	resp, err := t.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK &&
		resp.StatusCode != http.StatusNotFound {
		return fmt.Errorf("slack: KMS delete status %d", resp.StatusCode)
	}
	return nil
}
