package account

import (
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/plugins/platform"
	"github.com/hanzoai/base/tools/hook"
	"github.com/hanzoai/dbx"
	"github.com/hanzoai/team-go/pkg/token"
)

// Mount path. The frontend's ACCOUNTS_URL must point here (e.g.
// https://hanzo.team/v1/account); RPC is POST to the root, with /providers,
// /auth/{provider} and /cookie as REST siblings.
const mount = "/v1/account"

// authCookie is the cookie the frontend's PUT/DELETE /cookie manage and that
// the file/upload endpoints read. RPC itself rides Authorization: Bearer.
const authCookie = "account-token"

type config struct {
	platform      platform.PlatformConfig
	serverSecret  string
	frontURL      string // browser destination after IAM (default: request origin)
	transactor    string // ws:// base returned by selectWorkspace
	provider      string // IAM provider name surfaced to the frontend ("openid")
}

func load() config {
	return config{
		platform: platform.PlatformConfig{
			IAMEndpoint:     env("IAM_ENDPOINT", "https://hanzo.id"),
			IAMClientID:     os.Getenv("IAM_CLIENT_ID"),
			IAMClientSecret: os.Getenv("IAM_CLIENT_SECRET"),
			IAMOrg:          env("IAM_ORG", "hanzo"),
			IAMApp:          env("IAM_APP", "hanzo-team"),
		},
		serverSecret: env("SERVER_SECRET", token.DefaultSecret),
		frontURL:     strings.TrimRight(os.Getenv("FRONT_URL"), "/"),
		transactor:   strings.TrimRight(os.Getenv("TRANSACTOR_URL"), "/"),
		provider:     "openid",
	}
}

// Register binds the account API on app.
func Register(app core.App) {
	cfg := load()
	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			g := &api{app: app, cfg: cfg}
			e.Router.POST(mount, g.rpc)
			e.Router.GET(mount+"/providers", g.providers)
			e.Router.GET(mount+"/auth/{provider}", g.authStart)
			e.Router.GET(mount+"/auth/{provider}/callback", g.authCallback)
			e.Router.PUT(mount+"/cookie", g.setCookie)
			e.Router.DELETE(mount+"/cookie", g.clearCookie)
			return e.Next()
		},
	})
}

type api struct {
	app core.App
	cfg config
}

// ── REST: providers ──────────────────────────────────────────────────────

func (g *api) providers(re *core.RequestEvent) error {
	// Only IAM. The full method set (email/SMS/Google/GitHub/Web3) is presented
	// by IAM itself once the browser reaches /auth/openid.
	return re.JSON(http.StatusOK, []ProviderInfo{{Name: g.cfg.provider, DisplayName: "Hanzo"}})
}

// ── REST: IAM OAuth bridge ────────────────────────────────────────────────

// authStart redirects the browser into IAM's authorize endpoint. team-go is a
// confidential client (client_secret), so no PKCE — the code is exchanged
// server-side in authCallback.
func (g *api) authStart(re *core.RequestEvent) error {
	origin := originOf(re.Request)
	redirect := origin + mount + "/auth/" + g.cfg.provider + "/callback"
	// state round-trips the frontend's post-login destination.
	state := re.Request.URL.Query().Get("navigateUrl")
	q := url.Values{
		"client_id":     {g.cfg.platform.IAMClientID},
		"redirect_uri":  {redirect},
		"response_type": {"code"},
		"scope":         {"openid profile email"},
		"state":         {state},
	}
	return re.Redirect(http.StatusFound, g.cfg.platform.IAMEndpoint+"/oauth/authorize?"+q.Encode())
}

