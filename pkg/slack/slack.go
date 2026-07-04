package slack

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/tools/hook"
	"github.com/hanzoai/dbx"
	"github.com/hanzoai/team-go/pkg/token"
	"github.com/hanzoai/team-go/pkg/wsauth"
)

// agentTimeout bounds an async agent turn end to end (identity refresh + run +
// Slack post). Generous because a run executes a real model completion.
const agentTimeout = 110 * time.Second

// slackAuthorizeURL is Slack's OAuth v2 authorize endpoint (bot install + user
// sign-in both start here; they differ only in scope vs user_scope).
const slackAuthorizeURL = "https://slack.com/oauth/v2/authorize"

// defaultBotScopes is the full bot scope set requested by connect: enough to
// receive @mentions/DMs, read channel history, reply (incl. ephemerally), read
// users, and register the slash command.
const defaultBotScopes = "app_mentions:read,chat:write,channels:history,channels:read,groups:history,im:history,im:read,im:write,users:read,commands"

// linkInitCookieName is the httpOnly init cookie that ties leg 1 (link) to leg 2
// (linkSlack) in ONE browser: its random value is ALSO carried as the subject of
// the slack-signin state, and leg 2 requires the cookie to equal that subject. A
// transplanted /link/slack (attacker's code+state pasted into a victim's browser)
// carries no matching init cookie, so it is refused — the Slack-code transplant
// hijack (F1) is closed.
const linkInitCookieName = "hanzo_slack_init"

// linkCookieName is the browser-bound, httpOnly cookie that carries the
// SLACK-VERIFIED (team,user) across the hanzo.id OIDC leg. The account binding is
// read from THIS cookie, never from a URL/state param — the link-hijack defense.
const linkCookieName = "hanzo_slack_link"

// defaultAgentConcurrency caps simultaneous agent turns (M3) so a workspace
// insider cannot exhaust FDs by bursting @hanzo.
const defaultAgentConcurrency = 32

// errInstallConflict is returned by upsertInstall when a DIFFERENT org already
// owns a team's install (first-org-wins; the confused-deputy defense).
var errInstallConflict = errors.New("slack: team already installed by another org")

// Register binds the Slack surface and the outgoing relay hook.
//
//	POST /v1/slack/events         — Slack Events API webhook (HMAC-verified, INCOMING)
//	POST /v1/slack/commands       — Slack slash command (HMAC-verified, /hanzo)
//	GET  /v1/slack/connect        — begin app OAuth (workspace-admin OR org JWT)
//	GET  /v1/slack/oauth          — app OAuth callback (authorized by signed `state`)
//	POST /v1/slack/mappings       — map a Hanzo channel <-> Slack channel (admin)
//	GET  /v1/slack/mappings       — list this workspace's mappings (admin)
//	GET  /v1/slack/link           — begin per-user account link (Slack sign-in leg)
//	GET  /v1/slack/link/slack      — Slack sign-in callback (sets browser-bound cookie)
//	GET  /v1/slack/link/callback  — hanzo.id OIDC callback (binds Slack<->Hanzo)
//
// @hanzo in Slack (an @mention, a DM, or the /hanzo slash command) is the
// front-door to the whole Hanzo cloud: it runs an agent ON BEHALF OF the Slack
// user's own Hanzo account (their billing) and replies in-thread. This is
// ADDITIVE to the existing channel-mirror relay, which is unchanged.
func Register(app core.App) {
	cfg := loadConfig()
	c := &controller{
		app:        app,
		cfg:        cfg,
		tokens:     newTokenStore(cfg.kmsEndpoint, cfg.kmsBearer),
		userTokens: newUserTokenStore(cfg.kmsEndpoint, cfg.kmsBearer),
		oidc:       newOIDCClient(cfg.iamEndpoint, cfg.iamClientID, cfg.iamClientSecret, cfg.linkRedirect),
		seenEvents: newSeenSet(time.Duration(maxTimestampSkewSec) * time.Second),
		usedStates: newSeenSet(time.Duration(oauthStateTTLSec) * time.Second),
		agentSem:   make(chan struct{}, cfg.agentConcurrency),
	}
	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			e.Router.POST("/v1/slack/events", c.events)
			e.Router.POST("/v1/slack/commands", c.commands)
			e.Router.GET("/v1/slack/connect", c.connect)
			e.Router.GET("/v1/slack/oauth", c.oauth)
			e.Router.POST("/v1/slack/mappings", c.mapChannel)
			e.Router.GET("/v1/slack/mappings", c.listMappings)
			e.Router.GET("/v1/slack/link", c.link)
			e.Router.GET("/v1/slack/link/slack", c.linkSlack)
			e.Router.GET("/v1/slack/link/callback", c.linkCallback)
			return e.Next()
		},
	})
	// Outgoing relay: a new message in a mapped channel mirrors to Slack. Bot-
	// authored (mirrored-in) messages are skipped to break the loop.
	app.OnRecordAfterCreateSuccess("messages").BindFunc(c.onMessageCreated)
	// Bound the durable dedupe table's growth (F3): sweep rows older than the
	// retry horizon on a cheap hourly ticker.
	c.startEventPrune()
}

