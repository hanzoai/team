package bots

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/tools/hook"
	"github.com/hanzoai/dbx"
	"github.com/hanzoai/team-go/pkg/wsauth"
)

// storeKey stashes the singleton bots service in the app runtime store so the
// login path (pkg/account) can trigger a per-user reconcile through the SAME
// service instance (shared machine-token cache) without an import cycle.
const storeKey = "hanzo.bots.service"

// Register binds the bot-member admin surface and the reconcile cron.
//
//	GET    /v1/bots        — list the workspace's bot members (admin)
//	POST   /v1/bots/sync   — reconcile all bots against IAM + cloud agents (admin)
//	POST   /v1/bots        — add one bot by service-account/agent id (admin)
//	DELETE /v1/bots        — deactivate one bot (admin)
//
// Every endpoint is admin-gated: the CALLER must be an owner/admin in the
// target workspace (resolved from their own auth record + membership, never a
// self-asserted claim). Org scoping: a bot's provenance is the caller's org
// (re.Auth owner), so one org can never see or touch another org's SA topology.
func Register(app core.App) {
	svc := newService(app)
	app.Store().Set(storeKey, svc) // reachable by the login-triggered reconcile
	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			e.Router.GET("/v1/bots", svc.list)
			e.Router.POST("/v1/bots/sync", svc.sync)
			e.Router.POST("/v1/bots", svc.add)
			e.Router.DELETE("/v1/bots", svc.remove)
			return e.Next()
		},
	})
	svc.startCron()
}

type service struct {
	app     core.App
	iam     *iamClient
	agents  *agentsClient
	mt      *machineToken
	homeOrg string // the org the machine identity (hanzo-team app) authoritatively represents
}

func newService(app core.App) *service {
	mt := newMachineToken()
	return &service{
		app:     app,
		iam:     newIAMClient(env("IAM_ENDPOINT", "https://hanzo.id"), mt.get),
		agents:  newAgentsClient(env("AGENTS_ENDPOINT", "https://api.hanzo.ai")),
		mt:      mt,
		homeOrg: env("IAM_ORG", "hanzo"),
	}
}

// ── endpoints ──────────────────────────────────────────────────────────────

func (s *service) list(re *core.RequestEvent) error {
	a, err := wsauth.AssertAdmin(s.app, re)
	if err != nil {
		return err
	}
	rows, e := s.app.FindRecordsByFilter("members",
		"workspace_id = {:w} && is_bot = true && organization = {:o}", "-joined_at", 500, 0,
		dbx.Params{"w": a.Workspace.Id, "o": a.Org})
	if e != nil {
		return re.InternalServerError("list bots", e)
	}
	out := make([]map[string]any, 0, len(rows))
	for _, m := range rows {
		out = append(out, botView(m))
	}
	return re.JSON(http.StatusOK, map[string]any{"bots": out})
}

func (s *service) sync(re *core.RequestEvent) error {
	a, err := wsauth.AssertAdmin(s.app, re)
	if err != nil {
		return err
	}
	// The caller's bearer is authoritative for a.Org — AssertAdmin proved the
	// caller's org equals the workspace's org — so identityOrg == a.Org and the
	// workspace's own cloud agents fold in safely.
	added, removed, e := s.reconcile(re.Request.Context(), a.Workspace, a.Org, s.callerBearer(re), a.UserID, a.Org)
	if e != nil {
		return re.InternalServerError("bot sync", e)
	}
	return re.JSON(http.StatusOK, map[string]any{"status": "synced", "added": added, "removed": removed})
}

type botReq struct {
	ServiceAccountID string `json:"serviceAccountId"`
}

