// Package bots reconciles a workspace's persistent bot members against two
// canonical sources of truth:
//
//   - Hanzo IAM agent service-accounts (GET /v1/iam/service-accounts?organization=<org>)
//   - the cloud agent registry (GET /v1/agents), when AGENTS_ENDPOINT is set
//
// A bot is represented as an ordinary `members` row whose account (user_id) is
// the DETERMINISTIC uuid v5 of `iam:sa:<saId>` (see socialValue/accountUUID),
// carrying a bot badge + provenance. Because the account uuid is a pure function
// of the SA id, re-running the sync never creates duplicates.
//
// This is the Go port of the TypeScript @hanzoteam/iam-client + pod-slack
// botmembers, with the SAME security properties: admin-gated endpoints, org
// scoping (never expose another org's SA topology), and the Casdoor response
// envelope handled explicitly (a 200 with status:"error" is still an error).
package bots

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ServiceAccount is the domain shape this package works in — Casdoor-free. It
// is produced from an IamUser by mapIamUser (the single reconciliation point
// between the IAM wire shape and the domain model).
type ServiceAccount struct {
	ID           string
	Name         string
	Organization string
	DisplayName  string
	AgentModel   string
	Disabled     bool
}

// iamUser is a raw IAM (Casdoor) user record for a service-account principal as
// it appears inside the response envelope's `data` array. Field names are
// Casdoor's own: `owner` is the organization, `isForbidden`/`isDeleted` are the
// disable flags. accessKey/accessSecret are masked by the server and never read.
type iamUser struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Owner       string `json:"owner"`
	Type        string `json:"type"`
	DisplayName string `json:"displayName"`
	AgentModel  string `json:"agentModel"`
	IsForbidden bool   `json:"isForbidden"`
	IsDeleted   bool   `json:"isDeleted"`
}

// iamEnvelope is the canonical Casdoor response envelope. GET
// /v1/iam/service-accounts returns the SA list directly in `data` (there is no
// {serviceAccounts} key).
type iamEnvelope struct {
	Status string    `json:"status"`
	Msg    string    `json:"msg"`
	Data   []iamUser `json:"data"`
}

// mapIamUser maps a raw Casdoor user record to a ServiceAccount. `owner` is the
// organization; a SA is disabled if it is forbidden OR soft-deleted. Single
// point of Casdoor→domain reconciliation — everything downstream is Casdoor-free.
func mapIamUser(u iamUser) ServiceAccount {
	return ServiceAccount{
		ID:           u.ID,
		Name:         u.Name,
		Organization: u.Owner,
		DisplayName:  u.DisplayName,
		AgentModel:   u.AgentModel,
		Disabled:     u.IsForbidden || u.IsDeleted,
	}
}

// iamClient is a read-only IAM client for discovering agent service-accounts to
// sync as bot members. The bearer is a machine identity (from KMS/env), never
// hardcoded.
type iamClient struct {
	base   string
	token  string
	client *http.Client
}

func newIAMClient(base, token string) *iamClient {
	return &iamClient{
		base:   strings.TrimRight(base, "/"),
		token:  token,
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

// listServiceAccounts calls GET /v1/iam/service-accounts?organization=<org>.
// IAM speaks the Casdoor envelope: {status,msg,data:[]}. A 200 with
// status:"error" (e.g. unauthorized) is still an error to us.
func (c *iamClient) listServiceAccounts(ctx context.Context, org string) ([]ServiceAccount, error) {
	if c.base == "" {
		return nil, fmt.Errorf("bots: IAM_ENDPOINT not configured")
	}
	u := c.base + "/v1/iam/service-accounts?organization=" + url.QueryEscape(org)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, fmt.Errorf("bots: build IAM request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Accept", "application/json")
	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("bots: IAM request: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("bots: IAM listServiceAccounts status %d: %s",
			resp.StatusCode, strings.TrimSpace(string(body)))
	}
	var env iamEnvelope
	if err := json.Unmarshal(body, &env); err != nil {
		return nil, fmt.Errorf("bots: IAM decode: %w", err)
	}
	if env.Status != "ok" {
		msg := env.Msg
		if msg == "" {
			msg = "unknown"
		}
		return nil, fmt.Errorf("bots: IAM listServiceAccounts error: %s", msg)
	}
	out := make([]ServiceAccount, 0, len(env.Data))
	for _, u := range env.Data {
		out = append(out, mapIamUser(u))
	}
	return out, nil
}

// ── deterministic identity ─────────────────────────────────────────────────

// socialValue is the stable social-id VALUE binding an IAM service-account to a
// workspace account. Deterministic and collision-free per SA (namespaced by the
// principal id), so re-running the sync always resolves to the SAME account.
func socialValue(saID string) string { return "iam:sa:" + saID }

// accountUUID is the deterministic AccountUuid for a service-account: uuid v5
// (SHA-1) over the URL namespace of the social value. Same algorithm the account
// layer uses to derive a stable account uuid from a non-UUID IAM sub, so a bot's
// members.user_id is stable across re-syncs and matches nowhere else.
func accountUUID(saID string) string {
	return uuid.NewSHA1(uuid.NameSpaceURL, []byte(socialValue(saID))).String()
}

// nameParts splits "<org>-<agent>" (or displayName) into first/last for display.
func nameParts(sa ServiceAccount) (first, last string) {
	display := strings.TrimSpace(sa.DisplayName)
	if display == "" {
		display = strings.TrimSpace(sa.Name)
	}
	if display == "" {
		display = sa.ID
	}
	if dash := strings.IndexByte(display, '-'); dash > 0 && dash < len(display)-1 {
		return display[:dash], display[dash+1:]
	}
	return display, "bot"
}

// displayName is the human-readable label for a bot member: the SA's own
// displayName if set, else its name, else its id. (nameParts is the separate
// first/last split for systems that store a Person's name in two fields.)
func displayName(sa ServiceAccount) string {
	if d := strings.TrimSpace(sa.DisplayName); d != "" {
		return d
	}
	if n := strings.TrimSpace(sa.Name); n != "" {
		return n
	}
	return sa.ID
}
