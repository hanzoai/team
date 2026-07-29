package account

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/plugins/platform"
	"github.com/hanzoai/base/tools/hook"
	"github.com/hanzoai/dbx"
	"github.com/hanzoai/team/pkg/bots"
	"github.com/hanzoai/team/pkg/model"
	"github.com/hanzoai/team/pkg/token"
	"github.com/hanzoai/team/pkg/wsauth"
)

// Mount path. The frontend's ACCOUNTS_URL must point here (e.g.
// https://hanzo.team/v1/account); RPC is POST to the root, with /providers,
// /auth/{provider} and /cookie as REST siblings.
const mount = "/v1/account"

// authCookie is the cookie the frontend's PUT/DELETE /cookie manage and that
// the file/upload endpoints read. RPC itself rides Authorization: Bearer.
const authCookie = "account-token"

type config struct {
	platform     platform.PlatformConfig
	serverSecret string
	frontURL     string // browser destination after IAM (default: request origin)
	transactor   string // ws:// base returned by selectWorkspace
	provider     string // IAM provider name surfaced to the frontend ("openid")
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
	// Canonical IAM OAuth surface is ${IAMEndpoint}/v1/iam/oauth/* (hanzo.id and
	// the embedded provider both mount there; the bare /oauth/authorize root is
	// the SPA, which renders blank). oauthBase() owns the prefix — one way.
	return re.Redirect(http.StatusFound, oauthBase(g.cfg.platform.IAMEndpoint)+"/oauth/authorize?"+q.Encode())
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

	access, err := g.exchangeCode(code, redirect)
	if err != nil {
		g.app.Logger().Error("account: oauth code exchange", "err", err)
		return g.bounce(re, "", q.Get("state"), "exchange_failed")
	}
	// OIDC userinfo, read via the canonical `sub` claim. (Base's
	// ValidateIAMToken reads `id`, which the OIDC userinfo response — HIP-0111
	// /v1/iam/oauth/userinfo — does not carry, so we call it directly.)
	sub, email, name, err := g.userinfo(access)
	if err != nil {
		return g.bounce(re, "", q.Get("state"), "userinfo_failed")
	}
	// AccountUuid = the IAM sub (Casdoor UUID; derive a stable one if not). The
	// admin/membership gate resolves the caller with the SAME derivation
	// (wsauth.AccountID over the JWT's authSub), so a member row and its caller
	// always resolve to the same key.
	account := wsauth.AccountID(sub)
	// Tenant = the IAM org (Casdoor `owner` claim on the access token). It
	// scopes every workspace + data file — full multitenancy. The account token
	// carries it as extra.org so getLoginInfoByToken/selectWorkspace and the
	// transactor all route to the right tenant.
	org := orgFromToken(access)
	if org == "" {
		org = g.cfg.platform.IAMOrg
	}
	if err := g.ensureWorkspace(account, org, name, email); err != nil {
		g.app.Logger().Error("account: ensure workspace", "err", err)
	}
	// Fill a human display name on the member row(s) if missing — the transactor
	// mirror propagates it to the contact:class:Person, so the team directory
	// shows a name rather than the account UUID. Idempotent (only fills empty).
	// Runs synchronously before the detached bot sync so the mirror sees the name.
	g.ensureMemberName(account, firstNonEmpty(name, localPart(email)))
	// Bots-as-members: reconcile this tenant's cloud agents into the user's
	// workspace(s) with the user's OWN org-authoritative IAM token — so each
	// workspace only ever receives ITS org's agents. Uses the VERIFIED token org
	// (orgFromToken, not the home-org login fallback above), self-skipping if the
	// token carries none, so a mis-derived tenant can never mislabel a bot.
	// Detached + panic-guarded: never delays, fails, or crashes login.
	go func(bearer, acct, tokenOrg string) {
		defer func() {
			if r := recover(); r != nil {
				g.app.Logger().Error("account: bot sync panic recovered", "recover", r)
			}
		}()
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		bots.SyncUserWorkspaces(g.app, ctx, bearer, acct, tokenOrg)
	}(access, account, orgFromToken(access))
	tok, err := token.Generate(account, "", map[string]any{"org": org}, g.cfg.serverSecret)
	if err != nil {
		return g.bounce(re, "", q.Get("state"), "token_failed")
	}
	// Retain the IAM access_token (RS256) in an HttpOnly cookie. The cloud
	// gateway will not accept team-go's own HS256 session token, so the
	// same-origin /v1/agents proxy (pkg/agents) forwards THIS as the bearer;
	// cloud mints X-Org-Id from its verified `owner` claim. Page JS never
	// reads it — the cookie is HttpOnly.
	setIAMTokenCookie(re, access)
	return g.bounce(re, tok, q.Get("state"), "")
}

