package bots

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

// tokenFunc yields the current machine-identity bearer for a request. It is a
// VALUE that changes over time (tokens expire), so the IAM client holds a
// provider rather than a fixed string — one place asks "what is the token now".
type tokenFunc func(ctx context.Context) string

// staticToken is the trivial provider that always returns s (used in tests and
// anywhere a fixed bearer is already in hand).
func staticToken(s string) tokenFunc { return func(context.Context) string { return s } }

// machineToken mints and caches a client_credentials access token for the
// hanzo-team application — the machine identity team-go uses to read IAM
// service-accounts (and the cloud agent registry). It replaces the static
// HANZO_API_KEY: that key is an opaque platform API key that IAM does NOT accept
// as a bearer ("Access token doesn't exist in database"). The app confidential
// client (IAM_CLIENT_ID/IAM_CLIENT_SECRET, KMS-synced) mints a real IAM-issued
// app token that resolves to app/hanzo-team and carries the CapServiceAccountRead
// grant (org-scoped to hanzo).
type machineToken struct {
	iamEndpoint  string
	clientID     string
	clientSecret string
	client       *http.Client

	mu     sync.Mutex
	token  string
	expiry time.Time
}

// newMachineToken reads the confidential-client creds from the environment. When
// unset, configured() is false and get() returns "" — callers degrade exactly as
// before (cron skips, requests fail honestly) rather than sending a bad bearer.
func newMachineToken() *machineToken {
	return &machineToken{
		iamEndpoint:  strings.TrimRight(env("IAM_ENDPOINT", "https://hanzo.id"), "/"),
		clientID:     os.Getenv("IAM_CLIENT_ID"),
		clientSecret: os.Getenv("IAM_CLIENT_SECRET"),
		client:       &http.Client{Timeout: 15 * time.Second},
	}
}

// configured reports whether a machine identity is available (both creds set).
func (m *machineToken) configured() bool {
	return m.clientID != "" && m.clientSecret != ""
}

// get returns a valid bearer, minting a fresh client_credentials token when the
// cache is empty or within 60s of expiry. On a mint error it falls back to the
// still-cached token (empty if none), so a transient IAM hiccup degrades to the
// prior behaviour instead of panicking.
func (m *machineToken) get(ctx context.Context) string {
	if !m.configured() {
		return ""
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.token != "" && time.Now().Before(m.expiry.Add(-60*time.Second)) {
		return m.token
	}
	tok, ttl, err := m.mint(ctx)
	if err != nil || tok == "" {
		return m.token
	}
	m.token = tok
	m.expiry = time.Now().Add(ttl)
	return m.token
}

// mint performs the OAuth2 client_credentials grant against the canonical IAM
// token endpoint (${IAM_ENDPOINT}/v1/iam/oauth/token) and returns the access
// token plus its lifetime.
func (m *machineToken) mint(ctx context.Context) (string, time.Duration, error) {
	form := url.Values{
		"grant_type":    {"client_credentials"},
		"client_id":     {m.clientID},
		"client_secret": {m.clientSecret},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		m.iamEndpoint+"/v1/iam/oauth/token", strings.NewReader(form.Encode()))
	if err != nil {
		return "", 0, fmt.Errorf("bots: build token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	resp, err := m.client.Do(req)
	if err != nil {
		return "", 0, fmt.Errorf("bots: token request: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK {
		return "", 0, fmt.Errorf("bots: token status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	var out struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
		Error       string `json:"error"`
		ErrorDesc   string `json:"error_description"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return "", 0, fmt.Errorf("bots: token decode: %w", err)
	}
	if out.Error != "" {
		return "", 0, fmt.Errorf("bots: token error: %s: %s", out.Error, out.ErrorDesc)
	}
	if out.AccessToken == "" {
		return "", 0, fmt.Errorf("bots: token: empty access_token")
	}
	ttl := time.Duration(out.ExpiresIn) * time.Second
	if ttl <= 0 {
		ttl = time.Hour
	}
	return out.AccessToken, ttl, nil
}