type config struct {
	secret        string // SERVER_SECRET — signs OAuth/link state
	slackClientID string
	slackSecret   string
	slackSigning  string
	slackRedirect string
	kmsEndpoint   string
	kmsBearer     string
	// on-behalf-of agent front-door
	iamEndpoint       string // hanzo.id (OIDC for per-user link)
	iamClientID       string
	iamClientSecret   string
	linkRedirect      string // SLACK_LINK_REDIRECT_URI (hanzo.id callback)
	linkSlackRedirect string // SLACK_LINK_SLACK_REDIRECT_URI (Slack sign-in callback)
	agentsBase        string // cloud gateway that runs agents (api.hanzo.ai)
	agentRef          string // default agent id/name (SLACK_AGENT_REF)
	agentConcurrency  int    // max concurrent agent turns
}

func loadConfig() config {
	conc := defaultAgentConcurrency
	if v, err := strconv.Atoi(strings.TrimSpace(os.Getenv("SLACK_AGENT_CONCURRENCY"))); err == nil && v > 0 {
		conc = v
	}
	return config{
		secret:            env("SERVER_SECRET", token.DefaultSecret),
		slackClientID:     os.Getenv("SLACK_CLIENT_ID"),
		slackSecret:       os.Getenv("SLACK_CLIENT_SECRET"),
		slackSigning:      os.Getenv("SLACK_SIGNING_SECRET"),
		slackRedirect:     os.Getenv("SLACK_REDIRECT_URI"),
		kmsEndpoint:       env("KMS_ENDPOINT", "https://kms.hanzo.ai"),
		kmsBearer:         os.Getenv("HANZO_API_KEY"),
		iamEndpoint:       env("IAM_ENDPOINT", "https://hanzo.id"),
		iamClientID:       os.Getenv("IAM_CLIENT_ID"),
		iamClientSecret:   os.Getenv("IAM_CLIENT_SECRET"),
		linkRedirect:      env("SLACK_LINK_REDIRECT_URI", "https://api.hanzo.ai/v1/slack/link/callback"),
		linkSlackRedirect: env("SLACK_LINK_SLACK_REDIRECT_URI", "https://api.hanzo.ai/v1/slack/link/slack"),
		agentsBase:        env("AGENTS_ENDPOINT", "https://api.hanzo.ai"),
		agentRef:          env("SLACK_AGENT_REF", "hanzo"),
		agentConcurrency:  conc,
	}
}

func (c config) slackConfigured() bool {
	return c.slackClientID != "" && c.slackSecret != "" && c.slackSigning != "" && c.slackRedirect != ""
}

// iamConfigured reports whether the hanzo.id OIDC leg can run.
func (c config) iamConfigured() bool {
	return c.iamClientID != "" && c.iamClientSecret != "" && c.linkRedirect != ""
}

// linkConfigured reports whether the full per-user link (Slack sign-in +
// hanzo.id OIDC) can run.
func (c config) linkConfigured() bool {
	return c.slackClientID != "" && c.slackSecret != "" && c.linkSlackRedirect != "" && c.iamConfigured()
}

type controller struct {
	app        core.App
	cfg        config
	tokens     *tokenStore
	userTokens *userTokenStore
	oidc       *oidcClient
	seenEvents *seenSet
	usedStates *seenSet
	agentSem   chan struct{}
}

// stateSecretOK fails closed (L1): the signed-state flows must NOT be armed with
// an empty or default SERVER_SECRET, else an attacker could forge OAuth/link
// state (or a link cookie) and hijack an install or an account binding.
func (c *controller) stateSecretOK() bool {
	return c.cfg.secret != "" && c.cfg.secret != token.DefaultSecret
}

// ── INCOMING: Slack Events API webhook ──────────────────────────────────────

func (c *controller) events(re *core.RequestEvent) error {
	if c.cfg.slackSigning == "" {
		return re.JSON(http.StatusServiceUnavailable, map[string]string{"error": "slack not configured"})
	}
	raw, err := io.ReadAll(io.LimitReader(re.Request.Body, 1<<20))
	if err != nil {
		return re.BadRequestError("read body", err)
	}
	ok := verifySignature(
		c.cfg.slackSigning,
		re.Request.Header.Get("X-Slack-Signature"),
		re.Request.Header.Get("X-Slack-Request-Timestamp"),
		string(raw),
		0,
	)
	if !ok {
		return re.UnauthorizedError("bad signature", nil)
	}
	decision := routeEvent(raw)
	switch decision.Kind {
	case routeChallenge:
		return re.String(http.StatusOK, decision.Challenge)
	case routeRelay:
		// In-process dedupe (cosmetic: a duplicated mirror is not a security issue).
		if c.seenEvents.seenAndAdd(eventKey(raw), time.Time{}) {
			return re.NoContent(http.StatusOK)
		}
		go c.relayIncoming(decision)
		return re.NoContent(http.StatusOK)
	case routeAgent:
		// DURABLE dedupe (M2): an agent turn is BILLED, so a Slack retry must
		// never double-run. Fail CLOSED on a dedupe error (skip) rather than risk
		// a double charge.
		fresh, derr := c.markProcessed(eventKey(raw))
		if derr != nil {
			c.app.Logger().Warn("slack: agent dedupe error, skipping", "err", derr)
			return re.NoContent(http.StatusOK)
		}
		if !fresh {
			return re.NoContent(http.StatusOK)
		}
		c.dispatchAgent(func() { c.handleAgent(decision) })
		return re.NoContent(http.StatusOK)
	case routeAck:
		return re.NoContent(http.StatusOK)
	default:
		return re.BadRequestError("unrecognized event", nil)
	}
}

