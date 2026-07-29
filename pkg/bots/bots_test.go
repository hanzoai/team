package bots

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/tests"
	"github.com/hanzoai/base/tools/router"
	"github.com/hanzoai/dbx"
)

// uuidV5URL derives a uuid v5 over the URL namespace — the same algorithm the
// account layer (pkg/account) and accountUUID (bots) use, so the tests can
// reproduce a "human" account uuid for the collision check.
func uuidV5URL(s string) string {
	return uuid.NewSHA1(uuid.NameSpaceURL, []byte(s)).String()
}

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
	if users.Fields.GetByName("org_id") == nil {
		users.Fields.Add(&core.TextField{Name: "org_id"})
		if err := app.Save(users); err != nil {
			t.Fatal(err)
		}
	}
	admin := core.NewRecord(users)
	admin.Set("email", "admin@acme.test")
	admin.Set("password", "test12345")
	admin.Set("org_id", "hanzo") // IAM tenant claim mirrored onto the auth record
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

	svc := &service{app: app, iam: newIAMClient(iam.URL, staticToken("hk")), agents: nil}

	// First sync: both SAs become bot members.
	added, removed, err := svc.reconcile(t.Context(), ws, "hanzo", "hk", "", "hanzo")
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
	added, removed, _ = svc.reconcile(t.Context(), ws, "hanzo", "hk", "", "hanzo")
	if added != 0 || removed != 0 {
		t.Fatalf("re-sync should be no-op, got add=%d remove=%d", added, removed)
	}
	if n := countBots(app, ws.Id); n != 2 {
		t.Fatalf("re-sync duplicated members: %d", n)
	}

	// sa2 disappears from IAM → its member is deactivated (not deleted).
	iam2 := mockIAM(t, `[{"id":"sa1","name":"hanzo-triage","owner":"hanzo"}]`)
	defer iam2.Close()
	svc.iam = newIAMClient(iam2.URL, staticToken("hk"))
	added, removed, _ = svc.reconcile(t.Context(), ws, "hanzo", "hk", "", "hanzo")
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
	svc := &service{app: app, iam: newIAMClient(iam.URL, staticToken("hk"))}

	// A stranger (valid org context, but NO member row) is forbidden — proving
	// the membership/role gate, not just the org gate.
	users, _ := app.FindCollectionByNameOrId("users")
	stranger := core.NewRecord(users)
	stranger.Set("email", "stranger@x.test")
	stranger.Set("password", "test12345")
	stranger.Set("org_id", "hanzo")
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

// TestCron_SkipsWorkspaceWithoutOwnerOrg is the regression for the cron
// mass-deactivation bug: reconcileAll must NOT run a reconcile for a workspace
// whose owner_org is empty. If it did, it would derive an empty/garbage org,
// IAM would return zero SAs, and reconcile would deactivate EVERY existing bot
// in that workspace. We seed one active bot, run the cron with an IAM that would
// return [] for any org, and assert the bot survives (workspace was skipped).
func TestCron_SkipsWorkspaceWithoutOwnerOrg(t *testing.T) {
	app, ws, _ := bootApp(t)
	// Blank out the tenant to simulate a legacy row (owner set, owner_org empty).
	ws.Set("owner_org", "")
	ws.Set("owner", "acct-uuid-legacy")
	if err := app.Save(ws); err != nil {
		t.Fatal(err)
	}
	// Seed an active bot member directly.
	mColl, _ := app.FindCollectionByNameOrId("members")
	bot := core.NewRecord(mColl)
	bot.Set("workspace_id", ws.Id)
	bot.Set("user_id", accountUUID("sa-keep"))
	bot.Set("role", "member")
	bot.Set("is_bot", true)
	bot.Set("service_account_id", "sa-keep")
	bot.Set("organization", "hanzo")
	bot.Set("active", true)
	if err := app.Save(bot); err != nil {
		t.Fatal(err)
	}

	// An IAM that returns [] for every org — the mass-deactivation trigger.
	iam := mockIAM(t, `[]`)
	defer iam.Close()
	svc := &service{app: app, iam: newIAMClient(iam.URL, staticToken("hk")), mt: newMachineToken()}

	svc.reconcileAll()

	if n := countBots(app, ws.Id); n != 1 {
		t.Fatalf("cron deactivated a bot for a workspace with no owner_org (mass-removal bug): active=%d want 1", n)
	}
}

