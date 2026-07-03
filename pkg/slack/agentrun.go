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

// agentHTTP is the client for the on-behalf-of agent run + the slash-command
// delayed reply. A generous timeout: an agent run executes a real model
// completion server-side.
var agentHTTP = &http.Client{Timeout: 100 * time.Second}

// slackResponseHost is the ONLY host a slash-command response_url may target.
// Slack always issues response_urls under hooks.slack.com; pinning it stops a
// forged command payload (should the signature ever be bypassed) from turning
// team-go into an SSRF/exfil client to an attacker host.
const slackResponseHost = "hooks.slack.com"

// runResult is the subset of the cloud RunResult (clients/agents toRunView) we
// consume: the run's status and the model's text output. Field names are the
// authoritative cloud contract (`status` == "ok" on success, text in `output`,
// upstream failure in `error`).
type runResult struct {
	Status string `json:"status"`
	Output string `json:"output"`
	Error  string `json:"error"`
}

// runAgent runs an agent ON BEHALF OF a Hanzo user by calling THROUGH the cloud
// gateway (api.hanzo.ai) with the user's OWN bearer: the gateway validates the
// JWT and mints X-Org-Id (HIP-0026) + the principal, and cloud enforces the org
// + billingActor. team-go therefore sends ONLY the Authorization header - it
// never forges X-Org-Id/X-User-Id (a client-supplied org is untrusted; the
// gateway derives it from the token). Returns the agent's text output.
//
//	POST {base}/v1/agents/{ref}/run   {"input": "..."}   -> RunResult
func runAgent(ctx context.Context, base, ref, input, bearer string) (string, error) {
	base = strings.TrimRight(base, "/")
	if base == "" {
		return "", fmt.Errorf("slack: agent endpoint not configured")
	}
	if bearer == "" {
		return "", fmt.Errorf("slack: agent run requires a user bearer")
	}
	payload, _ := json.Marshal(map[string]string{"input": input})
	u := base + "/v1/agents/" + url.PathEscape(ref) + "/run"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u, strings.NewReader(string(payload)))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+bearer)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	resp, err := agentHTTP.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	var out runResult
	// A run that executed but failed comes back as 502 with the same shape; a
	// gateway/authz error may not be JSON. Decode best-effort, then branch on
	// HTTP status + run status so both are surfaced (never leaked verbatim).
	_ = json.Unmarshal(body, &out)
	if resp.StatusCode != http.StatusOK {
		if out.Error != "" {
			return "", fmt.Errorf("slack: agent run failed: %s", out.Error)
		}
		return "", fmt.Errorf("slack: agent run status %d", resp.StatusCode)
	}
	if out.Status != "ok" {
		if out.Error != "" {
			return "", fmt.Errorf("slack: agent run error: %s", out.Error)
		}
		return "", fmt.Errorf("slack: agent run not ok")
	}
	return out.Output, nil
}

// postResponseURL delivers a slash-command reply to Slack's response_url (a
// short-lived capability URL Slack supplies with the command - no bot token
// needed). The host is pinned to hooks.slack.com. responseType is "in_channel"
// for an answer (visible, like an @mention reply) or "ephemeral" for a link
// prompt (visible only to the invoking user - never leak a link URL to a channel).
func postResponseURL(ctx context.Context, responseURL, responseType, text string) error {
	u, err := url.Parse(responseURL)
	if err != nil {
		return fmt.Errorf("slack: bad response_url")
	}
	if u.Scheme != "https" || u.Hostname() != slackResponseHost {
		return fmt.Errorf("slack: response_url host not allowed")
	}
	payload, _ := json.Marshal(map[string]string{"response_type": responseType, "text": text})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, responseURL, strings.NewReader(string(payload)))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := agentHTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1<<16))
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("slack: response_url status %d", resp.StatusCode)
	}
	return nil
}
