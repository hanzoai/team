// Package wsauth is the ONE place that resolves the caller's workspace and
// gates workspace-admin operations. Both /v1/bots and /v1/slack (and any future
// admin surface) go through it so the tenancy + role check exists once, not
// braided into each handler.
//
// The role is ALWAYS read from the `members` row (never a self-asserted claim),
// and the caller's org (IAM tenant) is read from the identity the platform
// plugin resolved — see CallerOrg. The resolved workspace is asserted to belong
// to the caller's org (WorkspaceOrg), so a workspace uuid/slug from a foreign
// tenant is refused even before the membership check.
package wsauth

import (
	"strings"

	"github.com/google/uuid"
	"github.com/hanzoai/base/core"
	"github.com/hanzoai/dbx"
)

// Result is the resolved, authorized context for an admin request.
type Result struct {
	Workspace *core.Record // the target workspace record
	Org       string       // IAM tenant of the caller AND the workspace (asserted equal)
	UserID    string       // caller's IAM id
	Role      string       // caller's role in the workspace
}

// AccountID is the ONE way to derive team-go's canonical account id from an IAM
// subject. A sub that is already a UUID is used verbatim; any other sub maps to a
// stable UUIDv5 (namespace "iam:<sub>"). Both the login path (which stamps
// members.user_id + workspaces.owner — see pkg/account) and the admin/membership
// gate (which resolves the caller) MUST derive the id this way, so a member row
// and its owner resolve to the SAME key. Empty in → empty out.
func AccountID(sub string) string {
	sub = strings.TrimSpace(sub)
	if sub == "" {
		return ""
	}
	if uuid.Validate(sub) != nil {
		return uuid.NewSHA1(uuid.NameSpaceURL, []byte("iam:"+sub)).String()
	}
	return sub
}

// CallerUID is the ONE way to resolve the caller's canonical account id — the
// value stored on member rows (members.user_id) and used as the plane's Person
// key. It is NOT re.Auth.Id: Base's JWKS middleware mangles the raw OIDC sub into
// a 15-char record id (subToRecordID) for re.Auth.Id, which does not match the
// raw/normalized sub the account layer stores. The middleware stashes the raw sub
// at request key "authSub"; derive the canonical id from that. Fall back to
// re.Auth.Id only when authSub is absent (e.g. a native Base superuser token).
func CallerUID(re *core.RequestEvent) string {
	if sub, _ := re.Get("authSub").(string); strings.TrimSpace(sub) != "" {
		return AccountID(sub)
	}
	if re.Auth != nil {
		return re.Auth.Id
	}
	return ""
}

// CallerOrg is the ONE authoritative source of the caller's IAM tenant. The
// hanzo/base platform plugin validates the IAM JWT (or API key) and NORMALIZES
// the tenant into the X-Org-Id request header, overwriting any client-supplied
// value whenever it authenticated the request (re.Auth != nil OR an IAM key).
// The direct record field `org_id` is checked first for the JWT path so the
// resolution does not depend on middleware ordering; both agree in production.
// We do NOT read a bare `owner` field — IAM maps the token's owner claim to
// `org_id`, never `owner`, so reading `owner` silently yields "".
func CallerOrg(re *core.RequestEvent) string {
	if re.Auth != nil {
		if org := strings.TrimSpace(re.Auth.GetString("org_id")); org != "" {
			return org
		}
	}
	return strings.TrimSpace(re.Request.Header.Get("X-Org-Id"))
}

// WorkspaceOrg is the ONE way to read a workspace's owning tenant. `owner_org`
// is the canonical field (set at workspace creation). There is deliberately no
// fallback to the legacy `owner` field: `owner` holds the creating account's
// UUID, not an org, and using it as a tenant would store/prove KMS secrets under
// a per-user path instead of a per-org one (breaking KMS per-org RBAC).
func WorkspaceOrg(ws *core.Record) string {
	return strings.TrimSpace(ws.GetString("owner_org"))
}

// AssertAdmin resolves the target workspace (from ?workspace=<uuid|slug>, or the
// caller's sole workspace), verifies the workspace belongs to the caller's org,
// and requires the caller be an owner or admin member. On success Result.Org is
// the tenant of BOTH the caller and the workspace (they are asserted equal), so
// downstream KMS/IAM scoping is unambiguous. Returns a ready-to-return
// *ApiError on failure (nil error on success).
func AssertAdmin(app core.App, re *core.RequestEvent) (Result, error) {
	if re.Auth == nil {
		return Result{}, re.UnauthorizedError("auth required", nil)
	}
	uid := CallerUID(re)
	org := CallerOrg(re)
	if org == "" {
		return Result{}, re.ForbiddenError("no org context", nil)
	}
	ws, err := ResolveWorkspace(app, re, uid, org)
	if err != nil {
		return Result{}, err
	}
	m, _ := app.FindFirstRecordByFilter("members",
		"workspace_id = {:w} && user_id = {:u}", dbx.Params{"w": ws.Id, "u": uid})
	role := ""
	if m != nil {
		role = m.GetString("role")
	}
	if role != "owner" && role != "admin" {
		return Result{}, re.ForbiddenError("workspace admin role required", nil)
	}
	return Result{Workspace: ws, Org: org, UserID: uid, Role: role}, nil
}

// ResolveWorkspace picks the target workspace from ?workspace=<uuid|slug>, or the
// caller's sole workspace when they have exactly one, and requires it belong to
// callerOrg. The org check is what stops a caller in org A from resolving org
// B's workspace by passing its slug/uuid — the global uuid/slug lookup is only
// safe because this gate follows it.
func ResolveWorkspace(app core.App, re *core.RequestEvent, uid, callerOrg string) (*core.Record, error) {
	q := strings.TrimSpace(re.Request.URL.Query().Get("workspace"))
	if q != "" {
		ws, _ := app.FindFirstRecordByFilter("workspaces",
			"uuid = {:q} || slug = {:q}", dbx.Params{"q": q})
		if ws == nil || WorkspaceOrg(ws) != callerOrg {
			// Same 404 whether the workspace does not exist or is another
			// tenant's — no cross-tenant existence oracle.
			return nil, re.NotFoundError("workspace not found", nil)
		}
		return ws, nil
	}
	members, _ := app.FindRecordsByFilter("members", "user_id = {:u}", "", 2, 0, dbx.Params{"u": uid})
	if len(members) != 1 {
		return nil, re.BadRequestError("specify ?workspace=<uuid|slug>", nil)
	}
	ws, _ := app.FindFirstRecordByFilter("workspaces", "id = {:id}",
		dbx.Params{"id": members[0].GetString("workspace_id")})
	if ws == nil || WorkspaceOrg(ws) != callerOrg {
		return nil, re.NotFoundError("workspace not found", nil)
	}
	return ws, nil
}

// Member returns the caller's own member record in a workspace (nil if none). A
// helper for handlers that need the caller's membership without the admin gate.
func Member(app core.App, workspaceID, uid string) *core.Record {
	m, _ := app.FindFirstRecordByFilter("members",
		"workspace_id = {:w} && user_id = {:u}", dbx.Params{"w": workspaceID, "u": uid})
	return m
}