// relayIncoming mirrors a verified Slack message into the mapped Hanzo channel,
// posting as the workspace's bot so authorship is attributed to a bot member.
func (c *controller) relayIncoming(d routeDecision) {
	mapping, _ := c.app.FindFirstRecordByFilter("slack_mappings",
		"slack_team_id = {:t} && slack_channel_id = {:c} && enabled = true",
		dbx.Params{"t": d.TeamID, "c": d.SlackChannelID})
	if mapping == nil {
		return
	}
	coll, err := c.app.FindCollectionByNameOrId("messages")
	if err != nil {
		return
	}
	msg := core.NewRecord(coll)
	msg.Set("channel_id", mapping.GetString("channel_id"))
	msg.Set("author_id", "slack:"+d.SlackUserID)
	msg.Set("body", d.Text)
	if err := c.app.Save(msg); err != nil {
		c.app.Logger().Error("slack: relay incoming save", "err", err)
		return
	}
	c.app.Logger().Info("slack: relayed slack -> team", "team", d.TeamID, "channel", mapping.GetString("channel_id"))
}

// ── @hanzo agent front-door ─────────────────────────────────────────────────

// dispatchAgent runs an agent turn under the concurrency cap (M3). It acquires a
// slot non-blockingly; if the pool is full the turn is dropped + logged (a DoS
// insider cannot pile up unbounded goroutines/FDs). A controller built without a
// pool (cap 0) runs inline — used only in unit tests that call handlers directly.
func (c *controller) dispatchAgent(run func()) {
	if cap(c.agentSem) == 0 {
		go run()
		return
	}
	select {
	case c.agentSem <- struct{}{}:
		go func() {
			defer func() { <-c.agentSem }()
			run()
		}()
	default:
		c.app.Logger().Warn("slack: agent at capacity, turn dropped")
	}
}

// handleAgent answers an @mention / DM: it resolves the workspace bot token (the
// reply SINK) and posts the agent's answer — or the account-link prompt — into
// the SAME Slack thread. A link prompt is delivered EPHEMERALLY (only the
// invoking user sees it) so a link URL never reaches a whole channel.
func (c *controller) handleAgent(d routeDecision) {
	ctx, cancel := ctxTimeout(agentTimeout)
	defer cancel()
	org, _, ok := c.installOrg(d.TeamID)
	if !ok {
		c.app.Logger().Warn("slack: agent event for uninstalled team", "team", d.TeamID)
		return
	}
	tok, ok, err := c.tokens.get(ctx, org, d.TeamID)
	if err != nil || !ok {
		c.app.Logger().Warn("slack: agent bot token fetch", "team", d.TeamID, "err", err)
		return
	}
	reply, linkPrompt := c.agentReply(ctx, d.TeamID, d.SlackUserID, d.Text)
	if reply == "" {
		return
	}
	if linkPrompt {
		if err := postEphemeral(ctx, tok, d.SlackChannelID, d.SlackUserID, reply); err != nil {
			c.app.Logger().Warn("slack: agent ephemeral post", "team", d.TeamID, "err", err)
		}
		return
	}
	if err := postThreadMessage(ctx, tok, d.SlackChannelID, d.ThreadTS, reply); err != nil {
		c.app.Logger().Warn("slack: agent thread post", "team", d.TeamID, "err", err)
	}
}

// ── slash command (/hanzo) ──────────────────────────────────────────────────

// commands handles a Slack slash command (application/x-www-form-urlencoded). It
// verifies the SAME HMAC signature, dedupes on trigger_id (durable, M2), acks
// within Slack's 3s budget (empty 200), and posts the AI answer asynchronously
// via the command's response_url.
func (c *controller) commands(re *core.RequestEvent) error {
	if c.cfg.slackSigning == "" {
		return re.JSON(http.StatusServiceUnavailable, map[string]string{"error": "slack not configured"})
	}
	raw, err := io.ReadAll(io.LimitReader(re.Request.Body, 1<<20))
	if err != nil {
		return re.BadRequestError("read body", err)
	}
	if !verifySignature(c.cfg.slackSigning, re.Request.Header.Get("X-Slack-Signature"),
		re.Request.Header.Get("X-Slack-Request-Timestamp"), string(raw), 0) {
		return re.UnauthorizedError("bad signature", nil)
	}
	team, channel, user, text, responseURL, triggerID, ok := parseSlashCommand(raw)
	if !ok {
		return re.BadRequestError("missing team_id or user_id", nil)
	}
	fresh, derr := c.markProcessed(triggerID)
	if derr != nil {
		c.app.Logger().Warn("slack: slash dedupe error, skipping", "err", derr)
		return re.NoContent(http.StatusOK)
	}
	if !fresh {
		return re.NoContent(http.StatusOK)
	}
	c.dispatchAgent(func() {
		c.handleAgentSlash(routeDecision{
			Kind: routeAgent, TeamID: team, SlackChannelID: channel, SlackUserID: user, Text: text,
		}, responseURL)
	})
	return re.NoContent(http.StatusOK)
}

