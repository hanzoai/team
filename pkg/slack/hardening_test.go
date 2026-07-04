package slack

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/team-go/pkg/token"
)

// ── M1: first-org-wins (confused-deputy defense) ────────────────────────────

func TestUpsertInstall_FirstOrgWins(t *testing.T) {
	app, wsRec, _, _ := boot(t)
	addAgentCollections(t, app, wsRec)
	c := &controller{app: app, cfg: config{}}

	if err := c.upsertInstall("T1", wsRec.Id, "orgA"); err != nil {
		t.Fatalf("first install: %v", err)
	}
	// A DIFFERENT org cannot capture the team.
	if err := c.upsertInstall("T1", wsRec.Id, "orgB"); err != errInstallConflict {
		t.Fatalf("second org must be refused with errInstallConflict, got %v", err)
	}
	org, _, ok := c.installOrg("T1")
	if !ok || org != "orgA" {
		t.Fatalf("install must remain orgA, got %q ok=%v", org, ok)
	}
	// Same org re-connecting is fine (idempotent).
	if err := c.upsertInstall("T1", wsRec.Id, "orgA"); err != nil {
		t.Fatalf("same-org re-upsert: %v", err)
	}
	if n, _ := app.CountRecords("slack_installs"); n != 1 {
		t.Fatalf("exactly one install row expected, got %d", n)
	}
}

// The oauth() handler refuses a cross-org connect and stores NO token for the
// attacking org.
func TestOAuth_FirstOrgWins(t *testing.T) {
	app, wsRec, _, _ := boot(t)
	addAgentCollections(t, app, wsRec)

	// Slack oauth.v2.access always returns a bot grant for team T1.
	oldAPI := slackAPI
	slackSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok": true, "access_token": "xoxb-x", "bot_user_id": "B1",
			"team": map[string]string{"id": "T1", "name": "Acme"},
		})
	}))
	slackAPI = slackSrv.URL
	t.Cleanup(func() { slackAPI = oldAPI; slackSrv.Close() })

	var putOrgs []string
	kms := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			putOrgs = append(putOrgs, r.URL.Path)
			w.WriteHeader(http.StatusCreated)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer kms.Close()

	c := &controller{
		app: app,
		cfg: config{secret: "strong-secret", slackClientID: "cid", slackSecret: "csec",
			slackSigning: "sig", slackRedirect: "https://api.hanzo.ai/v1/slack/oauth"},
		tokens:     newTokenStore(kms.URL, "hk"),
		usedStates: newSeenSet(time.Minute),
	}

	drv := func(org, code string) *httptest.ResponseRecorder {
		state, _ := signOAuthState("strong-secret", org, 0)
		req := httptest.NewRequest("GET", "/v1/slack/oauth?code="+code+"&state="+url.QueryEscape(state), nil)
		return drive(app, req, nil, c.oauth)
	}

	// orgA connects first — succeeds.
	if rec := drv("orgA", "c1"); rec.Code != http.StatusOK {
		t.Fatalf("orgA connect should succeed, got %d %s", rec.Code, rec.Body.String())
	}
	if org, _, _ := c.installOrg("T1"); org != "orgA" {
		t.Fatalf("install must be orgA, got %q", org)
	}
	// orgB tries to capture the same team — refused, no token stored.
	if rec := drv("orgB", "c2"); rec.Code != http.StatusForbidden {
		t.Fatalf("orgB cross-org connect must be 403, got %d %s", rec.Code, rec.Body.String())
	}
	if org, _, _ := c.installOrg("T1"); org != "orgA" {
		t.Fatalf("install must STILL be orgA after orgB attempt, got %q", org)
	}
	for _, p := range putOrgs {
		if strings.Contains(p, "/orgs/orgB/") {
			t.Fatalf("orgB token must NOT be stored, but KMS saw PUT %s", p)
		}
	}
}

// ── M2: durable agent-event dedupe ──────────────────────────────────────────