// TestBotAccount_NeverCollidesWithHuman proves the uuidv5 DOMAIN separation: a
// bot member's account (uuidv5 over the dedicated SA namespace) can never equal a
// human account (uuidv5 over the URL namespace of "iam:<sub>"), so a bot cannot
// hijack a human's member row and vice versa — regardless of how the human's IAM
// sub is spelled. This is the regression for the shared-namespace prefix
// aliasing where a human sub "sa:<id>" collided with SA id "<id>".
func TestBotAccount_NeverCollidesWithHuman(t *testing.T) {
	// Human account derivation mirrors pkg/account: uuidv5(URL, "iam:<sub>").
	human := func(sub string) string {
		return uuidV5URL("iam:" + sub)
	}
	// Probe the exact strings that aliased under the old shared-namespace scheme,
	// plus a plain id. None may collide now that bot accounts use a separate
	// namespace.
	for _, sub := range []string{"collide-me", "sa:collide-me", "iam:sa:collide-me"} {
		if accountUUID("collide-me") == human(sub) {
			t.Fatalf("bot account collided with human sub %q (namespace not domain-separated)", sub)
		}
	}
	// Sanity: the bot derivation is still deterministic under the new namespace.
	if accountUUID("x") != accountUUID("x") {
		t.Fatal("bot accountUUID no longer deterministic")
	}
}

// mkWorkspace seeds a workspace owned by org.
func mkWorkspace(t *testing.T, app core.App, slug, org string) *core.Record {
	t.Helper()
	coll, _ := app.FindCollectionByNameOrId("workspaces")
	r := core.NewRecord(coll)
	r.Set("slug", slug)
	r.Set("name", slug)
	r.Set("owner", "acct-"+org) // provenance, NOT the tenant
	r.Set("owner_org", org)
	r.Set("uuid", uuid.NewString())
	if err := app.Save(r); err != nil {
		t.Fatal(err)
	}
	return r
}

// mockIAMOrg serves SAs only for homeOrg; any other ?organization= gets the
// "Unauthorized operation" envelope (HTTP 200, status:"error") — exactly
// how real IAM refuses a machine identity reading a foreign org's SAs.
func mockIAMOrg(t *testing.T, homeOrg, sas string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("organization") != homeOrg {
			_, _ = w.Write([]byte(`{"status":"error","msg":"Unauthorized operation"}`))
			return
		}
		_, _ = w.Write([]byte(`{"status":"ok","data":` + sas + `}`))
	}))
}

// mockAgents serves a fixed cloud /v1/agents list to any authenticated caller.
// The real cloud pins org to the bearer's owner claim; here the discriminator is
// whether the reconcile CHOOSES to call it (the identityOrg gate), which is what
// these tests exercise.
func mockAgents(t *testing.T, agents string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/agents" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		_, _ = w.Write([]byte(`{"agents":` + agents + `}`))
	}))
}

// TestBots_CrossOrgIsolation is the blue→red core: the shared hanzo machine
// identity must NEVER leak hanzo's cloud agents into another org's workspace.
// Cloud pins org to the token's owner, so a machine reconcile of a maxpower
// workspace (identityOrg=hanzo != org=maxpower) must SKIP cloud agents entirely,
// and — with IAM refusing maxpower — end as a safe no-op.
func TestBots_CrossOrgIsolation(t *testing.T) {
	app, _, _ := bootApp(t)
	maxpower := mkWorkspace(t, app, "maxpower-ws", "maxpower")

	iam := mockIAMOrg(t, "hanzo", `[{"id":"sa1","name":"hanzo-triage","owner":"hanzo"}]`)
	defer iam.Close()
	agents := mockAgents(t, `[{"id":"hanzo-assistant","name":"hanzo-assistant","status":"active"}]`)
	defer agents.Close()

	svc := &service{
		app:    app,
		iam:    newIAMClient(iam.URL, staticToken("machine")),
		agents: newAgentsClient(agents.URL),
		mt:     newMachineToken(),
	}

	added, removed, err := svc.reconcile(t.Context(), maxpower, "maxpower", "machine", "", "hanzo")
	if err == nil {
		t.Fatal("machine reconcile of a foreign org must error (no authorized source), got nil")
	}
	if added != 0 || removed != 0 {
		t.Fatalf("cross-org leak: add=%d remove=%d want 0,0", added, removed)
	}
	if n := countBots(app, maxpower.Id); n != 0 {
		t.Fatalf("maxpower workspace received a bot it must never see: %d", n)
	}
	leak, _ := app.FindFirstRecordByFilter("members",
		"workspace_id = {:w} && service_account_id = {:s}",
		dbx.Params{"w": maxpower.Id, "s": agentIDPrefix + "hanzo-assistant"})
	if leak != nil {
		t.Fatal("SECURITY: hanzo-assistant leaked into maxpower workspace")
	}
}