// parseSlashCommand extracts the fields the slash command carries. Pure. ok is
// false when the identifying fields (team_id, user_id) are absent.
func parseSlashCommand(raw []byte) (team, channel, user, text, responseURL, triggerID string, ok bool) {
	form, err := url.ParseQuery(string(raw))
	if err != nil {
		return "", "", "", "", "", "", false
	}
	team = form.Get("team_id")
	channel = form.Get("channel_id")
	user = form.Get("user_id")
	text = strings.TrimSpace(form.Get("text"))
	responseURL = form.Get("response_url")
	triggerID = form.Get("trigger_id")
	ok = team != "" && user != ""
	return
}

// handleAgentSlash runs the agent for a slash command and delivers the reply via
// the response_url. A link prompt goes ephemeral (only the invoker sees it); an
// answer goes in_channel.
func (c *controller) handleAgentSlash(d routeDecision, responseURL string) {
	ctx, cancel := ctxTimeout(agentTimeout)
	defer cancel()
	if _, _, ok := c.installOrg(d.TeamID); !ok {
		_ = postResponseURL(ctx, responseURL, "ephemeral", "This Slack workspace isn't connected to Hanzo yet.")
		return
	}
	reply, linkPrompt := c.agentReply(ctx, d.TeamID, d.SlackUserID, d.Text)
	if reply == "" {
		return
	}
	responseType := "in_channel"
	if linkPrompt {
		responseType = "ephemeral"
	}
	if err := postResponseURL(ctx, responseURL, responseType, reply); err != nil {
		c.app.Logger().Warn("slack: slash reply", "team", d.TeamID, "err", err)
	}
}

// ── OUTGOING: Hanzo message -> Slack ────────────────────────────────────────

func (c *controller) onMessageCreated(e *core.RecordEvent) error {
	rec := e.Record
	if rec == nil {
		return e.Next()
	}
	author := rec.GetString("author_id")
	if strings.HasPrefix(author, "slack:") {
		return e.Next()
	}
	channelID := rec.GetString("channel_id")
	mapping, _ := c.app.FindFirstRecordByFilter("slack_mappings",
		"channel_id = {:c} && enabled = true", dbx.Params{"c": channelID})
	if mapping == nil {
		return e.Next()
	}
	ws, _ := c.app.FindFirstRecordByFilter("workspaces", "id = {:id}",
		dbx.Params{"id": mapping.GetString("workspace_id")})
	if ws == nil {
		return e.Next()
	}
	org := wsauth.WorkspaceOrg(ws)
	if org == "" {
		c.app.Logger().Warn("slack: outgoing skipped, workspace has no owner_org", "workspace", ws.Id)
		return e.Next()
	}
	teamID := mapping.GetString("slack_team_id")
	body := rec.GetString("body")
	go func() {
		ctx, cancel := ctxTimeout(15 * time.Second)
		defer cancel()
		tok, ok, err := c.tokens.get(ctx, org, teamID)
		if err != nil || !ok {
			c.app.Logger().Warn("slack: outgoing token fetch", "err", err, "team", teamID)
			return
		}
		if err := postMessage(ctx, tok, mapping.GetString("slack_channel_id"), body); err != nil {
			c.app.Logger().Warn("slack: outgoing post", "err", err, "team", teamID)
		}
	}()
	return e.Next()
}

// ── app OAuth (workspace-admin OR org JWT) ──────────────────────────────────

// resolveConnectOrg resolves the org an OAuth connect is FOR. Two authenticated
// paths, both yielding an org (DRY): (1) workspace-admin — a resolvable workspace
// where the caller is owner/admin (strictest); (2) org-scoped (console
// Integrations) — any authenticated caller with an org tenant may connect Slack
// for THEIR OWN org (Slack's own admin-Allow gates the real bot install, and
// first-org-wins prevents cross-org capture). The org is never taken from the
// client body — only from the validated token/membership.
//
// POLICY DECISION (F2): initiating connect is intentionally NOT restricted to an
// org owner/admin. The three gates that matter are external: Slack requires a
// Slack workspace admin to click Allow (so a non-admin cannot actually install a
// bot), first-org-wins stops cross-org capture, and the org is strictly the
// caller's own validated tenant. The residual is same-org griefing (a member
// generating an install URL for their own org), which is acceptable — the console
// Integrations page is org-authed, and gating harder would block that flow.
func (c *controller) resolveConnectOrg(re *core.RequestEvent) (string, error) {
	if re.Auth == nil {
		return "", re.UnauthorizedError("auth required", nil)
	}
	if a, err := wsauth.AssertAdmin(c.app, re); err == nil {
		return a.Org, nil
	}
	org := wsauth.CallerOrg(re)
	if org == "" {
		return "", re.ForbiddenError("no org context", nil)
	}
	return org, nil
}