func TestMarkProcessed_Idempotent(t *testing.T) {
	app, wsRec, _, _ := boot(t)
	addAgentCollections(t, app, wsRec)
	c := &controller{app: app, cfg: config{}}

	if fresh, err := c.markProcessed("ev1"); err != nil || !fresh {
		t.Fatalf("first sighting must be fresh: fresh=%v err=%v", fresh, err)
	}
	if fresh, err := c.markProcessed("ev1"); err != nil || fresh {
		t.Fatalf("second sighting must be a duplicate: fresh=%v err=%v", fresh, err)
	}
	if fresh, _ := c.markProcessed("ev2"); !fresh {
		t.Fatal("a different key must be fresh")
	}
	// Empty key is non-dedupable (never blocks).
	if fresh, _ := c.markProcessed(""); !fresh {
		t.Fatal("empty key must be fresh (non-dedupable)")
	}
}

// ── C1: account-link binding hijack defense ─────────────────────────────────

// linkController wires a controller whose IAM (token+userinfo) and KMS
// (put) are httptest stubs, with a strong secret and full link config.
func linkController(t *testing.T, app core.App) *controller {
	t.Helper()
	iam := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/iam/oauth/token":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"access_token": "at-hanzo", "refresh_token": "r1", "token_type": "Bearer", "expires_in": 3600,
			})
		case "/v1/iam/oauth/userinfo":
			_ = json.NewEncoder(w).Encode(map[string]any{"sub": "H-user", "owner": "userorg"})
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	kms := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}))
	t.Cleanup(iam.Close)
	t.Cleanup(kms.Close)
	return &controller{
		app: app,
		cfg: config{
			secret: "strong-secret", slackClientID: "cid", slackSecret: "csec",
			linkSlackRedirect: "https://api.hanzo.ai/v1/slack/link/slack",
			iamEndpoint:       iam.URL, iamClientID: "iid", iamClientSecret: "isec",
			linkRedirect: "https://api.hanzo.ai/v1/slack/link/callback",
		},
		oidc:       newOIDCClient(iam.URL, "iid", "isec", "https://api.hanzo.ai/v1/slack/link/callback"),
		userTokens: newUserTokenStore(kms.URL, "hk"),
		usedStates: newSeenSet(time.Minute),
	}
}

// runLinkLeg1 drives leg 1 (link) and returns the init cookie value + the
// slack-signin state minted for the Slack authorize redirect (the leg1->leg2
// browser-continuity pair, F1).
func runLinkLeg1(t *testing.T, c *controller, app core.App) (initCookie, ss string) {
	t.Helper()
	entry, _ := signLinkState("strong-secret", "T1", "U1", 0)
	req := httptest.NewRequest("GET", "/v1/slack/link?state="+url.QueryEscape(entry), nil)
	rec := drive(app, req, nil, c.link)
	if rec.Code != http.StatusFound {
		t.Fatalf("leg1 link should redirect (302), got %d %s", rec.Code, rec.Body.String())
	}
	for _, ck := range rec.Result().Cookies() {
		if ck.Name == linkInitCookieName {
			initCookie = ck.Value
		}
	}
	if initCookie == "" {
		t.Fatal("leg1 must set the init cookie")
	}
	u, err := url.Parse(rec.Result().Header.Get("Location"))
	if err != nil {
		t.Fatalf("leg1 bad Location: %v", err)
	}
	if ss = u.Query().Get("state"); ss == "" {
		t.Fatal("leg1 must carry a slack-signin state")
	}
	return initCookie, ss
}

// Leg 1 binds the init cookie into the slack-signin state's subject (F1).
func TestLink_InitCookieBoundToState(t *testing.T) {
	app, wsRec, _, _ := boot(t)
	addAgentCollections(t, app, wsRec)
	c := linkController(t, app)
	initCookie, ss := runLinkLeg1(t, c, app)
	st, ok := verifySubjectState("strong-secret", ss, 0)
	if !ok || st.Subject != initCookie {
		t.Fatalf("slack-signin state subject must equal the init cookie, subject=%q init=%q ok=%v", st.Subject, initCookie, ok)
	}
}

