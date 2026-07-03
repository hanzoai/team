package slack

import (
	"context"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/tools/hook"
	"github.com/hanzoai/dbx"
	"github.com/hanzoai/team-go/pkg/wsauth"
)

// agentTimeout bounds an async agent turn end to end (identity refresh + run +
// Slack post). Generous because a run executes a real model completion.
const agentTimeout = 110 * time.Second

// Register binds the Slack surface and the outgoing relay hook.
//
//	POST /v1/slack/events         — Slack Events API webhook (HMAC-verified, INCOMING)
//	POST /v1/slack/commands       — Slack slash command (HMAC-verified, /hanzo)
//	GET  /v1/slack/connect        — begin app OAuth (admin); returns the authorize URL
//	GET  /v1/slack/oauth          — app OAuth callback (authorized by signed `state`)
//	POST /v1/slack/mappings       — map a Hanzo channel <-> Slack channel (admin)
//	GET  /v1/slack/mappings       — list this workspace's mappings (admin)
//	GET  /v1/slack/link           — begin per-user hanzo.id OIDC link (Slack user)
//	GET  /v1/slack/link/callback  — per-user link callback (authorized by signed `state`)
//
// @hanzo in Slack (an @mention, a DM, or the /hanzo slash command) is the
// front-door to the whole Hanzo cloud: it runs an agent ON BEHALF OF the Slack
// user's own Hanzo account (their billing) and replies in-thread. This is
// ADDITIVE to the existing channel-mirror relay, which is unchanged.
//
// Missing Slack app creds (SLACK_*) is NON-FATAL: the webhook/connect/oauth
// endpoints 503 cleanly instead of throwing on startup. The per-user link
// endpoints additionally require IAM_CLIENT_ID/SECRET; they 503 without them.
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
			e.Router.GET("/v1/slack/link/callback", c.linkCallback)
			return e.Next()
		},
	})
	// Outgoing relay: a new message in a mapped channel mirrors to Slack. Bot-
	// authored (mirrored-in) messages are skipped to break the loop.
	app.OnRecordAfterCreateSuccess("messages").BindFunc(c.onMessageCreated)
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
	iamEndpoint     string // hanzo.id (OIDC for per-user link)
	iamClientID     string
	iamClientSecret string
	linkRedirect    string // SLACK_LINK_REDIRECT_URI
	agentsBase      string // cloud gateway that runs agents (api.hanzo.ai)
	agentRef        string // default agent id/name (SLACK_AGENT_REF)
}

func loadConfig() config {
	return config{
		secret:          env("SERVER_SECRET", "secret"),
		slackClientID:   os.Getenv("SLACK_CLIENT_ID"),
		slackSecret:     os.Getenv("SLACK_CLIENT_SECRET"),
		slackSigning:    os.Getenv("SLACK_SIGNING_SECRET"),
		slackRedirect:   os.Getenv("SLACK_REDIRECT_URI"),
		kmsEndpoint:     env("KMS_ENDPOINT", "https://kms.hanzo.ai"),
		kmsBearer:       os.Getenv("HANZO_API_KEY"),
		iamEndpoint:     env("IAM_ENDPOINT", "https://hanzo.id"),
		iamClientID:     os.Getenv("IAM_CLIENT_ID"),
		iamClientSecret: os.Getenv("IAM_CLIENT_SECRET"),
		linkRedirect:    env("SLACK_LINK_REDIRECT_URI", "https://api.hanzo.ai/v1/slack/link/callback"),
		agentsBase:      env("AGENTS_ENDPOINT", "https://api.hanzo.ai"),
		agentRef:        env("SLACK_AGENT_REF", "hanzo"),
	}
}

func (c config) slackConfigured() bool {
	return c.slackClientID != "" && c.slackSecret != "" && c.slackSigning != "" && c.slackRedirect != ""
}

// iamConfigured reports whether the per-user link (hanzo.id OIDC) can run.
func (c config) iamConfigured() bool {
	return c.iamClientID != "" && c.iamClientSecret != "" && c.linkRedirect != ""
}

type controller struct {
	app        core.App
	cfg        config
	tokens     *tokenStore
	userTokens *userTokenStore
	oidc       *oidcClient
	seenEvents *seenSet
	usedStates *seenSet
}

// ── INCOMING: Slack Events API webhook ──────────────────────────────────────