func (c *controller) connect(re *core.RequestEvent) error {
	if !c.cfg.slackConfigured() {
		return re.JSON(http.StatusServiceUnavailable, map[string]string{"error": "slack not configured"})
	}
	if !c.stateSecretOK() {
		return re.JSON(http.StatusServiceUnavailable, map[string]string{"error": "server secret not configured"})
	}
	org, err := c.resolveConnectOrg(re)
	if err != nil {
		return err
	}
	scopes := re.Request.URL.Query().Get("scopes")
	if scopes == "" {
		scopes = defaultBotScopes
	}
	// State binds the ORG (tenant), so the callback stores the token under the
	// same org this connect was authorized for. Signed + single-use.
	state, err := signOAuthState(c.cfg.secret, org, 0)
	if err != nil {
		return re.InternalServerError("oauth state", err)
	}
	u, _ := url.Parse(slackAuthorizeURL)
	q := u.Query()
	q.Set("client_id", c.cfg.slackClientID)
	q.Set("scope", scopes)
	q.Set("redirect_uri", c.cfg.slackRedirect)
	q.Set("state", state)
	u.RawQuery = q.Encode()
	return re.JSON(http.StatusOK, map[string]string{"url": u.String()})
}

func (c *controller) oauth(re *core.RequestEvent) error {
	if !c.cfg.slackConfigured() {
		return re.JSON(http.StatusServiceUnavailable, map[string]string{"error": "slack not configured"})
	}
	if !c.stateSecretOK() {
		return re.JSON(http.StatusServiceUnavailable, map[string]string{"error": "server secret not configured"})
	}
	code := re.Request.URL.Query().Get("code")
	state := re.Request.URL.Query().Get("state")
	if code == "" || state == "" {
		return re.BadRequestError("missing code or state", nil)
	}
	st, ok := verifyOAuthState(c.cfg.secret, state, 0)
	if !ok {
		return re.BadRequestError("invalid or expired oauth state", nil)
	}
	org := st.Subject
	if org == "" {
		return re.BadRequestError("invalid oauth state", nil)
	}
	tok, err := exchangeCode(re.Request.Context(), c.cfg.slackClientID, c.cfg.slackSecret, code, c.cfg.slackRedirect)
	if err != nil {
		c.app.Logger().Error("slack: oauth exchange", "err", err)
		return re.BadRequestError("oauth failed", nil)
	}
	// Consume the single-use nonce AFTER a successful exchange (anti-griefing: a
	// bogus code cannot burn a valid nonce).
	if c.usedStates.seenAndAdd(st.Nonce, time.Time{}) {
		return re.BadRequestError("oauth state already used", nil)
	}
	// FIRST-ORG-WINS (M1): record the install BEFORE storing the token; if a
	// different org already owns this team, refuse and store NOTHING.
	if err := c.upsertInstall(tok.TeamID, "", org); err != nil {
		if errors.Is(err, errInstallConflict) {
			c.app.Logger().Warn("slack: cross-org install refused", "team", tok.TeamID, "attempt", org)
			return re.ForbiddenError("slack team already connected to another organization", nil)
		}
		c.app.Logger().Error("slack: install record", "team", tok.TeamID, "err", err)
		return re.InternalServerError("install record", nil)
	}
	if err := c.tokens.save(re.Request.Context(), org, tok); err != nil {
		c.app.Logger().Error("slack: token save", "err", err) // never logs the token
		return re.InternalServerError("token store failed", nil)
	}
	c.app.Logger().Info("slack: workspace connected", "team", tok.TeamID, "org", org)
	return re.JSON(http.StatusOK, map[string]string{"status": "connected", "team": tok.TeamName})
}

// ── per-user account link (Slack sign-in + hanzo.id OIDC, on-behalf-of) ──────

// linkedHTML is the terse success page shown after a user links their account.
const linkedHTML = `<!doctype html><meta charset="utf-8"><title>Hanzo connected</title>` +
	`<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;text-align:center">` +
	`<h1>Hanzo connected</h1><p>Your Hanzo account is linked. Return to Slack and mention <b>@hanzo</b>.</p></body>`

// setLinkCookie writes the browser-bound, httpOnly link cookie carrying the
// SLACK-VERIFIED (team,user). SameSite=Lax so it survives the top-level GET
// redirect back from hanzo.id; Secure + httpOnly + short-lived + path-scoped.
func (c *controller) setLinkCookie(re *core.RequestEvent, val string) {
	http.SetCookie(re.Response, &http.Cookie{
		Name: linkCookieName, Value: val, Path: "/v1/slack/link",
		MaxAge: oauthStateTTLSec, HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode,
	})
}

func (c *controller) readLinkCookie(re *core.RequestEvent) string {
	ck, err := re.Request.Cookie(linkCookieName)
	if err != nil || ck == nil {
		return ""
	}
	return ck.Value
}