// Leg 2 derives the cookie identity from the Slack-VERIFIED authed_user.id, and
// only when the init cookie from leg 1 matches the state (browser continuity).
func TestLinkSlack_CookieFromSlackVerifiedID(t *testing.T) {
	app, wsRec, _, _ := boot(t)
	addAgentCollections(t, app, wsRec)

	oldAPI := slackAPI
	slackSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok": true, "authed_user": map[string]string{"id": "Uverified"},
			"team": map[string]string{"id": "T1"},
		})
	}))
	slackAPI = slackSrv.URL
	t.Cleanup(func() { slackAPI = oldAPI; slackSrv.Close() })

	c := linkController(t, app)
	if err := c.upsertInstall("T1", wsRec.Id, "hanzo"); err != nil {
		t.Fatalf("install: %v", err)
	}

	initCookie, ss := runLinkLeg1(t, c, app)
	req := httptest.NewRequest("GET", "/v1/slack/link/slack?code=abc&state="+url.QueryEscape(ss), nil)
	req.AddCookie(&http.Cookie{Name: linkInitCookieName, Value: initCookie})
	rec := drive(app, req, nil, c.linkSlack)
	if rec.Code != http.StatusFound {
		t.Fatalf("leg2 should redirect (302), got %d %s", rec.Code, rec.Body.String())
	}
	var cookie string
	for _, ck := range rec.Result().Cookies() {
		if ck.Name == linkCookieName {
			cookie = ck.Value
		}
	}
	if cookie == "" {
		t.Fatal("leg2 must set the browser-bound link cookie")
	}
	team, user, _, ok := verifyLinkState("strong-secret", cookie, 0)
	if !ok || team != "T1" || user != "Uverified" {
		t.Fatalf("cookie must carry the Slack-VERIFIED (team,user), got team=%q user=%q ok=%v", team, user, ok)
	}
	loc := rec.Result().Header.Get("Location")
	if !strings.Contains(loc, "state="+url.QueryEscape(cookie)) {
		t.Fatalf("authorize state must equal the cookie, Location=%s", loc)
	}
}

// F1 transplant: an attacker captures their own valid leg-2 URL and sends it to a
// victim. The victim's browser has no matching init cookie, so leg 2 is refused
// BEFORE the Slack code is exchanged — no attacker Slack identity is planted in
// the victim's browser (no attacker_slack ↔ victim_hanzo binding is possible).
func TestLinkSlack_TransplantRejected(t *testing.T) {
	app, wsRec, _, _ := boot(t)
	addAgentCollections(t, app, wsRec)

	exchanged := false
	oldAPI := slackAPI
	slackSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		exchanged = true // must NOT fire on a transplant
		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok": true, "authed_user": map[string]string{"id": "Uattacker"},
			"team": map[string]string{"id": "T1"},
		})
	}))
	slackAPI = slackSrv.URL
	t.Cleanup(func() { slackAPI = oldAPI; slackSrv.Close() })

	c := linkController(t, app)
	_ = c.upsertInstall("T1", wsRec.Id, "hanzo")

	// Attacker runs leg 1 in THEIR browser and captures the leg-2 (code,state).
	_, ssAttacker := runLinkLeg1(t, c, app)

	// (a) Victim clicks it with NO init cookie → refused, code never exchanged.
	req := httptest.NewRequest("GET", "/v1/slack/link/slack?code=attacker_code&state="+url.QueryEscape(ssAttacker), nil)
	rec := drive(app, req, nil, c.linkSlack)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("transplant (no init cookie) must be refused (400), got %d %s", rec.Code, rec.Body.String())
	}
	if exchanged {
		t.Fatal("the attacker's Slack code must NOT be exchanged on a transplant")
	}
	for _, ck := range rec.Result().Cookies() {
		if ck.Name == linkCookieName && ck.Value != "" {
			t.Fatal("no link cookie may be planted in the victim's browser on a transplant")
		}
	}

	// (b) Victim has their OWN init cookie (own leg 1) but clicks the attacker's
	// state → nonce mismatch → still refused.
	initVictim, _ := runLinkLeg1(t, c, app)
	req2 := httptest.NewRequest("GET", "/v1/slack/link/slack?code=attacker_code&state="+url.QueryEscape(ssAttacker), nil)
	req2.AddCookie(&http.Cookie{Name: linkInitCookieName, Value: initVictim})
	rec2 := drive(app, req2, nil, c.linkSlack)
	if rec2.Code != http.StatusBadRequest {
		t.Fatalf("mismatched init cookie must be refused (400), got %d", rec2.Code)
	}
	if exchanged {
		t.Fatal("mismatched init cookie must not exchange the Slack code")
	}
}

