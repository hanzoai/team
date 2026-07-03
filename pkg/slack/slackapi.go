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

// slackAPI is the Slack Web API base. A var (not const) so tests can point the
// oauth.v2.access / chat.* calls at an httptest server; production never mutates
// it.
var slackAPI = "https://slack.com/api"

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
	AuthedUser struct {
		ID string `json:"id"`
	} `json:"authed_user"`
	Error string `json:"error"`
}

var slackHTTP = &http.Client{Timeout: 15 * time.Second}

// oauthV2Access POSTs an authorization code to oauth.v2.access and returns the
// parsed result. Shared by the bot-install leg (exchangeCode) and the user
// sign-in leg (exchangeUserCode). The client secret is supplied per-call from
// KMS-sourced config - never hardcoded, never logged.
func oauthV2Access(ctx context.Context, clientID, clientSecret, code, redirectURI string) (oauthResult, error) {
	form := url.Values{
		"client_id":     {clientID},
		"client_secret": {clientSecret},
		"code":          {code},
		"redirect_uri":  {redirectURI},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, slackAPI+"/oauth.v2.access",
		strings.NewReader(form.Encode()))
	if err != nil {
		return oauthResult{}, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := slackHTTP.Do(req)
	if err != nil {
		return oauthResult{}, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	var data oauthResult
	if err := json.Unmarshal(body, &data); err != nil {
		return oauthResult{}, fmt.Errorf("slack oauth decode: %w", err)
	}
	if !data.OK {
		e := data.Error
		if e == "" {
			e = "unknown"
		}
		return oauthResult{}, fmt.Errorf("slack oauth failed: %s", e)
	}
	return data, nil
}

// exchangeCode exchanges an OAuth `code` for a BOT token (the app-install leg).
func exchangeCode(ctx context.Context, clientID, clientSecret, code, redirectURI string) (slackToken, error) {
	data, err := oauthV2Access(ctx, clientID, clientSecret, code, redirectURI)
	if err != nil {
		return slackToken{}, err
	}
	if data.AccessToken == "" || data.Team.ID == "" || data.BotUserID == "" {
		return slackToken{}, fmt.Errorf("slack oauth: incomplete bot grant")
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

// exchangeUserCode exchanges an OAuth `code` from the USER sign-in leg (user_scope)
// and returns the Slack-VERIFIED (team, user) identity: authed_user.id is the
// authenticated Slack subject. This is the identity the account link binds - it
// is proven by Slack here, NEVER taken from a client-supplied URL/state param
// (the account-link-hijack defense). The user access token is not retained.
func exchangeUserCode(ctx context.Context, clientID, clientSecret, code, redirectURI string) (teamID, slackUserID string, err error) {
	data, err := oauthV2Access(ctx, clientID, clientSecret, code, redirectURI)
	if err != nil {
		return "", "", err
	}
	if data.AuthedUser.ID == "" || data.Team.ID == "" {
		return "", "", fmt.Errorf("slack oauth: no authenticated user")
	}
	return data.Team.ID, data.AuthedUser.ID, nil
}

// postMessage posts to a Slack channel (top-level, no thread). Token never logged.
func postMessage(ctx context.Context, tok slackToken, channel, text string) error {
	return postThreadMessage(ctx, tok, channel, "", text)
}

// postThreadMessage posts to a Slack channel, threaded under threadTS when it is
// non-empty (the agent reply threads under the triggering @mention/DM; the
// channel-mirror path passes ""). The bot token is never logged on error.
func postThreadMessage(ctx context.Context, tok slackToken, channel, threadTS, text string) error {
	fields := map[string]string{"channel": channel, "text": text}
	if threadTS != "" {
		fields["thread_ts"] = threadTS
	}
	return chatPost(ctx, tok, "/chat.postMessage", fields)
}

// postEphemeral posts a message visible ONLY to `user` in `channel` - used for
// the account-link prompt so a link URL is NEVER shown to a whole channel (the
// forwardable-link-hijack defense). Requires chat:write.
func postEphemeral(ctx context.Context, tok slackToken, channel, user, text string) error {
	return chatPost(ctx, tok, "/chat.postEphemeral", map[string]string{
		"channel": channel, "user": user, "text": text,
	})
}

// chatPost is the shared chat.* poster: JSON body, bot bearer, ok-envelope check.
func chatPost(ctx context.Context, tok slackToken, method string, fields map[string]string) error {
	payload, _ := json.Marshal(fields)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, slackAPI+method,
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
		return fmt.Errorf("slack %s failed: %s", strings.TrimPrefix(method, "/"), e)
	}
	return nil
}