// iamTokenCookie carries the caller's IAM access_token (RS256) to the browser
// so pkg/agents can forward it to the cloud gateway (which rejects the HS256
// session token minted above). HttpOnly — never exposed to page JS.
const iamTokenCookie = "hanzo_iam_token"

// setIAMTokenCookie stores the IAM access_token, expiring the cookie with the
// token itself (from its `exp` claim; falls back to 8h).
func setIAMTokenCookie(re *core.RequestEvent, access string) {
	maxAge := 8 * 3600
	if secs := secondsUntilExp(access); secs > 0 {
		maxAge = secs
	}
	http.SetCookie(re.Response, &http.Cookie{
		Name: iamTokenCookie, Value: access, Path: "/", HttpOnly: true,
		Secure: true, SameSite: http.SameSiteLaxMode, MaxAge: maxAge,
	})
}

// secondsUntilExp reads a JWT's `exp` (seconds since epoch) and returns the
// remaining lifetime in seconds, or 0 if absent/expired/unparseable.
func secondsUntilExp(jwtTok string) int {
	parts := strings.Split(jwtTok, ".")
	if len(parts) < 2 {
		return 0
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		if raw, err = base64.StdEncoding.DecodeString(parts[1]); err != nil {
			return 0
		}
	}
	var claims struct {
		Exp int64 `json:"exp"`
	}
	if json.Unmarshal(raw, &claims) != nil || claims.Exp == 0 {
		return 0
	}
	d := time.Until(time.Unix(claims.Exp, 0))
	if d <= 0 {
		return 0
	}
	return int(d.Seconds())
}

// bounce redirects to the frontend with the minted token (or an error).
func (g *api) bounce(re *core.RequestEvent, tok, navigateURL, errCode string) error {
	front := g.cfg.frontURL
	if front == "" {
		front = originOf(re.Request)
	}
	// The provider ?token return is read by the platform Auth.svelte — the LoginApp
	// 'auth' sub-page (loc.path[1]=='auth'). Bare /login mounts the default page
	// and never consumes the token, so a successful token MUST land on /auth.
	path := "/login:component:LoginApp/auth"
	if tok == "" {
		path = "/login"
	}
	dest, err := url.Parse(front + path)
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
		return g.getSocialIds(re)
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
	account, _, tok, err := g.account(re)
	if err != nil {
		return g.fail(re, statusUnauthorized(err.Error()))
	}
	return g.ok(re, LoginInfo{Account: account, Token: tok})
}

func (g *api) getUserWorkspaces(re *core.RequestEvent) error {
	account, _, _, err := g.account(re)
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
	account, org, _, err := g.account(re)
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
	// Carry the tenant into the workspace token so the transactor routes to
	// orgs/<org>/ws/<workspace>.db.
	wsTok, err := token.Generate(account, wsUUID, map[string]any{"org": org}, g.cfg.serverSecret)
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
	account, _, _, err := g.account(re)
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
	account, _, _, err := g.account(re)
	if err != nil {
		return g.fail(re, statusUnauthorized(err.Error()))
	}
	return g.ok(re, map[string]any{"uuid": account})
}