func (c *controller) clearLinkCookie(re *core.RequestEvent) {
	http.SetCookie(re.Response, &http.Cookie{
		Name: linkCookieName, Value: "", Path: "/v1/slack/link",
		MaxAge: -1, HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode,
	})
}

// setInitCookie plants the leg-1->leg-2 continuity nonce (F1).
func (c *controller) setInitCookie(re *core.RequestEvent, val string) {
	http.SetCookie(re.Response, &http.Cookie{
		Name: linkInitCookieName, Value: val, Path: "/v1/slack/link",
		MaxAge: oauthStateTTLSec, HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode,
	})
}

func (c *controller) readInitCookie(re *core.RequestEvent) string {
	ck, err := re.Request.Cookie(linkInitCookieName)
	if err != nil || ck == nil {
		return ""
	}
	return ck.Value
}

func (c *controller) clearInitCookie(re *core.RequestEvent) {
	http.SetCookie(re.Response, &http.Cookie{
		Name: linkInitCookieName, Value: "", Path: "/v1/slack/link",
		MaxAge: -1, HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode,
	})
}

// link begins the per-user account link. The entry `state` (signed (team,user))
// is PROVENANCE only — it proves a server-minted prompt. The binding identity is
// NOT taken from it; the flow first authenticates the Slack user (Slack sign-in
// leg) so the Slack subject is Slack-verified.
func (c *controller) link(re *core.RequestEvent) error {
	if !c.cfg.linkConfigured() {
		return re.JSON(http.StatusServiceUnavailable, map[string]string{"error": "account linking not configured"})
	}
	if !c.stateSecretOK() {
		return re.JSON(http.StatusServiceUnavailable, map[string]string{"error": "server secret not configured"})
	}
	if _, _, _, ok := verifyLinkState(c.cfg.secret, re.Request.URL.Query().Get("state"), 0); !ok {
		return re.BadRequestError("invalid or expired link", nil)
	}
	// Browser-continuity nonce (F1): a fresh random bound BOTH into an httpOnly
	// init cookie AND the slack-signin state's subject. Leg 2 requires the two to
	// match, forcing legs 1->2->3 into the ONE browser that started here.
	initNonce, err := randHex(16)
	if err != nil {
		return re.InternalServerError("link nonce", err)
	}
	ss, err := signSubjectState(c.cfg.secret, initNonce, 0)
	if err != nil {
		return re.InternalServerError("link state", err)
	}
	c.setInitCookie(re, initNonce)
	u, _ := url.Parse(slackAuthorizeURL)
	q := u.Query()
	q.Set("client_id", c.cfg.slackClientID)
	q.Set("user_scope", "openid")
	q.Set("redirect_uri", c.cfg.linkSlackRedirect)
	q.Set("state", ss)
	u.RawQuery = q.Encode()
	return re.Redirect(http.StatusFound, u.String())
}

// linkSlack is the Slack sign-in callback. It exchanges the Slack code for the
// SLACK-VERIFIED (team,user) (authed_user.id), sets a browser-bound cookie
// carrying that identity, and redirects into hanzo.id OIDC. The identity that
// will be bound comes from THIS Slack-authenticated exchange, never a URL param.
func (c *controller) linkSlack(re *core.RequestEvent) error {
	if !c.cfg.linkConfigured() {
		return re.JSON(http.StatusServiceUnavailable, map[string]string{"error": "account linking not configured"})
	}
	if !c.stateSecretOK() {
		return re.JSON(http.StatusServiceUnavailable, map[string]string{"error": "server secret not configured"})
	}
	q := re.Request.URL.Query()
	if e := q.Get("error"); e != "" {
		return re.BadRequestError("slack authorization declined", nil)
	}
	code := q.Get("code")
	state := q.Get("state")
	if code == "" || state == "" {
		return re.BadRequestError("missing code or state", nil)
	}
	st, ok := verifySubjectState(c.cfg.secret, state, 0)
	if !ok {
		c.clearInitCookie(re)
		return re.BadRequestError("invalid or expired link", nil)
	}
	// Browser continuity (F1): the init cookie set in leg 1 MUST equal the nonce
	// carried in the slack-signin state's subject. A transplanted link (attacker's
	// code+state opened in a VICTIM's browser) has no matching init cookie, so we
	// refuse BEFORE exchanging the code or planting any cookie — no attacker Slack
	// identity is ever bound into the victim's browser.
	if init := c.readInitCookie(re); init == "" || init != st.Subject {
		c.clearInitCookie(re)
		return re.BadRequestError("link session mismatch; restart from Slack", nil)
	}
	// Single-use: consume the slack-signin state's nonce (defense in depth atop
	// Slack's single-use code).
	if c.usedStates.seenAndAdd(st.Nonce, time.Time{}) {
		c.clearInitCookie(re)
		return re.BadRequestError("link already used", nil)
	}
	teamID, slackUserID, err := exchangeUserCode(re.Request.Context(),
		c.cfg.slackClientID, c.cfg.slackSecret, code, c.cfg.linkSlackRedirect)
	if err != nil {
		c.app.Logger().Error("slack: user auth exchange", "err", err)
		c.clearInitCookie(re)
		return re.BadRequestError("slack sign-in failed", nil)
	}
	if _, _, ok := c.installOrg(teamID); !ok {
		c.clearInitCookie(re)
		return re.BadRequestError("workspace not connected", nil)
	}
	cookieVal, err := signLinkState(c.cfg.secret, teamID, slackUserID, 0)
	if err != nil {
		c.clearInitCookie(re)
		return re.InternalServerError("link state", err)
	}
	// The init cookie has done its job; the link cookie now carries the
	// Slack-verified (team,user) across the hanzo.id leg.
	c.clearInitCookie(re)
	c.setLinkCookie(re, cookieVal)
	// hanzo authorize state == the cookie value (ties this OIDC leg to THIS
	// browser; the callback requires state == cookie).
	return re.Redirect(http.StatusFound, c.oidc.authorizeURL(cookieVal))
}