// TestBots_PerOrg_OrgAuthoritativeBearer is the real-customer path (Dave/login):
// with an org-authoritative bearer (identityOrg == org == maxpower), the
// workspace receives ITS OWN cloud agent (maxpower-assistant) — even though IAM
// refuses maxpower for the machine identity (that read is non-fatal).
func TestBots_PerOrg_OrgAuthoritativeBearer(t *testing.T) {
	app, _, _ := bootApp(t)
	maxpower := mkWorkspace(t, app, "maxpower-ws", "maxpower")

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

	added, _, err := svc.reconcile(t.Context(), maxpower, "maxpower", "dave-bearer", "dave", "maxpower")
	if err != nil {
		t.Fatalf("per-org reconcile: %v", err)
	}
	if added != 1 {
		t.Fatalf("expected maxpower-assistant added, add=%d", added)
	}
	m, _ := app.FindFirstRecordByFilter("members",
		"workspace_id = {:w} && service_account_id = {:s}",
		dbx.Params{"w": maxpower.Id, "s": agentIDPrefix + "maxpower-assistant"})
	if m == nil {
		t.Fatal("maxpower-assistant not synced as a member")
	}
	if !m.GetBool("is_bot") || m.GetString("organization") != "maxpower" || !m.GetBool("active") {
		t.Fatalf("bad bot member: is_bot=%v org=%s active=%v",
			m.GetBool("is_bot"), m.GetString("organization"), m.GetBool("active"))
	}
	if m.GetString("display_name") != "maxpower-assistant" {
		t.Fatalf("bot display_name=%q want maxpower-assistant", m.GetString("display_name"))
	}
}

// TestBots_CronNeverFoldsCloudAgents locks MEDIUM-1: the cron/machine path
// (identityOrg="") must NEVER fold cloud agents — not even for the home org —
// because cloud pins org to the forwarded token's verified owner and a shared
// machine token is not authoritative for any workspace's cloud agents. The cron
// syncs IAM service-accounts only; cloud agents sync on an admin login.
func TestBots_CronNeverFoldsCloudAgents(t *testing.T) {
	app, ws, _ := bootApp(t) // hanzo (home-org) workspace
	iam := mockIAMOrg(t, "hanzo", `[{"id":"sa-home","name":"hanzo-oncall","owner":"hanzo"}]`)
	defer iam.Close()
	agents := mockAgents(t, `[{"id":"home-agent","name":"hanzo-assistant","status":"active"}]`)
	defer agents.Close()
	svc := &service{
		app:    app,
		iam:    newIAMClient(iam.URL, staticToken("machine")),
		agents: newAgentsClient(agents.URL),
		mt:     newMachineToken(),
	}
	// Cron path: identityOrg="" (what reconcileAll passes).
	added, _, err := svc.reconcile(t.Context(), ws, "hanzo", "machine", "", "")
	if err != nil {
		t.Fatalf("cron reconcile: %v", err)
	}
	if added != 1 {
		t.Fatalf("cron should add only the IAM SA, add=%d", added)
	}
	if m, _ := app.FindFirstRecordByFilter("members", "service_account_id = {:s}", dbx.Params{"s": "sa-home"}); m == nil {
		t.Fatal("home IAM SA not synced by cron")
	}
	if leak, _ := app.FindFirstRecordByFilter("members",
		"service_account_id = {:s}", dbx.Params{"s": agentIDPrefix + "home-agent"}); leak != nil {
		t.Fatal("cron folded a cloud agent (MEDIUM-1 regression)")
	}
}

// TestBots_FailedSourceDoesNotMassRemoveOtherSubspace: a source that fails to
// load (here cloud agents is down) must never cause its subspace's existing bots
// to be deactivated — removals are gated per successfully-loaded subspace.
func TestBots_FailedSourceDoesNotMassRemoveOtherSubspace(t *testing.T) {
	app, ws, _ := bootApp(t) // hanzo workspace
	mColl, _ := app.FindCollectionByNameOrId("members")
	for _, sa := range []string{agentIDPrefix + "keep-agent", "keep-iam"} {
		b := core.NewRecord(mColl)
		b.Set("workspace_id", ws.Id)
		b.Set("user_id", accountUUID(sa))
		b.Set("role", "member")
		b.Set("is_bot", true)
		b.Set("service_account_id", sa)
		b.Set("organization", "hanzo")
		b.Set("active", true)
		if err := app.Save(b); err != nil {
			t.Fatal(err)
		}
	}

	iam := mockIAMOrg(t, "hanzo", `[{"id":"keep-iam","name":"hanzo-keep","owner":"hanzo"}]`)
	defer iam.Close()
	down := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
	}))
	defer down.Close()

	svc := &service{
		app:    app,
		iam:    newIAMClient(iam.URL, staticToken("machine")),
		agents: newAgentsClient(down.URL),
		mt:     newMachineToken(),
	}
	_, removed, err := svc.reconcile(t.Context(), ws, "hanzo", "machine", "", "hanzo")
	if err != nil {
		t.Fatalf("reconcile (iam loaded, must not be fatal): %v", err)
	}
	if removed != 0 {
		t.Fatalf("a down source mass-removed its subspace bots: removed=%d", removed)
	}
	keep, _ := app.FindFirstRecordByFilter("members",
		"service_account_id = {:s}", dbx.Params{"s": agentIDPrefix + "keep-agent"})
	if keep == nil || !keep.GetBool("active") {
		t.Fatal("cloud-agent bot removed despite its source being unavailable")
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