// getSocialIds returns the account's social identities. The workbench connect
// flow (connect.ts:460) calls this and runs pickPrimarySocialId, which throws
// "No active social ids provided" on an empty list. We return the single HANZO
// identity for the account (the IAM sub) — verified, not deleted, deterministic
// _id — which becomes the session's primary social id.
func (g *api) getSocialIds(re *core.RequestEvent) error {
	account, _, _, err := g.account(re)
	if err != nil {
		return g.fail(re, statusUnauthorized(err.Error()))
	}
	key := "hanzo:" + account
	return g.ok(re, []SocialID{{
		ID:         key,
		Type:       "hanzo",
		Value:      account,
		Key:        key,
		VerifiedOn: time.Now().UnixMilli(),
	}})
}

// ── helpers ───────────────────────────────────────────────────────────────

// account decodes the request's HS256 bearer/cookie token (minted by this
// service) into the AccountUuid. The frontend sends OUR token, not an IAM JWT,
// so this does not go through Base's IAM middleware (re.Auth).
func (g *api) account(re *core.RequestEvent) (account, org, tok string, err error) {
	tok = bearer(re.Request)
	if tok == "" {
		if c, e := re.Request.Cookie(authCookie); e == nil {
			tok = c.Value
		}
	}
	if tok == "" {
		return "", "", "", fmt.Errorf("no token")
	}
	t, err := token.Decode(tok, g.cfg.serverSecret, true)
	if err != nil {
		return "", "", "", err
	}
	if t.Account == "" {
		return "", "", "", fmt.Errorf("token has no account")
	}
	org, _ = t.Extra["org"].(string)
	return t.Account, org, tok, nil
}