// authCallback exchanges the IAM code for the user, ensures the account has a
// workspace, mints the account token, and bounces the browser back to the
// frontend with ?token= (which Auth.svelte reads via getLoginInfoFromQuery).
func (g *api) authCallback(re *core.RequestEvent) error {
	q := re.Request.URL.Query()
	if e := q.Get("error"); e != "" {
		return g.bounce(re, "", q.Get("state"), e)
	}
	code := q.Get("code")
	if code == "" {
		return g.bounce(re, "", q.Get("state"), "missing_code")
	}
	origin := originOf(re.Request)
	redirect := origin + mount + "/auth/" + g.cfg.provider + "/callback"

	access, _, err := platform.ExchangeOAuth2Token(code, redirect, g.cfg.platform)
	if err != nil {
		return g.bounce(re, "", q.Get("state"), "exchange_failed")
	}
	user, err := platform.ValidateIAMToken(access, g.cfg.platform)
	if err != nil {
		return g.bounce(re, "", q.Get("state"), "userinfo_failed")
	}
	// AccountUuid = the IAM user id (Casdoor sub, a UUID).
	account := user.ID
	if uuid.Validate(account) != nil {
		// Defensive: derive a stable UUID if IAM ever issues a non-UUID sub.
		account = uuid.NewSHA1(uuid.NameSpaceURL, []byte("iam:"+user.ID)).String()
	}
	if err := g.ensureWorkspace(account, user); err != nil {
		g.app.Logger().Error("account: ensure workspace", "err", err)
	}
	tok, err := token.Generate(account, "", nil, g.cfg.serverSecret)
	if err != nil {
		return g.bounce(re, "", q.Get("state"), "token_failed")
	}
	return g.bounce(re, tok, q.Get("state"), "")
}

// bounce redirects to the frontend with the minted token (or an error).
func (g *api) bounce(re *core.RequestEvent, tok, navigateURL, errCode string) error {
	front := g.cfg.frontURL
	if front == "" {
		front = originOf(re.Request)
	}
	dest, err := url.Parse(front + "/login")
	if err != nil {
		return re.String(http.StatusInternalServerError, "bad front url")
	}
	q := dest.Query()
	if tok != "" {
		q.Set("token", tok)
	}
	if errCode != "" {
		q.Set("error", errCode)
	}
	if navigateURL != "" {
		q.Set("navigateUrl", navigateURL)
	}
	dest.RawQuery = q.Encode()
	return re.Redirect(http.StatusFound, dest.String())
}

// ── REST: cookie ─────────────────────────────────────────────────────────

func (g *api) setCookie(re *core.RequestEvent) error {
	var body struct {
		Token string `json:"token"`
	}
	_ = re.BindBody(&body)
	if body.Token == "" {
		body.Token = bearer(re.Request)
	}
	http.SetCookie(re.Response, &http.Cookie{
		Name: authCookie, Value: body.Token, Path: "/", HttpOnly: true,
		Secure: true, SameSite: http.SameSiteLaxMode, MaxAge: 30 * 24 * 3600,
	})
	return re.JSON(http.StatusOK, map[string]any{"result": true})
}

func (g *api) clearCookie(re *core.RequestEvent) error {
	http.SetCookie(re.Response, &http.Cookie{
		Name: authCookie, Value: "", Path: "/", HttpOnly: true,
		Secure: true, SameSite: http.SameSiteLaxMode, MaxAge: -1,
	})
	return re.JSON(http.StatusOK, map[string]any{"result": true})
}

// ── JSON-RPC ──────────────────────────────────────────────────────────────

func (g *api) rpc(re *core.RequestEvent) error {
	var req rpcRequest
	if err := re.BindBody(&req); err != nil {
		return g.fail(re, statusError("bad request"))
	}
	switch req.Method {
	case "getLoginInfoByToken", "getLoginWithWorkspaceInfo":
		return g.getLoginInfoByToken(re)
	case "getUserWorkspaces":
		return g.getUserWorkspaces(re)
	case "selectWorkspace":
		return g.selectWorkspace(re, req.Params)
	case "getWorkspaceInfo":
		return g.getWorkspaceInfo(re, req.Params)
	case "getRegionInfo":
		return g.ok(re, []RegionInfo{{Region: "", Name: "Default"}})
	case "getSocialIds":
		return g.ok(re, []any{})
	case "getPerson":
		return g.getPerson(re)
	case "isReadOnlyGuest":
		return g.ok(re, false)
	case "loginAsGuest":
		return g.fail(re, statusUnauthorized("guest login disabled"))
	default:
		return g.fail(re, Status{Severity: 1, Code: "account:status:UnknownMethod", Params: map[string]any{"method": req.Method}})
	}
}

