package bots

import (
	"testing"

	"github.com/google/uuid"
	"github.com/hanzoai/base/core"
	"github.com/hanzoai/dbx"
)

// mkOwnedWorkspace creates a workspace whose canonical creator (owner) is the
// given account uuid, in the given tenant (owner_org) — the shape a personal
// workspace has in production (workspaces.owner == the account uuid).
func mkOwnedWorkspace(t *testing.T, app core.App, slug, ownerAcct, org string) *core.Record {
	t.Helper()
	coll, _ := app.FindCollectionByNameOrId("workspaces")
	r := core.NewRecord(coll)
	r.Set("slug", slug)
	r.Set("name", slug)
	r.Set("owner", ownerAcct) // canonical creator = the account uuid
	r.Set("owner_org", org)
	r.Set("uuid", uuid.NewString())
	if err := app.Save(r); err != nil {
		t.Fatal(err)
	}
	return r
}

func mkMember(t *testing.T, app core.App, wsID, acct, role string) {
	t.Helper()
	coll, _ := app.FindCollectionByNameOrId("members")
	m := core.NewRecord(coll)
	m.Set("workspace_id", wsID)
	m.Set("user_id", acct)
	m.Set("role", role)
	if err := app.Save(m); err != nil {
		t.Fatal(err)
	}
}

func roleOf(app core.App, wsID, acct string) string {
	m, _ := app.FindFirstRecordByFilter("members",
		"workspace_id = {:w} && user_id = {:u}", dbx.Params{"w": wsID, "u": acct})
	if m == nil {
		return "<none>"
	}
	return m.GetString("role")
}

// TestBots_OwnerRoleBackfill_PromotesCreatorAndReconciles locks the fix: an owner
// whose member row was created without the owner role (a workspace whose member
// row predates ensureWorkspace's role="owner" stamp) is promoted to owner at
// login BEFORE the role gate, so the login reconcile then runs and syncs the
// workspace's OWN cloud agents. This is the real-customer path (pre-existing
// workspace owners) the pinned Dave case is an instance of.
func TestBots_OwnerRoleBackfill_PromotesCreatorAndReconciles(t *testing.T) {
	app, _, _ := bootApp(t)
	dave := "113d4dd4-2486-40de-be2b-88d6e3e0b718"
	ws := mkOwnedWorkspace(t, app, "dave-lorenzini", dave, "maxpower")
	mkMember(t, app, ws.Id, dave, "member") // NOT owner — the pre-existing-owner bug

	iam := mockIAMOrg(t, "hanzo", `[]`) // Unauthorized for maxpower → non-fatal
	defer iam.Close()
	agents := mockAgents(t, `[{"id":"maxpower-assistant","name":"maxpower-assistant","model":"opus","status":"active"}]`)
	defer agents.Close()
	svc := &service{
		app:    app,
		iam:    newIAMClient(iam.URL, staticToken("machine")),
		agents: newAgentsClient(agents.URL),
		mt:     newMachineToken(),
	}

	svc.syncUserWorkspaces(t.Context(), "dave-bearer", dave, "maxpower")

	// The backfill promoted Dave's member row to owner...
	if r := roleOf(app, ws.Id, dave); r != "owner" {
		t.Fatalf("owner-role backfill did not promote the creator: role=%q want owner", r)
	}
	// ...and the login reconcile then ran, syncing maxpower's OWN cloud agent.
	bot, _ := app.FindFirstRecordByFilter("members",
		"workspace_id = {:w} && service_account_id = {:s}",
		dbx.Params{"w": ws.Id, "s": agentIDPrefix + "maxpower-assistant"})
	if bot == nil {
		t.Fatal("post-backfill reconcile did not sync maxpower-assistant as a member")
	}
	if !bot.GetBool("is_bot") || !bot.GetBool("active") || bot.GetString("organization") != "maxpower" {
		t.Fatalf("bad bot member after backfill: is_bot=%v active=%v org=%s",
			bot.GetBool("is_bot"), bot.GetBool("active"), bot.GetString("organization"))
	}
}

// TestBots_OwnerRoleBackfill_NeverPromotesCrossTenant is the isolation guard
// (blue→red): a workspace can carry ws.owner == the caller's account uuid yet
// belong to a DIFFERENT tenant (owner_org != the caller's verified org). The
// isolation gate runs BEFORE the backfill, so the caller's org-authoritative
// bearer must NOT promote their role there and must NOT reconcile that tenant's
// agents into it. Airtight: no cross-org role write, no cross-org bot leak.
func TestBots_OwnerRoleBackfill_NeverPromotesCrossTenant(t *testing.T) {
	app, _, _ := bootApp(t)
	dave := "113d4dd4-2486-40de-be2b-88d6e3e0b718"
	// owner == dave, but the workspace's tenant is "evil", not Dave's "maxpower".
	ws := mkOwnedWorkspace(t, app, "evil-ws", dave, "evil")
	mkMember(t, app, ws.Id, dave, "member")

	iam := mockIAMOrg(t, "hanzo", `[]`)
	defer iam.Close()
	agents := mockAgents(t, `[{"id":"evil-agent","name":"evil-agent","status":"active"}]`)
	defer agents.Close()
	svc := &service{
		app:    app,
		iam:    newIAMClient(iam.URL, staticToken("machine")),
		agents: newAgentsClient(agents.URL),
		mt:     newMachineToken(),
	}

	// Dave logs in with his maxpower-authoritative bearer.
	svc.syncUserWorkspaces(t.Context(), "dave-bearer", dave, "maxpower")

	if r := roleOf(app, ws.Id, dave); r != "member" {
		t.Fatalf("SECURITY: cross-tenant workspace role changed to %q (backfill fired across tenants)", r)
	}
	if n := countBots(app, ws.Id); n != 0 {
		t.Fatalf("SECURITY: reconciled %d bots into a foreign-tenant workspace", n)
	}
	leak, _ := app.FindFirstRecordByFilter("members",
		"workspace_id = {:w} && service_account_id = {:s}",
		dbx.Params{"w": ws.Id, "s": agentIDPrefix + "evil-agent"})
	if leak != nil {
		t.Fatal("SECURITY: evil-agent leaked into a foreign-tenant workspace")
	}
}
