package slack

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// oidcClient is the hanzo.id OIDC client team-go uses to LINK a Slack user to
// their own Hanzo account (authorization-code flow, confidential client - no
// PKCE). The canonical IAM OAuth surface is ${IAM_ENDPOINT}/v1/iam/oauth/*
// (HIP-0111): authorize/token/userinfo. The refresh token minted here is stored
// KMS-encrypted and later exchanged (grant_type=refresh_token) to mint a fresh,
// org-scoped access token that the agent run is authorized WITH - so the run
// bills the Slack user's own Hanzo org, never team-go's machine identity.
type oidcClient struct {
	base         string // ${IAM_ENDPOINT}/v1/iam
	clientID     string
	clientSecret string
	redirect     string // SLACK_LINK_REDIRECT_URI
	client       *http.Client
}

func newOIDCClient(iamEndpoint, clientID, clientSecret, redirect string) *oidcClient {
	base := strings.TrimRight(iamEndpoint, "/")
	if base == "" {
		base = "https://hanzo.id"
	}
	return &oidcClient{
		base:         base + "/v1/iam",
		clientID:     clientID,
		clientSecret: clientSecret,
		redirect:     redirect,
		client:       &http.Client{Timeout: 15 * time.Second},
	}
}

func (o *oidcClient) configured() bool {
	return o.clientID != "" && o.clientSecret != "" && o.redirect != ""
}

// tokenSet is the subset of the IAM token response the link flow consumes. A
// refresh token is REQUIRED (the offline_access scope requests it) so access
// tokens can be minted later without re-prompting the user.
type tokenSet struct {
	Access  string
	Refresh string
	IDToken string
}

// authorizeURL builds the IAM authorize redirect for the link flow. offline_access
// is required for IAM to issue a refresh token. `state` is the signed, single-use
// link state binding (slack_team_id, slack_user_id).
func (o *oidcClient) authorizeURL(state string) string {
	q := url.Values{
		"client_id":     {o.clientID},
		"redirect_uri":  {o.redirect},
		"response_type": {"code"},
		"scope":         {"openid profile email offline_access"},
		"state":         {state},
	}
	return o.base + "/oauth/authorize?" + q.Encode()
}

// exchangeCode swaps an authorization code for a token set at the IAM token
// endpoint. team-go is a confidential client (client_secret), so no PKCE.
func (o *oidcClient) exchangeCode(ctx context.Context, code string) (tokenSet, error) {
	return o.token(ctx, url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {o.redirect},
		"client_id":     {o.clientID},
		"client_secret": {o.clientSecret},
	})
}

// refresh mints a fresh token set from a stored refresh token
// (grant_type=refresh_token). IAM may rotate the refresh token; the caller
// persists the new one when it differs.
func (o *oidcClient) refresh(ctx context.Context, refreshToken string) (tokenSet, error) {
	return o.token(ctx, url.Values{
		"grant_type":    {"refresh_token"},
		"refresh_token": {refreshToken},
		"client_id":     {o.clientID},
		"client_secret": {o.clientSecret},
	})
}

// token performs an OAuth2 token request and returns the token set. The secrets
// (code/refresh_token/client_secret) are POST-form only and never logged.
func (o *oidcClient) token(ctx context.Context, form url.Values) (tokenSet, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, o.base+"/oauth/token",
		strings.NewReader(form.Encode()))
	if err != nil {
		return tokenSet{}, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	resp, err := o.client.Do(req)
	if err != nil {
		return tokenSet{}, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK {
		return tokenSet{}, fmt.Errorf("slack: IAM token status %d", resp.StatusCode)
	}
	var out struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		IDToken      string `json:"id_token"`
		Error        string `json:"error"`
		ErrorDesc    string `json:"error_description"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return tokenSet{}, fmt.Errorf("slack: IAM token decode: %w", err)
	}
	if out.Error != "" {
		return tokenSet{}, fmt.Errorf("slack: IAM token: %s", out.Error)
	}
	if out.AccessToken == "" {
		return tokenSet{}, fmt.Errorf("slack: IAM token: empty access_token")
	}
	return tokenSet{Access: out.AccessToken, Refresh: out.RefreshToken, IDToken: out.IDToken}, nil
}

// identity resolves the linked account's IAM subject (sub) and org (owner). The
// sub comes from the canonical userinfo endpoint (HIP-0111); the org is the
// `owner` claim on the access token (the Casdoor tenant). Matches the account
// package's login bridge - one identity model across team-go.
func (o *oidcClient) identity(ctx context.Context, access string) (sub, org string, err error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, o.base+"/oauth/userinfo", nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Authorization", "Bearer "+access)
	req.Header.Set("Accept", "application/json")
	resp, err := o.client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("slack: IAM userinfo status %d", resp.StatusCode)
	}
	var u struct {
		Sub   string `json:"sub"`
		Owner string `json:"owner"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&u); err != nil {
		return "", "", err
	}
	if u.Sub == "" {
		return "", "", fmt.Errorf("slack: IAM userinfo missing sub")
	}
	org = u.Owner
	if org == "" {
		org = ownerClaim(access)
	}
	return u.Sub, org, nil
}

// ownerClaim reads the Casdoor `owner` (tenant) claim from a JWT access token's
// payload WITHOUT verifying the signature: the token came to us directly from
// the IAM token endpoint over TLS, so its issuer is authenticated by the channel
// (OIDC allows channel validation in place of the id_token signature check for a
// direct client<->token-endpoint exchange). Returns "" if it cannot be read.
func ownerClaim(jwtTok string) string {
	parts := strings.Split(jwtTok, ".")
	if len(parts) < 2 {
		return ""
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		if raw, err = base64.StdEncoding.DecodeString(parts[1]); err != nil {
			return ""
		}
	}
	var claims struct {
		Owner string `json:"owner"`
	}
	if json.Unmarshal(raw, &claims) != nil {
		return ""
	}
	return claims.Owner
}