func (s *service) add(re *core.RequestEvent) error {
	a, err := wsauth.AssertAdmin(s.app, re)
	if err != nil {
		return err
	}
	var req botReq
	if e := re.BindBody(&req); e != nil || strings.TrimSpace(req.ServiceAccountID) == "" {
		return re.BadRequestError("missing serviceAccountId", nil)
	}
	// The SA must exist in the caller's org (proves ownership; blocks adding a
	// foreign org's SA as a member of this workspace).
	sas, e := s.iam.listServiceAccounts(re.Request.Context(), a.Org)
	if e != nil {
		return re.InternalServerError("iam lookup", e)
	}
	var found *ServiceAccount
	for i := range sas {
		if sas[i].ID == req.ServiceAccountID {
			found = &sas[i]
			break
		}
	}
	if found == nil {
		return re.NotFoundError("service account not found in org", nil)
	}
	if e := s.ensureBotMember(a.Workspace, a.Org, *found); e != nil {
		return re.InternalServerError("ensure bot member", e)
	}
	return re.JSON(http.StatusCreated, map[string]any{"status": "added"})
}

func (s *service) remove(re *core.RequestEvent) error {
	a, err := wsauth.AssertAdmin(s.app, re)
	if err != nil {
		return err
	}
	var req botReq
	if e := re.BindBody(&req); e != nil || strings.TrimSpace(req.ServiceAccountID) == "" {
		return re.BadRequestError("missing serviceAccountId", nil)
	}
	if e := s.deactivate(a.Workspace, a.Org, req.ServiceAccountID); e != nil {
		return re.InternalServerError("remove bot", e)
	}
	return re.JSON(http.StatusOK, map[string]any{"status": "removed"})
}

// ── sync core ──────────────────────────────────────────────────────────────

// reconcile diffs the desired bot set against the workspace's current active
// bots and applies the plan. Idempotent.
//
// Two ORTHOGONAL sources, each owning a disjoint service_account_id subspace:
//
//   - IAM service-accounts (raw ids)  — read with the machine identity. IAM
//     enforces org authz server-side (a non-home org yields Unauthorized, never
//     another org's data), so this read is best-effort and NEVER fatal.
//   - cloud agents ("agent:<id>" ids) — folded in ONLY when the bearer is
//     org-authoritative for this workspace (identityOrg == org). Cloud pins the
//     org to the bearer's verified `owner` claim and IGNORES our requested org,
//     so reading a maxpower workspace with a hanzo machine token would return
//     HANZO's agents — a cross-tenant leak. The identityOrg gate is that guard.
//
// A source that does not load (auth error, outage, or gated off) contributes
// NOTHING — neither adds nor removals in its subspace. Only a source that
// loaded successfully may deactivate bots in its OWN subspace, so a transient
// failure or a wrong-org identity can never mass-remove a workspace's bots.
func (s *service) reconcile(ctx context.Context, ws *core.Record, org, bearer, userID, identityOrg string) (added, removed int, err error) {
	var desired []ServiceAccount
	iamOK, agentsOK := false, false

	if sas, e := s.iam.listServiceAccounts(ctx, org); e == nil {
		desired = append(desired, sas...)
		iamOK = true
	} else {
		s.app.Logger().Warn("bots: IAM SA list failed (non-fatal)", "err", e, "org", org)
	}

	// Fold cloud agents in ONLY with an org-authoritative bearer (see doc above).
	if s.agents != nil && identityOrg == org {
		if agents, e := s.agents.list(ctx, org, userID, bearer); e == nil {
			desired = append(desired, agents...)
			agentsOK = true
		} else {
			s.app.Logger().Warn("bots: cloud agents list failed (non-fatal)", "err", e, "org", org)
		}
	}

	// Never diff against a desired set built from ZERO live sources — that would
	// deactivate every bot in the workspace on a transient/auth failure.
	if !iamOK && !agentsOK {
		return 0, 0, fmt.Errorf("bots: no authorized source for org %s (iam+agents both unavailable)", org)
	}

	current := s.currentBots(ws.Id, org) // service_account_id -> member record
	currentIDs := make(map[string]bool, len(current))
	for id := range current {
		currentIDs[id] = true
	}
	plan := reconcile(desired, currentIDs)

	for _, sa := range plan.toAdd {
		if e := s.ensureBotMember(ws, org, sa); e != nil {
			s.app.Logger().Error("bots: ensure member", "err", e, "sa", sa.ID)
			continue
		}
		added++
	}
	for _, saID := range plan.toRemove {
		// Remove only within a subspace we actually loaded this cycle: an
		// unloaded source's members are preserved, never mass-removed.
		if isAgentID(saID) && !agentsOK {
			continue
		}
		if !isAgentID(saID) && !iamOK {
			continue
		}
		if e := s.deactivate(ws, org, saID); e != nil {
			s.app.Logger().Error("bots: deactivate member", "err", e, "sa", saID)
			continue
		}
		removed++
	}
	s.app.Logger().Info("bots: sync complete", "workspace", ws.Id, "org", org, "added", added, "removed", removed)
	return added, removed, nil
}

