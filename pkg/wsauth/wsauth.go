// Package wsauth is the ONE place that resolves the caller's workspace and
// gates workspace-admin operations. Both /v1/bots and /v1/slack (and any future
// admin surface) go through it so the tenancy + role check exists once, not
// braided into each handler.
//
// The role is ALWAYS read from the `members` row (never a self-asserted claim),
// and the org is the IAM `owner` claim on the validated auth record. A caller
// with no member row, or a member below owner/admin, is refused.
package wsauth

import (
	"strings"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/dbx"
)

// Result is the resolved, authorized context for an admin request.
type Result struct {
	Workspace *core.Record // the target workspace record
	Org       string       // IAM tenant (owner claim)
	UserID    string       // caller's IAM id
	Role      string       // caller's role in the workspace
}

// AssertAdmin resolves the target workspace (from ?workspace=<uuid|slug>, or the
// caller's sole workspace) and requires the caller be an owner or admin member.
// Returns a ready-to-return *ApiError on failure (nil error on success).
func AssertAdmin(app core.App, re *core.RequestEvent) (Result, error) {
	if re.Auth == nil {
		return Result{}, re.UnauthorizedError("auth required", nil)
	}
	uid := re.Auth.Id
	org := re.Auth.GetString("owner")
	if org == "" {
		org = re.Request.Header.Get("X-Org-Id")
	}
	ws, err := ResolveWorkspace(app, re, uid)
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
// caller's sole workspace when they have exactly one.
func ResolveWorkspace(app core.App, re *core.RequestEvent, uid string) (*core.Record, error) {
	q := strings.TrimSpace(re.Request.URL.Query().Get("workspace"))
	if q != "" {
		ws, _ := app.FindFirstRecordByFilter("workspaces",
			"uuid = {:q} || slug = {:q}", dbx.Params{"q": q})
		if ws == nil {
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
	if ws == nil {
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
