package slack

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const slackAPI = "https://slack.com/api"

// slackToken is the OAuth material persisted for a connected workspace. Stored
// KMS-encrypted (never a DB column, never logged).
type slackToken struct {
	AccessToken string `json:"accessToken"` // xoxb-... bot token
	BotUserID   string `json:"botUserId"`
	TeamID      string `json:"teamId"`
	TeamName    string `json:"teamName"`
	Scope       string `json:"scope"`
	AppID       string `json:"appId"`
}

type oauthResult struct {
	OK          bool   `json:"ok"`
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Scope       string `json:"scope"`
	BotUserID   string `json:"bot_user_id"`
	AppID       string `json:"app_id"`
	Team        struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"team"`
	Error string `json:"error"`
}

var slackHTTP = &http.Client{Timeout: 15 * time.Second}

// exchangeCode exchanges an OAuth `code` for a bot token via oauth.v2.access.
// The client secret is supplied per-call from KMS-sourced config — never
// hardcoded. Go port of exchangeCode (slackapi.ts).
func exchangeCode(ctx context.Context, clientID, clientSecret, code, redirectURI string) (slackToken, error) {
	form := url.Values{
		"client_id":     {clientID},
		"client_secret": {clientSecret},
		"code":          {code},
		"redirect_uri":  {redirectURI},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, slackAPI+"/oauth.v2.access",
		strings.NewReader(form.Encode()))
	if err != nil {
		return slackToken{}, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := slackHTTP.Do(req)
	if err != nil {
		return slackToken{}, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	var data oauthResult
	if err := json.Unmarshal(body, &data); err != nil {
		return slackToken{}, fmt.Errorf("slack oauth decode: %w", err)
	}
	if !data.OK || data.AccessToken == "" || data.Team.ID == "" || data.BotUserID == "" {
		e := data.Error
		if e == "" {
			e = "unknown"
		}
		return slackToken{}, fmt.Errorf("slack oauth failed: %s", e)
	}
	return slackToken{
		AccessToken: data.AccessToken,
		BotUserID:   data.BotUserID,
		TeamID:      data.Team.ID,
		TeamName:    data.Team.Name,
		Scope:       data.Scope,
		AppID:       data.AppID,
	}, nil
}

// postMessage posts to a Slack channel (outgoing: Hanzo activity -> Slack). Go
// port of postMessage (slackapi.ts). The token is never logged on error.
func postMessage(ctx context.Context, tok slackToken, channel, text string) error {
	payload, _ := json.Marshal(map[string]string{"channel": channel, "text": text})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, slackAPI+"/chat.postMessage",
		strings.NewReader(string(payload)))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+tok.AccessToken)
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	resp, err := slackHTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	var data struct {
		OK    bool   `json:"ok"`
		Error string `json:"error"`
	}
	_ = json.Unmarshal(body, &data)
	if !data.OK {
		e := data.Error
		if e == "" {
			e = "unknown"
		}
		return fmt.Errorf("slack chat.postMessage failed: %s", e)
	}
	return nil
}
