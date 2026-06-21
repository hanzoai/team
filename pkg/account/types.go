// Package account implements the Huly account API the Svelte frontend speaks
// to at ACCOUNTS_URL — JSON-RPC over a single POST endpoint, plus the
// /providers, /auth/{provider} and /cookie REST siblings. It is the login +
// workspace-selection control plane: identity comes from Hanzo IAM (the
// /auth/openid bridge), tokens are minted by pkg/token, and workspaces +
// membership live in Base collections. The transactor (pkg/transactor) serves
// the per-workspace data plane the `endpoint` here points at.
package account

// Role is the Huly AccountRole. Stored on `members.role` (lowercased) and
// surfaced uppercased in WorkspaceLoginInfo.role.
type Role = string

const (
	RoleOwner      Role = "OWNER"
	RoleMaintainer Role = "MAINTAINER"
	RoleUser       Role = "USER"
	RoleGuest      Role = "GUEST"
)

// rpcRequest is the JSON-RPC envelope: {"method": "...", "params": {...}}.
// params is decoded per-method.
type rpcRequest struct {
	Method string          `json:"method"`
	Params map[string]any  `json:"params"`
}

// LoginInfo is the base login response (foundations/core/packages/account-client
// types.ts:17). token overrides any prior token on the client.
type LoginInfo struct {
	Account  string `json:"account"`            // AccountUuid
	Name     string `json:"name,omitempty"`
	SocialID string `json:"socialId,omitempty"`
	Token    string `json:"token,omitempty"`
}

// WorkspaceLoginInfo extends LoginInfo (types.ts:58) — returned by
// selectWorkspace/createWorkspace/join. token is the per-workspace JWT;
// endpoint is the transactor ws:// base the client then connects to.
type WorkspaceLoginInfo struct {
	LoginInfo
	Workspace        string `json:"workspace"`               // WorkspaceUuid (token claim)
	WorkspaceDataID  string `json:"workspaceDataId,omitempty"`
	WorkspaceURL     string `json:"workspaceUrl"`            // human slug
	Endpoint         string `json:"endpoint"`               // transactor ws:// base
	Role             Role   `json:"role"`
	AllowGuestSignUp bool   `json:"allowGuestSignUp,omitempty"`
}

// WorkspaceInfo is one entry of getUserWorkspaces (core classes.ts:885, the
// flattened WorkspaceInfoWithStatus the client builds). Only the fields the
// frontend reads are emitted.
type WorkspaceInfo struct {
	UUID          string `json:"uuid"`
	Name          string `json:"name"`
	URL           string `json:"url"`
	DataID        string `json:"dataId,omitempty"`
	Region        string `json:"region"`
	Mode          string `json:"mode"`          // WorkspaceMode — "active" for a live ws
	VersionMajor  int    `json:"versionMajor"`
	VersionMinor  int    `json:"versionMinor"`
	VersionPatch  int    `json:"versionPatch"`
	LastVisit     int64  `json:"lastVisit,omitempty"`
	IsDisabled    bool   `json:"isDisabled"`
	CreatedOn     int64  `json:"createdOn,omitempty"`
}

// ProviderInfo is one entry of GET /providers (types.ts:144). The frontend maps
// name∈{google,github,openid} to an icon; "openid" links to /auth/openid.
type ProviderInfo struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName,omitempty"`
}

// RegionInfo is one entry of getRegionInfo. A single default region keeps the
// workspace picker happy without exposing topology.
type RegionInfo struct {
	Region string `json:"region"`
	Name   string `json:"name"`
}

// Status is the Huly PlatformError payload sent as {"error": Status}. code is
// an i18n key; the frontend rethrows it as a PlatformError.
type Status struct {
	Severity int            `json:"severity"`
	Code     string         `json:"code"`
	Params   map[string]any `json:"params"`
}

// statusUnauthorized / statusBadRequest mirror the platform status codes the
// account service emits for these conditions.
func statusUnauthorized(msg string) Status {
	return Status{Severity: 1, Code: "account:status:Unauthorized", Params: map[string]any{"message": msg}}
}

func statusError(msg string) Status {
	return Status{Severity: 1, Code: "account:status:InternalServerError", Params: map[string]any{"message": msg}}
}

func statusWorkspaceNotFound(url string) Status {
	return Status{Severity: 1, Code: "account:status:WorkspaceNotFound", Params: map[string]any{"workspace": url}}
}
