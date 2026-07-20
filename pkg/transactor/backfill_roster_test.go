package transactor

import (
	"os"
	"testing"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/tests"
)

// bootBase builds a Base test app with the workspaces + members collections the
// mirror reads, seeds one workspace (by uuid) and its members, and returns the
// app. Each member is (uid, role, displayName, isBot, active).
func bootBase(t *testing.T, wsUUID, org string, members [][]any) *tests.TestApp {
	t.Helper()
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatalf("new test app: %v", err)
	}
	t.Cleanup(app.Cleanup)

	ws := core.NewBaseCollection("workspaces")
	ws.Fields.Add(&core.TextField{Name: "slug"})
	ws.Fields.Add(&core.TextField{Name: "name"})
	ws.Fields.Add(&core.TextField{Name: "owner"})
	ws.Fields.Add(&core.TextField{Name: "owner_org"})
	ws.Fields.Add(&core.TextField{Name: "uuid"})
	if err := app.Save(ws); err != nil {
		t.Fatal(err)
	}
	mem := core.NewBaseCollection("members")
	mem.Fields.Add(&core.RelationField{Name: "workspace_id", CollectionId: ws.Id})
	mem.Fields.Add(&core.TextField{Name: "user_id"})
	mem.Fields.Add(&core.TextField{Name: "role"})
	mem.Fields.Add(&core.BoolField{Name: "is_bot"})
	mem.Fields.Add(&core.TextField{Name: "display_name"})
	mem.Fields.Add(&core.BoolField{Name: "active"})
	if err := app.Save(mem); err != nil {
		t.Fatal(err)
	}

	wr := core.NewRecord(ws)
	wr.Set("slug", "dave-lorenzini")
	wr.Set("name", "Dave")
	wr.Set("owner_org", org)
	wr.Set("uuid", wsUUID)
	if err := app.Save(wr); err != nil {
		t.Fatal(err)
	}
	for _, m := range members {
		r := core.NewRecord(mem)
		r.Set("workspace_id", wr.Id)
		r.Set("user_id", m[0])
		r.Set("role", m[1])
		r.Set("display_name", m[2])
		r.Set("is_bot", m[3])
		r.Set("active", m[4])
		if err := app.Save(r); err != nil {
			t.Fatal(err)
		}
	}
	return app
}

// TestBackfillReconcilesRosterDespiteSentinel locks the agents.10 fix: the member
// roster is projected on EVERY connect, so members added AFTER the one-time
// history backfill (e.g. bots synced while an image WITHOUT the mirror was live,
// setting only the human) still become Employees. A store already carrying the
// backfill sentinel must NOT short-circuit roster projection.
func TestBackfillReconcilesRosterDespiteSentinel(t *testing.T) {
	const org = "maxpower"
	const wsUUID = "6a6cd0c0-96a7-4093-9633-b9037f01e72e"
	const human = "113d4dd4-2486-40de-be2b-88d6e3e0b718"
	const bot1 = "b0f13607-cc15-5cc2-8abf-389ded136c9c" // maxpower-assistant
	const bot2 = "2633f8c7-0342-55ad-8ff4-6b3a4d2aefb7" // dave-ui-agent

	app := bootBase(t, wsUUID, org, [][]any{
		{human, "owner", "Dave Lorenzini", false, false},
		{bot1, "member", "maxpower-assistant", true, true},
		{bot2, "member", "dave-ui-agent", true, true},
	})

	dir, err := os.MkdirTemp("", "team-backfill")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { os.RemoveAll(dir) })
	srv := &server{app: app, hub: newHub(), store: newStore(dir), hier: buildHierarchy(modelJSON)}
	live = srv
	t.Cleanup(func() { live = nil })
	sess := &session{server: srv, store: srv.store, hier: srv.hier, org: org, workspace: wsUUID, account: acctSystem}

	// Simulate a PRE-EXISTING store from an earlier (pre-bot) connect: the sentinel
	// is already set, and only the human was ever projected. This is Dave's live
	// state — the bots were synced into Base AFTER the sentinel was written.
	if err := srv.store.put(org, wsUUID, map[string]any{
		"_id": backfillMarker, "_class": "team:class:BackfillMarker", "space": "core:space:Workspace",
	}); err != nil {
		t.Fatal(err)
	}
	sess.applyLocal(MemberTxes(Member{UserID: human, Name: "Dave Lorenzini", Role: "owner", Active: true}, false)...)
	if n := len(sess.queryDocs(mixinEmployee, nil)); n != 1 {
		t.Fatalf("precondition: employees before reconnect = %d, want 1 (human only)", n)
	}

	// A fresh connect: backfillFromBase must reconcile the FULL roster despite the
	// sentinel, so both bots now appear as Employees.
	sess.backfillFromBase()

	emps := sess.queryDocs(mixinEmployee, nil)
	if len(emps) != 3 {
		t.Fatalf("employees after roster reconcile = %d, want 3 (human + 2 bots)", len(emps))
	}
	for uid, who := range map[string]string{bot1: "maxpower-assistant", bot2: "dave-ui-agent"} {
		ps := sess.queryDocs(clPerson, map[string]any{"personUuid": uid})
		if len(ps) != 1 {
			t.Fatalf("bot %s not projected as Person despite existing sentinel", who)
		}
		if ps[0]["avatarType"] != "color" {
			t.Fatalf("bot %s Person missing avatarType=color: %v", who, ps[0])
		}
	}
	// The bot renders its display name (single token → canonical ",name").
	mp := sess.queryDocs(clPerson, map[string]any{"personUuid": bot1})
	if mp[0]["name"] != ",maxpower-assistant" {
		t.Fatalf("bot name = %v, want ,maxpower-assistant", mp[0]["name"])
	}
}