func (c *controller) events(re *core.RequestEvent) error {
	if c.cfg.slackSigning == "" {
		return re.JSON(http.StatusServiceUnavailable, map[string]string{"error": "slack not configured"})
	}
	// Read the RAW body so HMAC is over the exact bytes Slack signed.
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
		// Test-and-set dedupe SYNCHRONOUSLY before any async work so two
		// concurrent Slack retries of the same event_id cannot both relay.
		if c.seenEvents.seenAndAdd(eventKey(raw), time.Time{}) {
			return re.NoContent(http.StatusOK)
		}
		go c.relayIncoming(decision)
		return re.NoContent(http.StatusOK)
	case routeAgent:
		// @mention / DM: run the agent on-behalf-of the user, reply in-thread.
		// Dedupe on the Slack event_id (its own id space, distinct from the
		// paired `message` event, so a mapped-channel mention still mirrors).
		if c.seenEvents.seenAndAdd(eventKey(raw), time.Time{}) {
			return re.NoContent(http.StatusOK)
		}
		go c.handleAgent(decision)
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
		return // channel not mapped — nothing to do
	}
	coll, err := c.app.FindCollectionByNameOrId("messages")
	if err != nil {
		return
	}
	msg := core.NewRecord(coll)
	msg.Set("channel_id", mapping.GetString("channel_id"))
	// Authorship: a synthetic slack: social id — never a human. This also lets
	// the outgoing hook recognize its own mirror and skip it (no echo loop).
	msg.Set("author_id", "slack:"+d.SlackUserID)
	msg.Set("body", d.Text)
	if err := c.app.Save(msg); err != nil {
		c.app.Logger().Error("slack: relay incoming save", "err", err)
		return
	}
	c.app.Logger().Info("slack: relayed slack -> team", "team", d.TeamID, "channel", mapping.GetString("channel_id"))
}

// ── @hanzo agent front-door ─────────────────────────────────────────────────

// handleAgent answers an @mention / DM: it resolves the workspace bot token
// (the reply SINK) and posts the agent's answer — or the account-link prompt —
// into the SAME Slack thread. The agent brain (agentReply) is shared with the
// slash-command path. Runs async after the webhook's fast 200 ack.
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
	reply := c.agentReply(ctx, d.TeamID, d.SlackUserID, d.Text)
	if reply == "" {
		return
	}
	if err := postThreadMessage(ctx, tok, d.SlackChannelID, d.ThreadTS, reply); err != nil {
		c.app.Logger().Warn("slack: agent thread post", "team", d.TeamID, "err", err)
	}
}

// ── slash command (/hanzo) ──────────────────────────────────────────────────

// commands handles a Slack slash command (application/x-www-form-urlencoded). It
// verifies the SAME HMAC signature, acks within Slack's 3s budget (empty 200),
// and posts the AI answer asynchronously via the command's response_url.
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
	team, channel, user, text, responseURL, ok := parseSlashCommand(raw)
	if !ok {
		return re.BadRequestError("missing team_id or user_id", nil)
	}
	go c.handleAgentSlash(routeDecision{
		Kind: routeAgent, TeamID: team, SlackChannelID: channel, SlackUserID: user, Text: text,
	}, responseURL)
	return re.NoContent(http.StatusOK)
}

// parseSlashCommand extracts the fields the slash command carries. Pure. ok is
// false when the identifying fields (team_id, user_id) are absent.
func parseSlashCommand(raw []byte) (team, channel, user, text, responseURL string, ok bool) {
	form, err := url.ParseQuery(string(raw))
	if err != nil {
		return "", "", "", "", "", false
	}
	team = form.Get("team_id")
	channel = form.Get("channel_id")
	user = form.Get("user_id")
	text = strings.TrimSpace(form.Get("text"))
	responseURL = form.Get("response_url")
	ok = team != "" && user != ""
	return
}