// linkCallback completes the link: it reads the SLACK-VERIFIED (team,user) from
// the BROWSER-BOUND cookie (a forwarded link carries no cookie → cannot bind),
// requires state == cookie, exchanges the hanzo.id code, and binds
// (team,user) ↔ hanzo account. Never logs a token.
func (c *controller) linkCallback(re *core.RequestEvent) error {
	if !c.cfg.linkConfigured() {
		return re.JSON(http.StatusServiceUnavailable, map[string]string{"error": "account linking not configured"})
	}
	if !c.stateSecretOK() {
		return re.JSON(http.StatusServiceUnavailable, map[string]string{"error": "server secret not configured"})
	}
	q := re.Request.URL.Query()
	cookie := c.readLinkCookie(re)
	if e := q.Get("error"); e != "" {
		c.clearLinkCookie(re)
		return re.BadRequestError("authorization declined", nil)
	}
	code := q.Get("code")
	state := q.Get("state")
	if code == "" {
		c.clearLinkCookie(re)
		return re.BadRequestError("missing code", nil)
	}
	// The binding subject is the browser-bound cookie (set only after a
	// Slack-verified sign-in). No cookie → refuse (link-hijack defense).
	if cookie == "" {
		return re.BadRequestError("link session missing; restart from Slack", nil)
	}
	// state must equal the cookie (OIDC CSRF + browser binding).
	if state == "" || state != cookie {
		c.clearLinkCookie(re)
		return re.BadRequestError("link state mismatch", nil)
	}
	teamID, slackUserID, nonce, ok := verifyLinkState(c.cfg.secret, cookie, 0)
	if !ok {
		c.clearLinkCookie(re)
		return re.BadRequestError("invalid or expired link", nil)
	}
	org, _, iok := c.installOrg(teamID)
	if !iok {
		c.clearLinkCookie(re)
		return re.BadRequestError("workspace not connected", nil)
	}
	ctx := re.Request.Context()
	ts, err := c.oidc.exchangeCode(ctx, code)
	if err != nil {
		c.app.Logger().Error("slack: link code exchange", "team", teamID, "err", err)
		c.clearLinkCookie(re)
		return re.BadRequestError("link failed", nil)
	}
	// Consume the single-use nonce AFTER a successful exchange (anti-griefing).
	if c.usedStates.seenAndAdd(nonce, time.Time{}) {
		c.clearLinkCookie(re)
		return re.BadRequestError("link already used", nil)
	}
	if ts.Refresh == "" {
		c.clearLinkCookie(re)
		return re.InternalServerError("link incomplete: no refresh token", nil)
	}
	sub, userOrg, err := c.oidc.identity(ctx, ts.Access)
	if err != nil {
		c.app.Logger().Error("slack: link identity", "team", teamID, "err", err)
		c.clearLinkCookie(re)
		return re.InternalServerError("link identity", nil)
	}
	// Store the token FIRST, then the pointer row (a present link row implies a
	// present token). The binding (team,user) is the Slack-verified cookie subject.
	if err := c.userTokens.save(ctx, org, teamID, slackUserID, userToken{RefreshToken: ts.Refresh, Subject: sub, Org: userOrg}); err != nil {
		c.app.Logger().Error("slack: user token save", "team", teamID, "err", err) // never logs the token
		c.clearLinkCookie(re)
		return re.InternalServerError("token store failed", nil)
	}
	if err := c.saveUserLink(teamID, slackUserID, sub, userOrg); err != nil {
		c.app.Logger().Error("slack: user link save", "team", teamID, "err", err)
		c.clearLinkCookie(re)
		return re.InternalServerError("link store failed", nil)
	}
	c.clearLinkCookie(re)
	c.app.Logger().Info("slack: user linked", "team", teamID, "slackUser", slackUserID) // no token
	return re.HTML(http.StatusOK, linkedHTML)
}

// ── channel mapping (admin, tenant-scoped) ──────────────────────────────────

type mapReq struct {
	SlackTeamID      string `json:"slackTeamId"`
	SlackChannelID   string `json:"slackChannelId"`
	SlackChannelName string `json:"slackChannelName"`
	ChannelID        string `json:"channelId"`
	Enabled          *bool  `json:"enabled"`
}

