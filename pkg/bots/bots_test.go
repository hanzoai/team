package bots

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/tests"
	"github.com/hanzoai/base/tools/router"
	"github.com/hanzoai/dbx"
)

// bootApp boots a Base test app with workspaces + members collections and seeds
// a workspace whose admin is an owner member.
func bootApp(t *testing.T) (*tests.TestApp, *core.Record, *core.Record) {
	t.Helper()
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatalf("new test app: %v", err)
	}
	t.Cleanup(app.Cleanup)

	ws := core.NewBaseCollection("workspaces")
	ws.Fields.Add(&core.TextField{Name: "slug", Required: true})
	ws.Fields.Add(&core.TextField{Name: "name", Required: true})
	ws.Fields.Add(&core.TextField{Name: "owner"})
	ws.Fields.Add(&core.TextField{Name: "owner_org"})
	ws.Fields.Add(&core.TextField{Name: "uuid"})
	if err := app.Save(ws); err != nil {
		t.Fatal(err)
	}
	mem := core.NewBaseCollection("members")
	mem.Fields.Add(&core.RelationField{Name: "workspace_id", CollectionId: ws.Id, Required: true})
	mem.Fields.Add(&core.TextField{Name: "user_id", Required: true})
	mem.Fields.Add(&core.TextField{Name: "role", Required: true})
	mem.Fields.Add(&core.BoolField{Name: "is_bot"})
	mem.Fields.Add(&core.TextField{Name: "service_account_id"})
	mem.Fields.Add(&core.TextField{Name: "organization"})
	mem.Fields.Add(&core.TextField{Name: "agent_model"})
	mem.Fields.Add(&core.TextField{Name: "display_name"})
	mem.Fields.Add(&core.BoolField{Name: "active"})
	mem.Fields.Add(&core.AutodateField{Name: "joined_at", OnCreate: true})
	if err := app.Save(mem); err != nil {
		t.Fatal(err)
	}

	wsRec := core.NewRecord(ws)
	wsRec.Set("slug", "acme")
	wsRec.Set("name", "Acme")
	wsRec.Set("owner", "hanzo")
	wsRec.Set("owner_org", "hanzo")
	wsRec.Set("uuid", "22222222-2222-2222-2222-222222222222")
	if err := app.Save(wsRec); err != nil {
		t.Fatal(err)
	}

	users, _ := app.FindCollectionByNameOrId("users")
	admin := core.NewRecord(users)
	admin.Set("email", "admin@acme.test")
	admin.Set("password", "test12345")
	admin.Set("owner", "hanzo") // IAM owner claim mirrored onto the auth record
	if err := app.Save(admin); err != nil {
		t.Fatal(err)
	}
	m := core.NewRecord(mem)
	m.Set("workspace_id", wsRec.Id)
	m.Set("user_id", admin.Id)
	m.Set("role", "owner")
	if err := app.Save(m); err != nil {
		t.Fatal(err)
	}
	return app, wsRec, admin
}

// mockIAM returns an httptest IAM serving a fixed SA list.
func mockIAM(t *testing.T, sas string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"status":"ok","data":` + sas + `}`))
	}))
}

func TestBots_SyncCreatesAndDeactivatesMembers(t *testing.T) {
	app, ws, _ := bootApp(t)

	// IAM has two active SAs.
	iam := mockIAM(t, `[
		{"id":"sa1","name":"hanzo-triage","owner":"hanzo","agentModel":"opus"},
		{"id":"sa2","name":"hanzo-oncall","owner":"hanzo"}
	]`)
	defer iam.Close()

	svc := &service{app: app, iam: newIAMClient(iam.URL, "hk"), agents: nil}

	// First sync: both SAs become bot members.
	added, removed, err := svc.reconcile(t.Context(), ws, "hanzo", "hk", "")
	if err != nil {
		t.Fatalf("sync: %v", err)
	}
	if added != 2 || removed != 0 {
		t.Fatalf("first sync add=%d remove=%d want 2,0", added, removed)
	}
	if n := countBots(app, ws.Id); n != 2 {
		t.Fatalf("want 2 bot members, got %d", n)
	}
	// The member's user_id must be the deterministic account uuid for the SA.
	m, _ := app.FindFirstRecordByFilter("members",
		"service_account_id = {:s}", dbx.Params{"s": "sa1"})
	if m == nil || m.GetString("user_id") != accountUUID("sa1") {
		t.Fatal("bot member user_id is not the deterministic account uuid")
	}

	// Re-sync with the same IAM state: idempotent no-op (no dupes).
	added, removed, _ = svc.reconcile(t.Context(), ws, "hanzo", "hk", "")
	if added != 0 || removed != 0 {
		t.Fatalf("re-sync should be no-op, got add=%d remove=%d", added, removed)
	}
	if n := countBots(app, ws.Id); n != 2 {
		t.Fatalf("re-sync duplicated members: %d", n)
	}

	// sa2 disappears from IAM → its member is deactivated (not deleted).
	iam2 := mockIAM(t, `[{"id":"sa1","name":"hanzo-triage","owner":"hanzo"}]`)
	defer iam2.Close()
	svc.iam = newIAMClient(iam2.URL, "hk")
	added, removed, _ = svc.reconcile(t.Context(), ws, "hanzo", "hk", "")
	if added != 0 || removed != 1 {
		t.Fatalf("expected 1 removal, got add=%d remove=%d", added, removed)
	}
	// The row still exists (history) but is inactive.
	m2, _ := app.FindFirstRecordByFilter("members", "service_account_id = {:s}", dbx.Params{"s": "sa2"})
	if m2 == nil {
		t.Fatal("deactivated bot row should be retained, not deleted")
	}
	if m2.GetBool("active") {
		t.Fatal("removed bot should be inactive")
	}
	if n := countBots(app, ws.Id); n != 1 {
		t.Fatalf("active bot count after removal: %d want 1", n)
	}
}

func TestBots_ListRequiresAdmin(t *testing.T) {
	app, _, admin := bootApp(t)
	iam := mockIAM(t, `[]`)
	defer iam.Close()
	svc := &service{app: app, iam: newIAMClient(iam.URL, "hk")}

	// A stranger (no member row) is forbidden.
	users, _ := app.FindCollectionByNameOrId("users")
	stranger := core.NewRecord(users)
	stranger.Set("email", "stranger@x.test")
	stranger.Set("password", "test12345")
	_ = app.Save(stranger)

	rec := callBots(app, "GET", "/v1/bots?workspace=acme", stranger, "", svc.list)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("stranger list should be forbidden, got %d %s", rec.Code, rec.Body.String())
	}

	// The admin can list.
	rec = callBots(app, "GET", "/v1/bots?workspace=acme", admin, "", svc.list)
	if rec.Code != http.StatusOK {
		t.Fatalf("admin list: %d %s", rec.Code, rec.Body.String())
	}
}

func countBots(app core.App, wsID string) int {
	n, _ := app.CountRecords("members",
		dbx.HashExp{"workspace_id": wsID, "is_bot": true, "active": true})
	return int(n)
}

func callBots(app core.App, method, url string, auth *core.Record, body string, h func(*core.RequestEvent) error) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, url, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	re := &core.RequestEvent{App: app, Auth: auth}
	re.Request = req
	re.Response = rec
	if err := h(re); err != nil {
		apiErr := router.ToApiError(err)
		rec.WriteHeader(apiErr.Status)
		_ = json.NewEncoder(rec).Encode(apiErr)
	}
	return rec
}