// currentBots returns the ACTIVE bot members of a workspace scoped to org,
// keyed by service_account_id.
func (s *service) currentBots(workspaceID, org string) map[string]*core.Record {
	rows, err := s.app.FindRecordsByFilter("members",
		"workspace_id = {:w} && is_bot = true && active = true && organization = {:o}", "", 1000, 0,
		dbx.Params{"w": workspaceID, "o": org})
	out := map[string]*core.Record{}
	if err != nil {
		return out
	}
	for _, m := range rows {
		if sa := m.GetString("service_account_id"); sa != "" {
			out[sa] = m
		}
	}
	return out
}

// ensureBotMember creates (or reactivates) the bot's member row. The account
// (user_id) is the deterministic accountUUID(saID), so re-runs never duplicate.
func (s *service) ensureBotMember(ws *core.Record, org string, sa ServiceAccount) error {
	acct := accountUUID(sa.ID)
	existing, _ := s.app.FindFirstRecordByFilter("members",
		"workspace_id = {:w} && user_id = {:u}", dbx.Params{"w": ws.Id, "u": acct})
	if existing != nil {
		// Reactivate + refresh provenance in place.
		existing.Set("is_bot", true)
		existing.Set("service_account_id", sa.ID)
		existing.Set("organization", org)
		existing.Set("agent_model", sa.AgentModel)
		existing.Set("display_name", displayName(sa))
		existing.Set("active", true)
		if existing.GetString("role") == "" {
			existing.Set("role", "member")
		}
		return s.app.Save(existing)
	}
	coll, err := s.app.FindCollectionByNameOrId("members")
	if err != nil {
		return err
	}
	m := core.NewRecord(coll)
	m.Set("workspace_id", ws.Id)
	m.Set("user_id", acct)
	m.Set("role", "member") // least privilege
	m.Set("is_bot", true)
	m.Set("service_account_id", sa.ID)
	m.Set("organization", org)
	m.Set("agent_model", sa.AgentModel)
	m.Set("display_name", displayName(sa))
	m.Set("active", true)
	return s.app.Save(m)
}

// deactivate marks a bot member inactive (does NOT delete — history keeps its
// authorship attribution). Scoped to (workspace, org, saId).
func (s *service) deactivate(ws *core.Record, org, saID string) error {
	m, _ := s.app.FindFirstRecordByFilter("members",
		"workspace_id = {:w} && service_account_id = {:s} && organization = {:o}",
		dbx.Params{"w": ws.Id, "s": saID, "o": org})
	if m == nil {
		return nil
	}
	if !m.GetBool("active") {
		return nil
	}
	m.Set("active", false)
	return s.app.Save(m)
}

// ── auth ───────────────────────────────────────────────────────────────────
// Workspace resolution + admin gating live in pkg/wsauth (one place).

// callerBearer extracts the caller's forwarded bearer (for the cloud agents hop).
func (s *service) callerBearer(re *core.RequestEvent) string {
	h := re.Request.Header.Get("Authorization")
	if len(h) > 7 && strings.EqualFold(h[:7], "Bearer ") {
		return h[7:]
	}
	return ""
}

// ── cron ───────────────────────────────────────────────────────────────────

// startCron runs a periodic reconcile across every workspace, per its owning
// org, using the machine identity. Interval from BOTS_SYNC_INTERVAL (default
// 15m); disabled when BOTS_SYNC_INTERVAL=off.
func (s *service) startCron() {
	iv := env("BOTS_SYNC_INTERVAL", "15m")
	if iv == "off" || !s.mt.configured() {
		return // no machine identity → cron would 401 every tick; skip cleanly
	}
	d, err := time.ParseDuration(iv)
	if err != nil || d <= 0 {
		d = 15 * time.Minute
	}
	go func() {
		t := time.NewTicker(d)
		defer t.Stop()
		for range t.C {
			s.reconcileAll()
		}
	}()
}

