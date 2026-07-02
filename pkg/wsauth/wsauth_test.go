package wsauth

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/tests"
	"github.com/hanzoai/base/tools/router"
)

// boot builds a Base test app with workspaces + members and seeds TWO tenants:
//   - org "acme": workspace acme-ws (owner_org=acme), admin member `acmeAdmin`
//   - org "evil": workspace evil-ws (owner_org=evil), admin member `evilAdmin`
//
// This lets each test prove that org "evil" cannot reach org "acme"'s workspace.
func boot(t *testing.T) (app *tests.TestApp, acmeWS, evilWS, acmeAdmin, evilAdmin, acmeMemberNonAdmin *core.Record) {
	t.Helper()
	var err error
	app, err = tests.NewTestApp()
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
	save(t, app, ws)

	mem := core.NewBaseCollection("members")
	mem.Fields.Add(&core.RelationField{Name: "workspace_id", CollectionId: ws.Id, Required: true})
	mem.Fields.Add(&core.TextField{Name: "user_id", Required: true})
	mem.Fields.Add(&core.TextField{Name: "role", Required: true})
	save(t, app, mem)

	acmeWS = mkWS(t, app, ws, "acme-ws", "acme", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
	evilWS = mkWS(t, app, ws, "evil-ws", "evil", "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")

	users, _ := app.FindCollectionByNameOrId("users")
	users.Fields.Add(&core.TextField{Name: "org_id"})
	save(t, app, users)

	acmeAdmin = mkUser(t, app, users, "admin@acme.test", "acme")
	evilAdmin = mkUser(t, app, users, "admin@evil.test", "evil")
	acmeMemberNonAdmin = mkUser(t, app, users, "grunt@acme.test", "acme")

	mkMember(t, app, mem, acmeWS.Id, acmeAdmin.Id, "owner")
	mkMember(t, app, mem, evilWS.Id, evilAdmin.Id, "owner")
	mkMember(t, app, mem, acmeWS.Id, acmeMemberNonAdmin.Id, "member")
	return
}

func mkWS(t *testing.T, app core.App, coll *core.Collection, slug, org, uid string) *core.Record {
	t.Helper()
	r := core.NewRecord(coll)
	r.Set("slug", slug)
	r.Set("name", slug)
	r.Set("owner", "acct-"+org) // account UUID (provenance), NOT the tenant
	r.Set("owner_org", org)
	r.Set("uuid", uid)
	if err := app.Save(r); err != nil {
		t.Fatal(err)
	}
	return r
}

func mkUser(t *testing.T, app core.App, coll *core.Collection, email, org string) *core.Record {
	t.Helper()
	r := core.NewRecord(coll)
	r.Set("email", email)
	r.Set("password", "test12345")
	r.Set("org_id", org)
	if err := app.Save(r); err != nil {
		t.Fatal(err)
	}
	return r
}

func mkMember(t *testing.T, app core.App, coll *core.Collection, wsID, uid, role string) {
	t.Helper()
	r := core.NewRecord(coll)
	r.Set("workspace_id", wsID)
	r.Set("user_id", uid)
	r.Set("role", role)
	if err := app.Save(r); err != nil {
		t.Fatal(err)
	}
}

func save(t *testing.T, app core.App, c *core.Collection) {
	t.Helper()
	if err := app.Save(c); err != nil {
		t.Fatalf("save %s: %v", c.Name, err)
	}
}

// req builds a RequestEvent with the given auth record and ?workspace= query.
func req(app core.App, auth *core.Record, workspace string) *core.RequestEvent {
	u := "/v1/x"
	if workspace != "" {
		u += "?workspace=" + workspace
	}
	r := httptest.NewRequest(http.MethodGet, u, nil)
	rec := httptest.NewRecorder()
	re := &core.RequestEvent{App: app, Auth: auth}
	re.Request = r
	re.Response = rec
	return re
}

func status(err error) int {
	if err == nil {
		return 200
	}
	return router.ToApiError(err).Status
}

// ── CallerOrg: the one authoritative org source ──────────────────────────────

func TestCallerOrg_ReadsOrgIdClaim_NotOwner(t *testing.T) {
	app, _, _, acmeAdmin, _, _ := boot(t)
	// org_id is set to "acme"; a stray `owner` field must be ignored.
	acmeAdmin.Set("owner", "some-account-uuid")
	re := req(app, acmeAdmin, "")
	if got := CallerOrg(re); got != "acme" {
		t.Fatalf("CallerOrg = %q, want acme (must read org_id, never owner)", got)
	}
}

func TestCallerOrg_FallsBackToHeader(t *testing.T) {
	app, _, _, _, _, _ := boot(t)
	users, _ := app.FindCollectionByNameOrId("users")
	noOrg := core.NewRecord(users) // no org_id claim on the record
	noOrg.Set("email", "keyauth@acme.test")
	noOrg.Set("password", "test12345")
	if err := app.Save(noOrg); err != nil {
		t.Fatal(err)
	}
	re := req(app, noOrg, "")
	re.Request.Header.Set("X-Org-Id", "acme") // platform middleware sets this
	if got := CallerOrg(re); got != "acme" {
		t.Fatalf("CallerOrg = %q, want acme from X-Org-Id fallback", got)
	}
}

// ── the core cross-tenant vector ─────────────────────────────────────────────

// TestAssertAdmin_CrossTenantWorkspaceRefused: org "evil"'s admin passes org
// "acme"'s workspace slug. The org gate (owner_org != callerOrg) must refuse it
// with a 404 (no cross-tenant existence oracle) BEFORE any membership check.
func TestAssertAdmin_CrossTenantWorkspaceRefused(t *testing.T) {
	app, acmeWS, _, _, evilAdmin, _ := boot(t)
	re := req(app, evilAdmin, "acme-ws")
	_, err := AssertAdmin(app, re)
	if status(err) != http.StatusNotFound {
		t.Fatalf("evil admin reaching acme-ws: status %d, want 404", status(err))
	}
	// And via the acme workspace UUID — same refusal (uuid is also a lookup key).
	re = req(app, evilAdmin, acmeWS.GetString("uuid"))
	if _, err := AssertAdmin(app, re); status(err) != http.StatusNotFound {
		t.Fatalf("evil admin reaching acme-ws by uuid: status %d, want 404", status(err))
	}
}

// TestAssertAdmin_HeaderSpoofDefeated: even if the attacker spoofs
// X-Org-Id: acme, the org_id CLAIM on the validated auth record wins, so a
// spoofed header cannot cross tenants. (In prod the platform middleware also
// overwrites the header; this proves CallerOrg's record-first precedence.)
func TestAssertAdmin_HeaderSpoofDefeated(t *testing.T) {
	app, _, _, _, evilAdmin, _ := boot(t)
	re := req(app, evilAdmin, "acme-ws")
	re.Request.Header.Set("X-Org-Id", "acme") // spoof
	_, err := AssertAdmin(app, re)
	if status(err) != http.StatusNotFound {
		t.Fatalf("header spoof crossed tenants: status %d, want 404", status(err))
	}
}

// TestAssertAdmin_SameTenantAdminAllowed: the happy path — an admin of their own
// org's workspace is allowed, and Result.Org equals the workspace tenant.
func TestAssertAdmin_SameTenantAdminAllowed(t *testing.T) {
	app, _, _, acmeAdmin, _, _ := boot(t)
	re := req(app, acmeAdmin, "acme-ws")
	res, err := AssertAdmin(app, re)
	if err != nil {
		t.Fatalf("same-tenant admin refused: %v", err)
	}
	if res.Org != "acme" {
		t.Fatalf("Result.Org = %q, want acme", res.Org)
	}
	if WorkspaceOrg(res.Workspace) != res.Org {
		t.Fatal("Result.Org must equal the workspace tenant (store/prove consistency)")
	}
}

// TestAssertAdmin_NonAdminMemberRefused: a plain member (correct org, has a row)
// is still refused the admin gate.
func TestAssertAdmin_NonAdminMemberRefused(t *testing.T) {
	app, _, _, _, _, grunt := boot(t)
	re := req(app, grunt, "acme-ws")
	if _, err := AssertAdmin(app, re); status(err) != http.StatusForbidden {
		t.Fatalf("non-admin member: status %d, want 403", status(err))
	}
}

// TestAssertAdmin_NoOrgContextRefused: an auth record with no org (and no
// header) cannot resolve any tenant.
func TestAssertAdmin_NoOrgContextRefused(t *testing.T) {
	app, _, _, _, _, _ := boot(t)
	users, _ := app.FindCollectionByNameOrId("users")
	orphan := core.NewRecord(users)
	orphan.Set("email", "orphan@nowhere.test")
	orphan.Set("password", "test12345")
	if err := app.Save(orphan); err != nil {
		t.Fatal(err)
	}
	re := req(app, orphan, "acme-ws")
	if _, err := AssertAdmin(app, re); status(err) != http.StatusForbidden {
		t.Fatalf("no-org caller: status %d, want 403", status(err))
	}
}

// TestWorkspaceOrg_NoOwnerFallback: WorkspaceOrg reads owner_org ONLY. A row
// with a legacy `owner` (account UUID) but no owner_org resolves to "" — never
// to the account UUID (which would break KMS per-org scoping).
func TestWorkspaceOrg_NoOwnerFallback(t *testing.T) {
	app, _, _, _, _, _ := boot(t)
	wsColl, _ := app.FindCollectionByNameOrId("workspaces")
	legacy := core.NewRecord(wsColl)
	legacy.Set("slug", "legacy")
	legacy.Set("name", "legacy")
	legacy.Set("owner", "some-account-uuid")
	// owner_org intentionally unset.
	legacy.Set("uuid", "cccccccc-cccc-cccc-cccc-cccccccccccc")
	if err := app.Save(legacy); err != nil {
		t.Fatal(err)
	}
	if got := WorkspaceOrg(legacy); got != "" {
		t.Fatalf("WorkspaceOrg = %q, want empty (no owner fallback)", got)
	}
}