// orgFromToken reads the IAM access-token's `owner` claim (the Casdoor org =
// the tenant) without verifying — the token came from a trusted code exchange,
// so we only decode the JSON payload to learn which org the user belongs to.
func orgFromToken(jwtTok string) string {
	parts := strings.Split(jwtTok, ".")
	if len(parts) < 2 {
		return ""
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		if raw, err = base64.StdEncoding.DecodeString(parts[1]); err != nil {
			return ""
		}
	}
	var claims struct {
		Owner string `json:"owner"`
	}
	if json.Unmarshal(raw, &claims) != nil {
		return ""
	}
	return claims.Owner
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

// ensureMemberName fills display_name on the account's member rows when empty.
// Saving the row fires the transactor mirror's members-update hook, which
// refreshes the Person name without touching any SPA-owned profile field.
func (g *api) ensureMemberName(account, name string) {
	if name == "" {
		return
	}
	members, err := g.app.FindRecordsByFilter("members", "user_id = {:u}", "", 200, 0, dbx.Params{"u": account})
	if err != nil {
		return
	}
	for _, m := range members {
		if m.GetString("display_name") == "" {
			m.Set("display_name", name)
			_ = g.app.Save(m)
		}
	}
}

func (g *api) membership(account, workspaceID string) Role {
	m, err := g.app.FindFirstRecordByFilter("members",
		"user_id = {:u} && workspace_id = {:w}", dbx.Params{"u": account, "w": workspaceID})
	if err != nil || m == nil {
		return ""
	}
	return m.GetString("role")
}

// oauthBase returns the canonical IAM OAuth base URL: ${IAMEndpoint}/v1/iam.
// Hanzo IAM (hanzo.id) and the embedded provider both mount their OIDC surface
// (authorize/token/userinfo) under /v1/iam — never at the root. Building those
// URLs without the prefix lands on the SPA/static handler (HTTP 200 text/html),
// which is the root cause of exchange_failed. One place owns the prefix.
//
// Inlined here (rather than base's PlatformConfig.OAuthBase) for the same reason
// pkg/iam/proxy.go is inlined: team-go pins base v0.39.10, which predates the
// helper. Deletable the day team-go moves to base v1.x.
func oauthBase(endpoint string) string {
	endpoint = strings.TrimRight(endpoint, "/")
	if endpoint == "" {
		endpoint = "https://hanzo.id"
	}
	return endpoint + "/v1/iam"
}

// exchangeCode exchanges an authorization code for an access token at the
// canonical IAM token endpoint (${IAMEndpoint}/v1/iam/oauth/token). team-go is
// a confidential client (client_secret), so no PKCE — the code is exchanged
// server-side here. Replaces base v0.39.10's platform.ExchangeOAuth2Token,
// which POSTs to the bare /oauth/token (the SPA) → exchange_failed.
func (g *api) exchangeCode(code, redirectURI string) (string, error) {
	data := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {redirectURI},
		"client_id":     {g.cfg.platform.IAMClientID},
		"client_secret": {g.cfg.platform.IAMClientSecret},
	}
	resp, err := http.PostForm(oauthBase(g.cfg.platform.IAMEndpoint)+"/oauth/token", data)
	if err != nil {
		return "", fmt.Errorf("token exchange request: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return "", fmt.Errorf("token exchange status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	var out struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
		ErrorDesc   string `json:"error_description"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", fmt.Errorf("token exchange decode: %w", err)
	}
	if out.Error != "" {
		return "", fmt.Errorf("token exchange: %s: %s", out.Error, out.ErrorDesc)
	}
	if out.AccessToken == "" {
		return "", fmt.Errorf("token exchange: empty access_token")
	}
	return out.AccessToken, nil
}

// userinfo fetches the OIDC userinfo for an access token and returns the
// canonical sub/email/name claims.
func (g *api) userinfo(access string) (sub, email, name string, err error) {
	req, err := http.NewRequest("GET", oauthBase(g.cfg.platform.IAMEndpoint)+"/oauth/userinfo", nil)
	if err != nil {
		return "", "", "", err
	}
	req.Header.Set("Authorization", "Bearer "+access)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", "", "", fmt.Errorf("userinfo: status %d", resp.StatusCode)
	}
	var u struct {
		Sub   string `json:"sub"`
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&u); err != nil {
		return "", "", "", err
	}
	if u.Sub == "" {
		return "", "", "", fmt.Errorf("userinfo: missing sub")
	}
	return u.Sub, u.Email, u.Name, nil
}

// ensureWorkspace gives a freshly-logged-in account a personal workspace if it
// has none, so the workspace picker is never empty. org is the IAM tenant and is
// persisted as owner_org — the canonical tenant field every downstream surface
// (chat scoping, bot sync, Slack KMS token path) reads. `owner` keeps the
// creating account UUID for provenance only, never as a tenant.
func (g *api) ensureWorkspace(account, org, displayName, email string) error {
	if existing := g.workspacesOf(account); len(existing) > 0 {
		return nil
	}
	wsColl, err := g.app.FindCollectionByNameOrId("workspaces")
	if err != nil {
		return err
	}
	name := firstNonEmpty(displayName, localPart(email), "Workspace")
	ws := core.NewRecord(wsColl)
	ws.Set("slug", slugify(name)+"-"+shortID())
	ws.Set("name", name)
	ws.Set("owner", account)
	ws.Set("owner_org", org)
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
	// display_name feeds the mirrored contact:class:Person name — set it so the
	// team directory shows a human name, not the account UUID.
	m.Set("display_name", name)
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

// toWorkspaceInfo flattens a workspace record for getUserWorkspaces. The
// version triple is the MODEL version (model.Version) — the SAME source
// the transactor reports as serverVersion — so the workspace-model version and
// the server version can never drift.
func toWorkspaceInfo(ws *core.Record) WorkspaceInfo {
	return WorkspaceInfo{
		UUID: ws.GetString("uuid"), Name: ws.GetString("name"), URL: ws.GetString("slug"),
		DataID: ws.GetString("data_id"), Region: ws.GetString("region"),
		Mode:         "active",
		VersionMajor: model.Major(), VersionMinor: model.Minor(), VersionPatch: model.Patch(),
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