func (s *service) reconcileAll() {
	workspaces, err := s.app.FindRecordsByFilter("workspaces", "id != ''", "", 5000, 0, dbx.Params{})
	if err != nil {
		s.app.Logger().Error("bots: cron list workspaces", "err", err)
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	for _, ws := range workspaces {
		// The tenant is owner_org ONLY. A workspace without owner_org is skipped
		// (never fall back to `owner`, an account UUID: IAM would return an empty
		// SA set for it, and reconcile would then deactivate EVERY bot in the
		// workspace — a mass-removal from a mis-derived org).
		org := wsauth.WorkspaceOrg(ws)
		if org == "" {
			continue
		}
		// Machine-identity path: no caller bearer/user (cron acts as the SA).
		// identityOrg = homeOrg, so cloud agents fold in ONLY for the home org;
		// a non-home customer org (e.g. maxpower) reconciles on its own admin's
		// login (SyncUserWorkspaces) with that admin's org-authoritative token —
		// never with this shared identity, which would leak home-org agents.
		if _, _, e := s.reconcile(ctx, ws, org, s.mt.get(ctx), "", s.homeOrg); e != nil {
			s.app.Logger().Warn("bots: cron reconcile", "err", e, "workspace", ws.Id, "org", org)
		}
	}
}

// ── login-triggered per-org reconcile ───────────────────────────────────────

// SyncUserWorkspaces reconciles the bot members of every workspace the account
// owns or administers, using the caller's OWN org-authoritative IAM bearer.
// This is the multi-tenant entry point: cloud /v1/agents pins org to the
// bearer's verified `owner` claim, so a maxpower admin's token makes maxpower's
// workspace receive maxpower's agents — and ONLY those. Called best-effort at
// login (pkg/account.authCallback); it never blocks or fails login.
func SyncUserWorkspaces(app core.App, ctx context.Context, iamBearer, account, org string) {
	if iamBearer == "" || account == "" || org == "" {
		return
	}
	svc, _ := app.Store().Get(storeKey).(*service)
	if svc == nil {
		return
	}
	svc.syncUserWorkspaces(ctx, iamBearer, account, org)
}

func (s *service) syncUserWorkspaces(ctx context.Context, iamBearer, account, org string) {
	members, err := s.app.FindRecordsByFilter("members", "user_id = {:u}", "", 200, 0, dbx.Params{"u": account})
	if err != nil {
		return
	}
	seen := map[string]bool{}
	for _, mem := range members {
		if role := mem.GetString("role"); role != "owner" && role != "admin" {
			continue // only an admin's token may drive a workspace's bot set
		}
		wsID := mem.GetString("workspace_id")
		if wsID == "" || seen[wsID] {
			continue
		}
		seen[wsID] = true
		ws, _ := s.app.FindFirstRecordByFilter("workspaces", "id = {:id}", dbx.Params{"id": wsID})
		if ws == nil {
			continue
		}
		// The bearer is authoritative for `org` ONLY. Skip a co-administered
		// workspace owned by a different tenant so this user's org agents are
		// never attributed to a foreign-tenant workspace.
		if wsauth.WorkspaceOrg(ws) != org {
			continue
		}
		if _, _, e := s.reconcile(ctx, ws, org, iamBearer, account, org); e != nil {
			s.app.Logger().Warn("bots: login reconcile", "err", e, "workspace", ws.Id, "org", org)
		}
	}
}

// ── helpers ────────────────────────────────────────────────────────────────

func botView(m *core.Record) map[string]any {
	return map[string]any{
		"serviceAccountId": m.GetString("service_account_id"),
		"accountUuid":      m.GetString("user_id"),
		"organization":     m.GetString("organization"),
		"name":             m.GetString("display_name"),
		"agentModel":       m.GetString("agent_model"),
		"role":             m.GetString("role"),
		"active":           m.GetBool("active"),
	}
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