// The binding subject is taken from the browser-bound cookie (Slack-verified),
// NOT from any URL param — so a login as a different Hanzo subject binds to the
// COOKIE's slack user, and there is no URL field that can redirect it.
func TestLinkCallback_BindsCookieSubjectNotQuery(t *testing.T) {
	app, wsRec, _, _ := boot(t)
	addAgentCollections(t, app, wsRec)
	c := linkController(t, app)
	if err := c.upsertInstall("T1", wsRec.Id, "hanzo"); err != nil {
		t.Fatalf("install: %v", err)
	}
	cookie, _ := signLinkState("strong-secret", "T1", "Uexpected", 0)

	req := httptest.NewRequest("GET", "/v1/slack/link/callback?code=xyz&state="+url.QueryEscape(cookie), nil)
	req.AddCookie(&http.Cookie{Name: linkCookieName, Value: cookie})
	rec := drive(app, req, nil, c.linkCallback)
	if rec.Code != http.StatusOK {
		t.Fatalf("valid link should complete (200), got %d %s", rec.Code, rec.Body.String())
	}
	link := c.findUserLink("T1", "Uexpected")
	if link == nil || link.GetString("hanzo_subject") != "H-user" {
		t.Fatalf("link must bind the COOKIE's slack user to the OIDC subject, got %+v", link)
	}
	// No link bound to any other slack user.
	if n, _ := app.CountRecords("slack_user_links"); n != 1 {
		t.Fatalf("exactly one link expected, got %d", n)
	}
}

// A forwarded link (no cookie) cannot bind a victim's slack user.
func TestLinkCallback_RequiresCookie(t *testing.T) {
	app, wsRec, _, _ := boot(t)
	addAgentCollections(t, app, wsRec)
	c := linkController(t, app)
	_ = c.upsertInstall("T1", wsRec.Id, "hanzo")
	state, _ := signLinkState("strong-secret", "T1", "Uvictim", 0)

	req := httptest.NewRequest("GET", "/v1/slack/link/callback?code=xyz&state="+url.QueryEscape(state), nil)
	// NB: no cookie set.
	rec := drive(app, req, nil, c.linkCallback)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("no-cookie callback must be refused (400), got %d", rec.Code)
	}
	if n, _ := app.CountRecords("slack_user_links"); n != 0 {
		t.Fatalf("no link may be created without a cookie, got %d", n)
	}
}

// state must equal the cookie: an attacker-supplied state for a different slack
// user cannot redirect the binding.
func TestLinkCallback_StateCookieMismatch(t *testing.T) {
	app, wsRec, _, _ := boot(t)
	addAgentCollections(t, app, wsRec)
	c := linkController(t, app)
	_ = c.upsertInstall("T1", wsRec.Id, "hanzo")
	cookie, _ := signLinkState("strong-secret", "T1", "Uexpected", 0)
	other, _ := signLinkState("strong-secret", "T1", "Uother", 0)

	req := httptest.NewRequest("GET", "/v1/slack/link/callback?code=xyz&state="+url.QueryEscape(other), nil)
	req.AddCookie(&http.Cookie{Name: linkCookieName, Value: cookie})
	rec := drive(app, req, nil, c.linkCallback)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("state!=cookie must be refused (400), got %d", rec.Code)
	}
	if n, _ := app.CountRecords("slack_user_links"); n != 0 {
		t.Fatalf("no link may be created on state/cookie mismatch, got %d", n)
	}
}