func (g *api) getLoginInfoByToken(re *core.RequestEvent) error {
	account, tok, err := g.account(re)
	if err != nil {
		return g.fail(re, statusUnauthorized(err.Error()))
	}
	return g.ok(re, LoginInfo{Account: account, Token: tok})
}

func (g *api) getUserWorkspaces(re *core.RequestEvent) error {
	account, _, err := g.account(re)
	if err != nil {
		return g.fail(re, statusUnauthorized(err.Error()))
	}
	out := []WorkspaceInfo{}
	for _, ws := range g.workspacesOf(account) {
		out = append(out, toWorkspaceInfo(ws))
	}
	return g.ok(re, out)
}

func (g *api) selectWorkspace(re *core.RequestEvent, params map[string]any) error {
	account, _, err := g.account(re)
	if err != nil {
		return g.fail(re, statusUnauthorized(err.Error()))
	}
	wsURL, _ := params["workspaceUrl"].(string)
	ws, err := g.app.FindFirstRecordByFilter("workspaces", "slug = {:s}", dbx.Params{"s": wsURL})
	if err != nil || ws == nil {
		return g.fail(re, statusWorkspaceNotFound(wsURL))
	}
	role := g.membership(account, ws.Id)
	if role == "" {
		return g.fail(re, statusUnauthorized("not a member of "+wsURL))
	}
	wsUUID := ws.GetString("uuid")
	wsTok, err := token.Generate(account, wsUUID, nil, g.cfg.serverSecret)
	if err != nil {
		return g.fail(re, statusError("mint workspace token: "+err.Error()))
	}
	return g.ok(re, WorkspaceLoginInfo{
		LoginInfo:       LoginInfo{Account: account, Token: wsTok},
		Workspace:       wsUUID,
		WorkspaceURL:    ws.GetString("slug"),
		WorkspaceDataID: ws.GetString("data_id"),
		Endpoint:        g.endpoint(re),
		Role:            strings.ToUpper(role),
	})
}

func (g *api) getWorkspaceInfo(re *core.RequestEvent, _ map[string]any) error {
	account, _, err := g.account(re)
	if err != nil {
		return g.fail(re, statusUnauthorized(err.Error()))
	}
	ws := g.workspacesOf(account)
	if len(ws) == 0 {
		return g.fail(re, statusWorkspaceNotFound(""))
	}
	return g.ok(re, toWorkspaceInfo(ws[0]))
}

func (g *api) getPerson(re *core.RequestEvent) error {
	account, _, err := g.account(re)
	if err != nil {
		return g.fail(re, statusUnauthorized(err.Error()))
	}
	return g.ok(re, map[string]any{"uuid": account})
}

// ── helpers ───────────────────────────────────────────────────────────────

// account decodes the request's HS256 bearer/cookie token (minted by this
// service) into the AccountUuid. The frontend sends OUR token, not an IAM JWT,
// so this does not go through Base's IAM middleware (re.Auth).
func (g *api) account(re *core.RequestEvent) (account, tok string, err error) {
	tok = bearer(re.Request)
	if tok == "" {
		if c, e := re.Request.Cookie(authCookie); e == nil {
			tok = c.Value
		}
	}
	if tok == "" {
		return "", "", fmt.Errorf("no token")
	}
	t, err := token.Decode(tok, g.cfg.serverSecret, true)
	if err != nil {
		return "", "", err
	}
	if t.Account == "" {
		return "", "", fmt.Errorf("token has no account")
	}
	return t.Account, tok, nil
}