// handleAgentSlash runs the agent for a slash command and delivers the reply via
// the response_url (no thread; the command has no message to thread under).
func (c *controller) handleAgentSlash(d routeDecision, responseURL string) {
	ctx, cancel := ctxTimeout(agentTimeout)
	defer cancel()
	if _, _, ok := c.installOrg(d.TeamID); !ok {
		_ = postResponseURL(ctx, responseURL, "This Slack workspace isn't connected to Hanzo yet.")
		return
	}
	reply := c.agentReply(ctx, d.TeamID, d.SlackUserID, d.Text)
	if reply == "" {
		return
	}
	if err := postResponseURL(ctx, responseURL, reply); err != nil {
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
	// Skip messages that originated FROM Slack (our own mirror) — echo-loop guard.
	if strings.HasPrefix(author, "slack:") {
		return e.Next()
	}
	channelID := rec.GetString("channel_id")
	mapping, _ := c.app.FindFirstRecordByFilter("slack_mappings",
		"channel_id = {:c} && enabled = true", dbx.Params{"c": channelID})
	if mapping == nil {
		return e.Next() // channel not mapped
	}
	ws, _ := c.app.FindFirstRecordByFilter("workspaces", "id = {:id}",
		dbx.Params{"id": mapping.GetString("workspace_id")})
	if ws == nil {
		return e.Next()
	}
	// The org is the workspace's TENANT (owner_org) — the same value the token
	// was stored under at OAuth time.
	org := wsauth.WorkspaceOrg(ws)
	if org == "" {
		c.app.Logger().Warn("slack: outgoing skipped, workspace has no owner_org", "workspace", ws.Id)
		return e.Next()
	}
	teamID := mapping.GetString("slack_team_id")
	body := rec.GetString("body")
	// Fire-and-forget so the write path never blocks on Slack latency.
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

// ── app OAuth (admin) ───────────────────────────────────────────────────────

func (c *controller) connect(re *core.RequestEvent) error {
	if !c.cfg.slackConfigured() {
		return re.JSON(http.StatusServiceUnavailable, map[string]string{"error": "slack not configured"})
	}
	a, err := wsauth.AssertAdmin(c.app, re)
	if err != nil {
		return err
	}
	scopes := re.Request.URL.Query().Get("scopes")
	if scopes == "" {
		// chat:write to reply; app_mentions:read + im:history to receive the
		// agent triggers; commands for the slash command.
		scopes = "chat:write,channels:history,channels:read,app_mentions:read,im:history,commands"
	}
	state, err := signOAuthState(c.cfg.secret, a.Workspace.GetString("uuid"), 0)
	if err != nil {
		return re.InternalServerError("oauth state", err)
	}
	u, _ := url.Parse("https://slack.com/oauth/v2/authorize")
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
	code := re.Request.URL.Query().Get("code")
	state := re.Request.URL.Query().Get("state")
	if code == "" || state == "" {
		return re.BadRequestError("missing code or state", nil)
	}
	st, ok := verifyOAuthState(c.cfg.secret, state, 0)
	if !ok {
		return re.BadRequestError("invalid or expired oauth state", nil)
	}
	if c.usedStates.seenAndAdd(st.Nonce, time.Time{}) {
		return re.BadRequestError("oauth state already used", nil)
	}
	ws, _ := c.app.FindFirstRecordByFilter("workspaces", "uuid = {:u}", dbx.Params{"u": st.Workspace})
	if ws == nil {
		return re.BadRequestError("workspace not found", nil)
	}
	org := wsauth.WorkspaceOrg(ws)
	if org == "" {
		return re.InternalServerError("workspace has no owner_org", nil)
	}
	tok, err := exchangeCode(re.Request.Context(), c.cfg.slackClientID, c.cfg.slackSecret, code, c.cfg.slackRedirect)
	if err != nil {
		c.app.Logger().Error("slack: oauth exchange", "err", err)
		return re.BadRequestError("oauth failed", nil)
	}
	if err := c.tokens.save(re.Request.Context(), org, tok); err != nil {
		c.app.Logger().Error("slack: token save", "err", err) // never logs the token
		return re.InternalServerError("token store failed", nil)
	}
	// Record team -> workspace + owner_org so the agent front-door can resolve the
	// org for an @mention/DM/slash without a channel mapping. Non-fatal: the
	// connection (token) already succeeded; the relay path does not need it.
	if err := c.upsertInstall(tok.TeamID, ws.Id, org); err != nil {
		c.app.Logger().Error("slack: install record", "team", tok.TeamID, "err", err)
	}
	c.app.Logger().Info("slack: workspace connected", "workspace", ws.Id, "team", tok.TeamID)
	return re.JSON(http.StatusOK, map[string]string{"status": "connected", "team": tok.TeamName})
}

// ── per-user account link (hanzo.id OIDC, on-behalf-of) ─────────────────────

// linkedHTML is the terse success page shown after a user links their Hanzo
// account. Self-contained (no external assets) so it renders in any browser.
const linkedHTML = `<!doctype html><meta charset="utf-8"><title>Hanzo connected</title>` +
	`<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;text-align:center">` +
	`<h1>Hanzo connected</h1><p>Your Hanzo account is linked. Return to Slack and mention <b>@hanzo</b>.</p></body>`

// link begins the per-user hanzo.id OIDC link. It is reached from a
// server-minted prompt URL carrying a signed (team,user) state (which was itself
// gated by a verified Slack signature), so it trusts the bound identity and
// redirects the browser to IAM's authorize endpoint with the SAME state.
func (c *controller) link(re *core.RequestEvent) error {
	if !c.cfg.iamConfigured() {
		return re.JSON(http.StatusServiceUnavailable, map[string]string{"error": "account linking not configured"})
	}
	state := re.Request.URL.Query().Get("state")
	if _, _, _, ok := verifyLinkState(c.cfg.secret, state, 0); !ok {
		return re.BadRequestError("invalid or expired link", nil)
	}
	return re.Redirect(http.StatusFound, c.oidc.authorizeURL(state))
}

// linkCallback completes the per-user link: it verifies the signed, single-use
// state, exchanges the IAM code, resolves the account identity, stores the
// refresh token KMS-encrypted (under the workspace tenant org) and records the
// (team,user)->account mapping. Never logs a token.
func (c *controller) linkCallback(re *core.RequestEvent) error {
	if !c.cfg.iamConfigured() {
		return re.JSON(http.StatusServiceUnavailable, map[string]string{"error": "account linking not configured"})
	}
	q := re.Request.URL.Query()
	if e := q.Get("error"); e != "" {
		return re.BadRequestError("authorization declined", nil)
	}
	code := q.Get("code")
	state := q.Get("state")
	if code == "" || state == "" {
		return re.BadRequestError("missing code or state", nil)
	}
	teamID, slackUserID, nonce, ok := verifyLinkState(c.cfg.secret, state, 0)
	if !ok {
		return re.BadRequestError("invalid or expired link", nil)
	}
	// Single-use: a valid link state may be redeemed exactly once (defense in
	// depth atop IAM's own single-use authorization code).
	if c.usedStates.seenAndAdd(nonce, time.Time{}) {
		return re.BadRequestError("link already used", nil)
	}
	// The team must be installed so we know which tenant org to store the user
	// token under (KMS per-org RBAC).
	org, _, iok := c.installOrg(teamID)
	if !iok {
		return re.BadRequestError("workspace not connected", nil)
	}
	ctx := re.Request.Context()
	ts, err := c.oidc.exchangeCode(ctx, code)
	if err != nil {
		c.app.Logger().Error("slack: link code exchange", "team", teamID, "err", err)
		return re.BadRequestError("link failed", nil)
	}
	if ts.Refresh == "" {
		// Without a refresh token we cannot mint access tokens later; refuse
		// rather than store a dead link (IAM must grant offline_access).
		return re.InternalServerError("link incomplete: no refresh token", nil)
	}
	sub, userOrg, err := c.oidc.identity(ctx, ts.Access)
	if err != nil {
		c.app.Logger().Error("slack: link identity", "team", teamID, "err", err)
		return re.InternalServerError("link identity", nil)
	}
	// Store the token FIRST, then the pointer row: a present link row therefore
	// always implies a present token. A crash between them leaves only a KMS
	// secret (harmless; overwritten on retry).
	if err := c.userTokens.save(ctx, org, teamID, slackUserID, userToken{RefreshToken: ts.Refresh, Subject: sub, Org: userOrg}); err != nil {
		c.app.Logger().Error("slack: user token save", "team", teamID, "err", err) // never logs the token
		return re.InternalServerError("token store failed", nil)
	}
	if err := c.saveUserLink(teamID, slackUserID, sub, userOrg); err != nil {
		c.app.Logger().Error("slack: user link save", "team", teamID, "err", err)
		return re.InternalServerError("link store failed", nil)
	}
	c.app.Logger().Info("slack: user linked", "team", teamID, "slackUser", slackUserID) // no token
	return re.HTML(http.StatusOK, linkedHTML)
}

// ── channel mapping (admin, tenant-scoped) ──────────────────────────────────

type mapReq struct {
	SlackTeamID      string `json:"slackTeamId"`
	SlackChannelID   string `json:"slackChannelId"`
	SlackChannelName string `json:"slackChannelName"`
	ChannelID        string `json:"channelId"` // the Hanzo channels.id
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
	// OWNERSHIP PROOF: a successful KMS token fetch under (org, teamId) proves
	// this workspace connected that team — blocks cross-tenant hijack of inbound.
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