func (c *controller) mapChannel(re *core.RequestEvent) error {
	a, err := wsauth.AssertAdmin(c.app, re)
	if err != nil {
		return err
	}
	var req mapReq
	if e := re.BindBody(&req); e != nil || req.SlackTeamID == "" || req.SlackChannelID == "" || req.ChannelID == "" {
		return re.BadRequestError("slackTeamId, slackChannelId, channelId required", nil)
	}
	owned, ok, terr := c.tokens.get(re.Request.Context(), a.Org, req.SlackTeamID)
	if terr != nil {
		return re.InternalServerError("ownership check", terr)
	}
	if !ok || owned.TeamID != req.SlackTeamID {
		return re.ForbiddenError("slack team not connected to this workspace", nil)
	}
	ch, _ := c.app.FindFirstRecordByFilter("channels",
		"id = {:c} && workspace_id = {:w}", dbx.Params{"c": req.ChannelID, "w": a.Workspace.Id})
	if ch == nil {
		return re.NotFoundError("channel not in workspace", nil)
	}
	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}
	existing, _ := c.app.FindFirstRecordByFilter("slack_mappings",
		"slack_team_id = {:t} && slack_channel_id = {:sc}",
		dbx.Params{"t": req.SlackTeamID, "sc": req.SlackChannelID})
	if existing != nil {
		existing.Set("channel_id", ch.Id)
		existing.Set("workspace_id", a.Workspace.Id)
		existing.Set("slack_channel_name", req.SlackChannelName)
		existing.Set("enabled", enabled)
		if e := c.app.Save(existing); e != nil {
			return re.InternalServerError("save mapping", e)
		}
		return re.JSON(http.StatusOK, map[string]string{"status": "updated"})
	}
	coll, err2 := c.app.FindCollectionByNameOrId("slack_mappings")
	if err2 != nil {
		return re.InternalServerError("mapping collection", err2)
	}
	m := core.NewRecord(coll)
	m.Set("workspace_id", a.Workspace.Id)
	m.Set("channel_id", ch.Id)
	m.Set("slack_team_id", req.SlackTeamID)
	m.Set("slack_channel_id", req.SlackChannelID)
	m.Set("slack_channel_name", req.SlackChannelName)
	m.Set("enabled", enabled)
	m.Set("created_by", a.UserID)
	if e := c.app.Save(m); e != nil {
		return re.InternalServerError("save mapping", e)
	}
	c.app.Logger().Info("slack: channel mapped", "workspace", a.Workspace.Id, "slack", req.SlackChannelID, "channel", ch.Id)
	return re.JSON(http.StatusCreated, map[string]string{"status": "mapped"})
}

func (c *controller) listMappings(re *core.RequestEvent) error {
	a, err := wsauth.AssertAdmin(c.app, re)
	if err != nil {
		return err
	}
	rows, e := c.app.FindRecordsByFilter("slack_mappings",
		"workspace_id = {:w}", "-created_at", 500, 0, dbx.Params{"w": a.Workspace.Id})
	if e != nil {
		return re.InternalServerError("list mappings", e)
	}
	out := make([]map[string]any, 0, len(rows))
	for _, m := range rows {
		out = append(out, map[string]any{
			"id":               m.Id,
			"channelId":        m.GetString("channel_id"),
			"slackTeamId":      m.GetString("slack_team_id"),
			"slackChannelId":   m.GetString("slack_channel_id"),
			"slackChannelName": m.GetString("slack_channel_name"),
			"enabled":          m.GetBool("enabled"),
		})
	}
	return re.JSON(http.StatusOK, map[string]any{"mappings": out})
}

// ── helpers ────────────────────────────────────────────────────────────────

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func ctxTimeout(d time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), d)
}

// processedEventTTL bounds how long a dedupe row is retained. Slack's event
// retry horizon is minutes; a day is a wide margin.
const processedEventTTL = 24 * time.Hour

// startEventPrune sweeps expired slack_processed_events rows on an hourly ticker
// (F3), so the durable dedupe table cannot grow without bound. Best-effort and
// fire-and-forget: the process lifetime owns the goroutine (as with the other
// fire-and-forget Slack workers).
func (c *controller) startEventPrune() {
	go func() {
		t := time.NewTicker(time.Hour)
		defer t.Stop()
		for range t.C {
			c.pruneProcessedEvents()
		}
	}()
}

// pruneProcessedEvents deletes dedupe rows older than processedEventTTL. The
// cutoff is formatted in Base's autodate layout so the text comparison on
// created_at is correct.
func (c *controller) pruneProcessedEvents() {
	cutoff := time.Now().UTC().Add(-processedEventTTL).Format("2006-01-02 15:04:05.000Z")
	old, err := c.app.FindRecordsByFilter("slack_processed_events",
		"created_at < {:t}", "created_at", 5000, 0, dbx.Params{"t": cutoff})
	if err != nil {
		c.app.Logger().Warn("slack: prune processed events", "err", err)
		return
	}
	for _, r := range old {
		if err := c.app.Delete(r); err != nil {
			c.app.Logger().Warn("slack: prune delete", "err", err)
		}
	}
}
