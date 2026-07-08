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

// kmsClient is the ONE place that talks to the canonical Hanzo KMS secrets API.
// KMS encrypts at rest internally (KMS_ENCRYPTION_KEY_B64) - we store an opaque
// string VALUE and never touch a wrap/unwrap route (which does not exist). The
// value is never written to a DB column and never logged. Typed stores (the
// per-workspace Slack bot token, the per-user refresh token) compose this - one
// HTTP path, two subjects.
//
//	PUT    POST   /v1/kms/orgs/{org}/secrets            {path,name,env,value}
//	GET    GET    /v1/kms/orgs/{org}/secrets/{path}/{name}?env=
//	DELETE DELETE /v1/kms/orgs/{org}/secrets/{path}/{name}?env=
//
// Tenant isolation is the {org} in the path - the KMS bearer (team-go's machine
// identity) is authorized per-org by KMS's own RBAC.
type kmsClient struct {
	base   string // KMS_ENDPOINT
	bearer string // machine identity (HANZO_API_KEY)
	client *http.Client
}

func newKMS(base, bearer string) *kmsClient {
	return &kmsClient{
		base:   strings.TrimRight(base, "/"),
		bearer: bearer,
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

// kmsEnv is the KMS environment these Slack tokens live under. KMS keys every
// record by {path}/{env}/{name} and now REQUIRES env on writes (a silent
// default is refused). These tokens were historically written/read with env
// omitted — i.e. the server's old "default" bucket — so we pin the explicit
// "default" here to keep reading the exact same records (no data move) while
// satisfying the required-env write contract. Both put and get pass it.
const kmsEnv = "default"

// put upserts a secret value under (org, path, name).
func (k *kmsClient) put(ctx context.Context, org, path, name, value string) error {
	if k.base == "" || k.bearer == "" {
		return fmt.Errorf("slack: KMS not configured (KMS_ENDPOINT/HANZO_API_KEY)")
	}
	body, _ := json.Marshal(map[string]string{"path": path, "name": name, "env": kmsEnv, "value": value})
	u := k.base + "/v1/kms/orgs/" + url.PathEscape(org) + "/secrets"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+k.bearer)
	req.Header.Set("Content-Type", "application/json")
	resp, err := k.client.Do(req)
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

// get fetches the secret VALUE under (org, path, name). found=false on 404 (not
// stored). KMS returns {"secret":{"value":"..."}} (canonical) or {"value":"..."}.
func (k *kmsClient) get(ctx context.Context, org, path, name string) (string, bool, error) {
	if k.base == "" || k.bearer == "" {
		return "", false, fmt.Errorf("slack: KMS not configured")
	}
	u := k.base + "/v1/kms/orgs/" + url.PathEscape(org) + "/secrets/" +
		url.PathEscape(path) + "/" + url.PathEscape(name) + "?env=" + url.QueryEscape(kmsEnv)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return "", false, err
	}
	req.Header.Set("Authorization", "Bearer "+k.bearer)
	resp, err := k.client.Do(req)
	if err != nil {
		return "", false, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode == http.StatusNotFound {
		return "", false, nil
	}
	if resp.StatusCode != http.StatusOK {
		return "", false, fmt.Errorf("slack: KMS get status %d", resp.StatusCode)
	}
	var wrapped struct {
		Secret struct {
			Value string `json:"value"`
		} `json:"secret"`
		Value string `json:"value"`
	}
	if err := json.Unmarshal(body, &wrapped); err != nil {
		return "", false, fmt.Errorf("slack: KMS decode: %w", err)
	}
	raw := wrapped.Secret.Value
	if raw == "" {
		raw = wrapped.Value
	}
	if raw == "" {
		return "", false, nil
	}
	return raw, true, nil
}

// del removes the secret under (org, path, name). A 404 is treated as success
// (idempotent delete).
func (k *kmsClient) del(ctx context.Context, org, path, name string) error {
	if k.base == "" || k.bearer == "" {
		return fmt.Errorf("slack: KMS not configured")
	}
	u := k.base + "/v1/kms/orgs/" + url.PathEscape(org) + "/secrets/" +
		url.PathEscape(path) + "/" + url.PathEscape(name) + "?env=" + url.QueryEscape(kmsEnv)
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, u, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+k.bearer)
	resp, err := k.client.Do(req)
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

// ── per-workspace Slack bot token ───────────────────────────────────────────

const (
	slackSecretPath   = "team/slack"
	slackSecretPrefix = "token-"
)

func secretName(teamID string) string { return slackSecretPrefix + teamID }

// tokenStore persists the per-workspace Slack bot token (slackToken JSON) via
// KMS. Scope: path="team/slack", name="token-<teamId>". One secret per (org,
// Slack team).
type tokenStore struct{ kms *kmsClient }

func newTokenStore(base, bearer string) *tokenStore { return &tokenStore{kms: newKMS(base, bearer)} }

// save upserts the token for (org, token.TeamID).
func (t *tokenStore) save(ctx context.Context, org string, tok slackToken) error {
	value, err := json.Marshal(tok)
	if err != nil {
		return err
	}
	return t.kms.put(ctx, org, slackSecretPath, secretName(tok.TeamID), string(value))
}

// get fetches the token for (org, teamID). Returns ok=false when not connected.
// Used both to read the bot token AND as a tenant-ownership proof: a successful
// fetch under (org, teamID) proves this org connected that team.
func (t *tokenStore) get(ctx context.Context, org, teamID string) (slackToken, bool, error) {
	raw, ok, err := t.kms.get(ctx, org, slackSecretPath, secretName(teamID))
	if err != nil || !ok {
		return slackToken{}, false, err
	}
	var tok slackToken
	if err := json.Unmarshal([]byte(raw), &tok); err != nil {
		return slackToken{}, false, fmt.Errorf("slack: token decode: %w", err)
	}
	return tok, true, nil
}

// deleteToken removes the token for (org, teamID).
func (t *tokenStore) deleteToken(ctx context.Context, org, teamID string) error {
	return t.kms.del(ctx, org, slackSecretPath, secretName(teamID))
}

// ── per-user Hanzo refresh token (on-behalf-of identity) ────────────────────

// userTokenPath is the KMS folder for per-user Hanzo refresh tokens. The secret
// name is "<teamId>.<userId>" so one secret exists per (Slack team, Slack user).
// Stored under the workspace TENANT org (the same org as the bot token), never a
// per-account path - KMS per-org RBAC.
const userTokenPath = "slack-user-tokens"

func userSecretName(teamID, slackUserID string) string { return teamID + "." + slackUserID }

// userToken is the on-behalf-of credential material for a linked Slack user: the
// Hanzo refresh token (used to mint fresh access tokens at run time) plus the
// account identity it points at. Stored KMS-encrypted; never logged.
type userToken struct {
	RefreshToken string `json:"refreshToken"`
	Subject      string `json:"subject"`
	Org          string `json:"org"`
}

// userTokenStore persists per-user Hanzo refresh tokens via KMS.
type userTokenStore struct{ kms *kmsClient }

func newUserTokenStore(base, bearer string) *userTokenStore {
	return &userTokenStore{kms: newKMS(base, bearer)}
}

// save upserts the refresh token for (org, teamID, slackUserID).
func (t *userTokenStore) save(ctx context.Context, org, teamID, slackUserID string, ut userToken) error {
	value, err := json.Marshal(ut)
	if err != nil {
		return err
	}
	return t.kms.put(ctx, org, userTokenPath, userSecretName(teamID, slackUserID), string(value))
}

// get fetches the refresh token for (org, teamID, slackUserID). ok=false when
// the user has not linked (no secret).
func (t *userTokenStore) get(ctx context.Context, org, teamID, slackUserID string) (userToken, bool, error) {
	raw, ok, err := t.kms.get(ctx, org, userTokenPath, userSecretName(teamID, slackUserID))
	if err != nil || !ok {
		return userToken{}, false, err
	}
	var ut userToken
	if err := json.Unmarshal([]byte(raw), &ut); err != nil {
		return userToken{}, false, fmt.Errorf("slack: user token decode: %w", err)
	}
	return ut, true, nil
}
