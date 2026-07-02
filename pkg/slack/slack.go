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

// Register binds the Slack surface and the outgoing relay hook.
//
//	POST /v1/slack/events    — Slack Events API webhook (HMAC-verified, INCOMING)
//	GET  /v1/slack/connect   — begin OAuth (admin); returns the authorize URL
//	GET  /v1/slack/oauth     — OAuth callback (authorized by signed `state`)
//	POST /v1/slack/mappings  — map a Hanzo channel <-> Slack channel (admin)
//	GET  /v1/slack/mappings  — list this workspace's mappings (admin)
//
// Missing Slack app creds (SLACK_*) is NON-FATAL: the webhook/connect/oauth
// endpoints 503 cleanly (the rest of team-go keeps serving) instead of the TS
// pod's throw-on-startup. Register only when at least KMS is reachable.
func Register(app core.App) {
	cfg := loadConfig()
	c := &controller{
		app:        app,
		cfg:        cfg,
		tokens:     newTokenStore(cfg.kmsEndpoint, cfg.kmsBearer),
		seenEvents: newSeenSet(time.Duration(maxTimestampSkewSec) * time.Second),
		usedStates: newSeenSet(time.Duration(oauthStateTTLSec) * time.Second),
	}
	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			e.Router.POST("/v1/slack/events", c.events)
			e.Router.GET("/v1/slack/connect", c.connect)
			e.Router.GET("/v1/slack/oauth", c.oauth)
			e.Router.POST("/v1/slack/mappings", c.mapChannel)
			e.Router.GET("/v1/slack/mappings", c.listMappings)
			return e.Next()
		},
	})
	// Outgoing relay: a new message in a mapped channel mirrors to Slack. Bound
	// on the same success hook /v1/subscribe uses, so it never fires on a failed
	// write. Bot-authored (mirrored-in) messages are skipped to break the loop.
	app.OnRecordAfterCreateSuccess("messages").BindFunc(c.onMessageCreated)
}

type config struct {
	secret         string // SERVER_SECRET — signs OAuth state
	slackClientID  string
	slackSecret    string
	slackSigning   string
	slackRedirect  string
	kmsEndpoint    string
	kmsBearer      string
	relayBotSocial string // synthetic social id messages relayed from Slack carry
}

func loadConfig() config {
	return config{
		secret:        env("SERVER_SECRET", "secret"),
		slackClientID: os.Getenv("SLACK_CLIENT_ID"),
		slackSecret:   os.Getenv("SLACK_CLIENT_SECRET"),
		slackSigning:  os.Getenv("SLACK_SIGNING_SECRET"),
		slackRedirect: os.Getenv("SLACK_REDIRECT_URI"),
		kmsEndpoint:   env("KMS_ENDPOINT", "https://kms.hanzo.ai"),
		kmsBearer:     os.Getenv("HANZO_API_KEY"),
	}
}

func (c config) slackConfigured() bool {
	return c.slackClientID != "" && c.slackSecret != "" && c.slackSigning != "" && c.slackRedirect != ""
}

type controller struct {
	app        core.App
	cfg        config
	tokens     *tokenStore
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
		// Ack Slack immediately (3s budget); relay in the background.
		go c.relayIncoming(decision)
		return re.NoContent(http.StatusOK)
	case routeAck:
		return re.NoContent(http.StatusOK)
	default:
		return re.BadRequestError("unrecognized event", nil)
	}
}

// relayIncoming mirrors a verified Slack message into the mapped Hanzo channel,
// posting as the workspace's bot so authorship is attributed to a bot member.
// Idempotency is the caller's seen-set on the Slack event_id.
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
	// Resolve the org for the mapping's workspace to fetch the Slack token.
	ws, _ := c.app.FindFirstRecordByFilter("workspaces", "id = {:id}",
		dbx.Params{"id": mapping.GetString("workspace_id")})
	if ws == nil {
		return e.Next()
	}
	org := ws.GetString("owner_org")
	if org == "" {
		org = ws.GetString("owner")
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

// ── OAuth (admin) ───────────────────────────────────────────────────────────

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
		scopes = "chat:write,channels:history,channels:read"
	}
	// State binds the workspace UUID (not the record id) so the callback resolves
	// the same tenant. Signed + single-use (nonce enforced in oauth()).
	state := signOAuthState(c.cfg.secret, a.Workspace.GetString("uuid"), 0)
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
	// Verify signed state (CSRF + workspace binding). No JWT here — the state MAC
	// is the proof an admin started this flow.
	st, ok := verifyOAuthState(c.cfg.secret, state, 0)
	if !ok {
		return re.BadRequestError("invalid or expired oauth state", nil)
	}
	// Single-use: a valid state may be redeemed exactly once within its TTL
	// (defense in depth on top of Slack's single-use `code`).
	if c.usedStates.seenAndAdd(st.Nonce, time.Time{}) {
		return re.BadRequestError("oauth state already used", nil)
	}
	// Resolve the workspace + its org from the bound UUID.
	ws, _ := c.app.FindFirstRecordByFilter("workspaces", "uuid = {:u}", dbx.Params{"u": st.Workspace})
	if ws == nil {
		return re.BadRequestError("workspace not found", nil)
	}
	org := ws.GetString("owner_org")
	if org == "" {
		org = ws.GetString("owner")
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
	c.app.Logger().Info("slack: workspace connected", "workspace", ws.Id, "team", tok.TeamID)
	return re.JSON(http.StatusOK, map[string]string{"status": "connected", "team": tok.TeamName})
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
	// OWNERSHIP PROOF: the workspace may only map a Slack team it actually
	// connected. A successful KMS token fetch under (org, teamId) is proof of
	// ownership — this blocks a workspace admin from hijacking inbound messages
	// of a team they do not own (cross-tenant).
	owned, ok, terr := c.tokens.get(re.Request.Context(), a.Org, req.SlackTeamID)
	if terr != nil {
		return re.InternalServerError("ownership check", terr)
	}
	if !ok || owned.TeamID != req.SlackTeamID {
		return re.ForbiddenError("slack team not connected to this workspace", nil)
	}
	// The Hanzo channel must belong to the caller's workspace (no cross-ws map).
	ch, _ := c.app.FindFirstRecordByFilter("channels",
		"id = {:c} && workspace_id = {:w}", dbx.Params{"c": req.ChannelID, "w": a.Workspace.Id})
	if ch == nil {
		return re.NotFoundError("channel not in workspace", nil)
	}
	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}
	// Upsert (one mapping per (team, slack channel)).
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