// ── org-scoped connect (console Integrations) ───────────────────────────────

func connectController(app core.App) *controller {
	return &controller{
		app: app,
		cfg: config{secret: "strong-secret", slackClientID: "cid", slackSecret: "csec",
			slackSigning: "sig", slackRedirect: "https://api.hanzo.ai/v1/slack/oauth"},
	}
}

// An org JWT (no workspace admin) yields a connect URL whose state binds the
// caller's OWN org and requests the full bot scopes.
func TestConnect_OrgJWT(t *testing.T) {
	app, _, _, _ := boot(t)
	users, _ := app.FindCollectionByNameOrId("users")
	u := core.NewRecord(users)
	u.Set("email", "console@acme.test")
	u.Set("password", "test12345")
	u.Set("org_id", "acme-org") // org tenant claim, but NO workspace membership
	must2(t, app, u)

	c := connectController(app)
	req := httptest.NewRequest("GET", "/v1/slack/connect", nil)
	rec := drive(app, req, u, c.connect)
	if rec.Code != http.StatusOK {
		t.Fatalf("org-JWT connect should return a url (200), got %d %s", rec.Code, rec.Body.String())
	}
	var out struct{ URL string }
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	pu, err := url.Parse(out.URL)
	if err != nil {
		t.Fatalf("bad url: %v", err)
	}
	q := pu.Query()
	if q.Get("scope") != defaultBotScopes {
		t.Fatalf("full bot scopes expected, got %q", q.Get("scope"))
	}
	st, ok := verifyOAuthState("strong-secret", q.Get("state"), 0)
	if !ok || st.Subject != "acme-org" {
		t.Fatalf("state must bind the caller's org, got subject=%q ok=%v", st.Subject, ok)
	}
}

// The workspace-admin path still resolves to the workspace's tenant org.
func TestConnect_WorkspaceAdmin(t *testing.T) {
	app, _, _, admin := boot(t) // admin.org_id == ws.owner_org == "hanzo"
	c := connectController(app)
	req := httptest.NewRequest("GET", "/v1/slack/connect?workspace=acme", nil)
	rec := drive(app, req, admin, c.connect)
	if rec.Code != http.StatusOK {
		t.Fatalf("workspace-admin connect should return a url, got %d %s", rec.Code, rec.Body.String())
	}
	var out struct{ URL string }
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	pu, _ := url.Parse(out.URL)
	st, ok := verifyOAuthState("strong-secret", pu.Query().Get("state"), 0)
	if !ok || st.Subject != "hanzo" {
		t.Fatalf("state must bind the workspace's org 'hanzo', got %q ok=%v", st.Subject, ok)
	}
}

// ── L1: fail-closed on a weak SERVER_SECRET ─────────────────────────────────

func TestConnect_WeakSecretRefused(t *testing.T) {
	app, _, _, admin := boot(t)
	c := &controller{app: app, cfg: config{secret: token.DefaultSecret,
		slackClientID: "cid", slackSecret: "csec", slackSigning: "sig",
		slackRedirect: "https://api.hanzo.ai/v1/slack/oauth"}}
	req := httptest.NewRequest("GET", "/v1/slack/connect?workspace=acme", nil)
	rec := drive(app, req, admin, c.connect)
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("a default SERVER_SECRET must fail closed (503), got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "server secret") {
		t.Fatalf("expected server-secret error, got %s", rec.Body.String())
	}
}

// ── INFO: response_url host allowlist ───────────────────────────────────────