func (g *api) workspacesOf(account string) []*core.Record {
	members, err := g.app.FindRecordsByFilter("members", "user_id = {:u}", "-joined_at", 200, 0, dbx.Params{"u": account})
	if err != nil {
		return nil
	}
	out := []*core.Record{}
	for _, m := range members {
		ws, err := g.app.FindFirstRecordByFilter("workspaces", "id = {:id}", dbx.Params{"id": m.GetString("workspace_id")})
		if err == nil && ws != nil {
			out = append(out, ws)
		}
	}
	return out
}

func (g *api) membership(account, workspaceID string) Role {
	m, err := g.app.FindFirstRecordByFilter("members",
		"user_id = {:u} && workspace_id = {:w}", dbx.Params{"u": account, "w": workspaceID})
	if err != nil || m == nil {
		return ""
	}
	return m.GetString("role")
}

// ensureWorkspace gives a freshly-logged-in account a personal workspace if it
// has none, so the workspace picker is never empty.
func (g *api) ensureWorkspace(account string, user *platform.IAMUser) error {
	if existing := g.workspacesOf(account); len(existing) > 0 {
		return nil
	}
	wsColl, err := g.app.FindCollectionByNameOrId("workspaces")
	if err != nil {
		return err
	}
	name := firstNonEmpty(user.Name, localPart(user.Email), "Workspace")
	ws := core.NewRecord(wsColl)
	ws.Set("slug", slugify(name)+"-"+shortID())
	ws.Set("name", name)
	ws.Set("owner", account)
	ws.Set("uuid", uuid.NewString())
	if err := g.app.Save(ws); err != nil {
		return err
	}
	mColl, err := g.app.FindCollectionByNameOrId("members")
	if err != nil {
		return err
	}
	m := core.NewRecord(mColl)
	m.Set("workspace_id", ws.Id)
	m.Set("user_id", account)
	m.Set("role", "owner")
	return g.app.Save(m)
}

// endpoint is the transactor ws:// base selectWorkspace hands back. Defaults to
// wss://<host>/transactor (pkg/transactor serves there) unless TRANSACTOR_URL
// overrides it.
func (g *api) endpoint(re *core.RequestEvent) string {
	if g.cfg.transactor != "" {
		return g.cfg.transactor
	}
	return "wss://" + re.Request.Host + "/transactor"
}

func (g *api) ok(re *core.RequestEvent, value any) error {
	return re.JSON(http.StatusOK, map[string]any{"result": value})
}

func (g *api) fail(re *core.RequestEvent, s Status) error {
	return re.JSON(http.StatusOK, map[string]any{"error": s})
}

func toWorkspaceInfo(ws *core.Record) WorkspaceInfo {
	return WorkspaceInfo{
		UUID: ws.GetString("uuid"), Name: ws.GetString("name"), URL: ws.GetString("slug"),
		DataID: ws.GetString("data_id"), Region: ws.GetString("region"),
		Mode: "active", VersionMajor: 0, VersionMinor: 7, VersionPatch: 0,
	}
}

func bearer(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if len(h) > 7 && strings.EqualFold(h[:7], "Bearer ") {
		return h[7:]
	}
	return ""
}

func originOf(r *http.Request) string {
	scheme := "https"
	if r.TLS == nil && r.Header.Get("X-Forwarded-Proto") == "" && strings.HasPrefix(r.Host, "localhost") {
		scheme = "http"
	}
	return scheme + "://" + r.Host
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func localPart(email string) string {
	if i := strings.Index(email, "@"); i > 0 {
		return email[:i]
	}
	return email
}

func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	var b strings.Builder
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == ' ' || r == '-' || r == '_':
			b.WriteByte('-')
		}
	}
	out := strings.Trim(b.String(), "-")
	if out == "" {
		out = "ws"
	}
	return out
}

func shortID() string {
	return strings.Split(uuid.NewString(), "-")[0]
}
