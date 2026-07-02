package bots

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// cloudAgent is the subset of the cloud /v1/agents view we consume. The cloud
// registry (~/work/hanzo/cloud/clients/agents) is the canonical agent model;
// a bot is an agent bound to a workspace identity + membership. We fold cloud
// agents into the same ServiceAccount domain shape so reconcile treats IAM SAs
// and cloud agents uniformly (one reconcile, one way).
type cloudAgent struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Model  string `json:"model"`
	Status string `json:"status"`
}

type cloudAgentList struct {
	Agents []cloudAgent `json:"agents"`
}

// agentsClient reads the cloud agent registry over its /v1/agents surface,
// forwarding the caller's identity so the registry scopes to the caller's org.
type agentsClient struct {
	base   string
	client *http.Client
}

func newAgentsClient(base string) *agentsClient {
	base = strings.TrimRight(base, "/")
	if base == "" {
		return nil
	}
	return &agentsClient{base: base, client: &http.Client{Timeout: 15 * time.Second}}
}

// list fetches the caller's org agents. Identity is carried by the same headers
// the cloud gateway trusts (X-User-Id / X-Org-Id) plus the forwarded bearer.
// Returns them as disabled=false ServiceAccounts keyed by a distinct id space
// ("agent:<id>") so they never collide with IAM SA ids.
func (c *agentsClient) list(ctx context.Context, org, userID, bearer string) ([]ServiceAccount, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.base+"/v1/agents", nil)
	if err != nil {
		return nil, fmt.Errorf("bots: build agents request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}
	if userID != "" {
		req.Header.Set("X-User-Id", userID)
	}
	if org != "" {
		req.Header.Set("X-Org-Id", org)
	}
	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("bots: agents request: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("bots: agents status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	var out cloudAgentList
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, fmt.Errorf("bots: agents decode: %w", err)
	}
	sas := make([]ServiceAccount, 0, len(out.Agents))
	for _, a := range out.Agents {
		sas = append(sas, ServiceAccount{
			ID:           "agent:" + a.ID,
			Name:         a.Name,
			Organization: org,
			DisplayName:  a.Name,
			AgentModel:   a.Model,
			// A retired/archived agent is disabled → reconcile removes its member.
			Disabled: a.Status != "" && a.Status != "active" && a.Status != "ready",
		})
	}
	return sas, nil
}