func TestPostResponseURL_HostAllowlist(t *testing.T) {
	if err := postResponseURL(context.Background(), "https://evil.example.com/x", "in_channel", "hi"); err == nil {
		t.Fatal("a non-slack response_url host must be rejected (SSRF/exfil guard)")
	}
	if err := postResponseURL(context.Background(), "http://hooks.slack.com/x", "in_channel", "hi"); err == nil {
		t.Fatal("a non-https response_url must be rejected")
	}
}

// ── F3: durable dedupe table is pruned by age ───────────────────────────────

func TestPruneProcessedEvents(t *testing.T) {
	app, wsRec, _, _ := boot(t)
	addAgentCollections(t, app, wsRec)
	c := &controller{app: app, cfg: config{}}
	if _, err := c.markProcessed("recent"); err != nil {
		t.Fatalf("mark recent: %v", err)
	}
	if _, err := c.markProcessed("stale"); err != nil {
		t.Fatalf("mark stale: %v", err)
	}
	// Backdate 'stale' beyond the TTL (Base autodate layout).
	if _, err := app.DB().NewQuery(
		"UPDATE slack_processed_events SET created_at = '2020-01-01 00:00:00.000Z' WHERE event_key = 'stale'").Execute(); err != nil {
		t.Fatalf("backdate: %v", err)
	}
	c.pruneProcessedEvents()
	// 'stale' pruned → re-marking is fresh again; 'recent' survives → duplicate.
	if fresh, _ := c.markProcessed("stale"); !fresh {
		t.Fatal("stale event should have been pruned")
	}
	if fresh, _ := c.markProcessed("recent"); fresh {
		t.Fatal("recent event must survive the prune")
	}
}

// ── MEDIUM: link cookies are __Host- host-bound (cookie-fixation defense) ────

// Both link cookies carry the __Host- prefix and its required attributes
// (Secure + Path=/ + no Domain), so a sibling *.hanzo.ai origin cannot plant or
// fixate a same-named cookie into the victim's jar.
func TestLinkCookies_HostPrefixed(t *testing.T) {
	app, wsRec, _, _ := boot(t)
	addAgentCollections(t, app, wsRec)

	oldAPI := slackAPI
	slackSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok": true, "authed_user": map[string]string{"id": "Uverified"},
			"team": map[string]string{"id": "T1"},
		})
	}))
	slackAPI = slackSrv.URL
	t.Cleanup(func() { slackAPI = oldAPI; slackSrv.Close() })

	c := linkController(t, app)
	_ = c.upsertInstall("T1", wsRec.Id, "hanzo")

	assertHostCookie := func(cookies []*http.Cookie, name string) {
		t.Helper()
		var ck *http.Cookie
		for _, x := range cookies {
			if x.Name == name {
				ck = x
			}
		}
		if ck == nil {
			t.Fatalf("cookie %s not set", name)
		}
		if !strings.HasPrefix(ck.Name, "__Host-") {
			t.Fatalf("%s must carry the __Host- prefix", name)
		}
		if !ck.Secure || !ck.HttpOnly || ck.Path != "/" || ck.Domain != "" {
			t.Fatalf("%s must be Secure+HttpOnly+Path=/+no-Domain, got %+v", name, ck)
		}
	}

	// Leg 1 sets the init cookie.
	entry, _ := signLinkState("strong-secret", "T1", "U1", 0)
	req1 := httptest.NewRequest("GET", "/v1/slack/link?state="+url.QueryEscape(entry), nil)
	rec1 := drive(app, req1, nil, c.link)
	assertHostCookie(rec1.Result().Cookies(), linkInitCookieName)

	// Leg 2 sets the link cookie (drive with the continuity pair from leg 1).
	init, ss := runLinkLeg1(t, c, app)
	req2 := httptest.NewRequest("GET", "/v1/slack/link/slack?code=abc&state="+url.QueryEscape(ss), nil)
	req2.AddCookie(&http.Cookie{Name: linkInitCookieName, Value: init})
	rec2 := drive(app, req2, nil, c.linkSlack)
	assertHostCookie(rec2.Result().Cookies(), linkCookieName)
}
