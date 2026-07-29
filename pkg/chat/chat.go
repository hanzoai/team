// Package chat is the clean REST surface for chunter (channels + messages +
// presence). It is orthogonal to the transactor (ZAP): the SPA uses the
// transactor, but first-party clients (mobile, bots, integrations) get a plain
// /v1/chat REST API over the SAME `channels`/`messages`/`presence` collections.
//
//	GET    /v1/chat/channels?workspace=<uuid|slug>       — list channels
//	POST   /v1/chat/channels                             — create a channel
//	GET    /v1/chat/channels/{id}/messages?before=&limit= — paginated history
//	POST   /v1/chat/channels/{id}/messages              — post a message
//	PATCH  /v1/chat/messages/{id}                        — edit (author only)
//	DELETE /v1/chat/messages/{id}                        — delete (author only)
//	POST   /v1/chat/presence                             — heartbeat
//
// Every read/write is workspace-member-scoped (the caller must be a member of
// the channel's workspace) and enforced HERE in the handler — independent of
// the collection ViewRule so the contract is explicit at the API boundary.
// Realtime: clients subscribe via /v1/subscribe?collection=messages (member-
// scoped WS); this REST layer is the request/response half. Structured so it can
// later ride the cloud ZAP duplex without changing the handler logic.
package chat

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/tools/hook"
	"github.com/hanzoai/dbx"
	"github.com/hanzoai/team/pkg/wsauth"
)

// Register binds /v1/chat/* on the app.
func Register(app core.App) {
	c := &api{app: app}
	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			e.Router.GET("/v1/chat/channels", c.listChannels)
			e.Router.POST("/v1/chat/channels", c.createChannel)
			e.Router.GET("/v1/chat/channels/{id}/messages", c.listMessages)
			e.Router.POST("/v1/chat/channels/{id}/messages", c.postMessage)
			e.Router.PATCH("/v1/chat/messages/{id}", c.editMessage)
			e.Router.DELETE("/v1/chat/messages/{id}", c.deleteMessage)
			e.Router.POST("/v1/chat/presence", c.presence)
			return e.Next()
		},
	})
}

type api struct{ app core.App }

const maxPage = 200

// ── channels ────────────────────────────────────────────────────────────────

func (c *api) listChannels(re *core.RequestEvent) error {
	if re.Auth == nil {
		return re.UnauthorizedError("auth required", nil)
	}
	org := wsauth.CallerOrg(re)
	if org == "" {
		return re.ForbiddenError("no org context", nil)
	}
	ws, err := wsauth.ResolveWorkspace(c.app, re, wsauth.CallerUID(re), org)
	if err != nil {
		return err
	}
	if wsauth.Member(c.app, ws.Id, wsauth.CallerUID(re)) == nil {
		return re.ForbiddenError("not a member", nil)
	}
	rows, e := c.app.FindRecordsByFilter("channels",
		"workspace_id = {:w}", "name", 500, 0, dbx.Params{"w": ws.Id})
	if e != nil {
		return re.InternalServerError("list channels", e)
	}
	out := make([]map[string]any, 0, len(rows))
	for _, r := range rows {
		out = append(out, channelView(r))
	}
	return re.JSON(http.StatusOK, map[string]any{"channels": out})
}

type channelReq struct {
	Name  string `json:"name"`
	Topic string `json:"topic"`
	Kind  string `json:"kind"`
}

func (c *api) createChannel(re *core.RequestEvent) error {
	if re.Auth == nil {
		return re.UnauthorizedError("auth required", nil)
	}
	org := wsauth.CallerOrg(re)
	if org == "" {
		return re.ForbiddenError("no org context", nil)
	}
	ws, err := wsauth.ResolveWorkspace(c.app, re, wsauth.CallerUID(re), org)
	if err != nil {
		return err
	}
	if wsauth.Member(c.app, ws.Id, wsauth.CallerUID(re)) == nil {
		return re.ForbiddenError("not a member", nil)
	}
	var req channelReq
	if e := re.BindBody(&req); e != nil || strings.TrimSpace(req.Name) == "" {
		return re.BadRequestError("name required", nil)
	}
	kind := req.Kind
	if kind != "public" && kind != "private" && kind != "dm" {
		kind = "public"
	}
	coll, e := c.app.FindCollectionByNameOrId("channels")
	if e != nil {
		return re.InternalServerError("channels collection", e)
	}
	rec := core.NewRecord(coll)
	rec.Set("workspace_id", ws.Id)
	rec.Set("name", strings.TrimSpace(req.Name))
	rec.Set("topic", req.Topic)
	rec.Set("kind", kind)
	rec.Set("created_by", wsauth.CallerUID(re))
	if e := c.app.Save(rec); e != nil {
		return re.BadRequestError("create channel: "+e.Error(), nil)
	}
	return re.JSON(http.StatusCreated, channelView(rec))
}

// ── messages ────────────────────────────────────────────────────────────────

func (c *api) listMessages(re *core.RequestEvent) error {
	ch, err := c.channelForMember(re)
	if err != nil {
		return err
	}
	limit := clampLimit(re.Request.URL.Query().Get("limit"))
	// Keyset pagination on created_at (the covered index is (channel_id, created_at)).
	filter := "channel_id = {:c}"
	params := dbx.Params{"c": ch.Id}
	if before := strings.TrimSpace(re.Request.URL.Query().Get("before")); before != "" {
		filter += " && created_at < {:b}"
		params["b"] = before
	}
	rows, e := c.app.FindRecordsByFilter("messages", filter, "-created_at", limit, 0, params)
	if e != nil {
		return re.InternalServerError("list messages", e)
	}
	out := make([]map[string]any, 0, len(rows))
	for _, r := range rows {
		out = append(out, messageView(r))
	}
	return re.JSON(http.StatusOK, map[string]any{"messages": out})
}

type messageReq struct {
	Body     string `json:"body"`
	ParentID string `json:"parentId"`
}

func (c *api) postMessage(re *core.RequestEvent) error {
	ch, err := c.channelForMember(re)
	if err != nil {
		return err
	}
	var req messageReq
	if e := re.BindBody(&req); e != nil || strings.TrimSpace(req.Body) == "" {
		return re.BadRequestError("body required", nil)
	}
	coll, e := c.app.FindCollectionByNameOrId("messages")
	if e != nil {
		return re.InternalServerError("messages collection", e)
	}
	rec := core.NewRecord(coll)
	rec.Set("channel_id", ch.Id)
	rec.Set("author_id", wsauth.CallerUID(re))
	rec.Set("body", req.Body)
	if req.ParentID != "" {
		rec.Set("parent_id", req.ParentID)
	}
	if e := c.app.Save(rec); e != nil {
		return re.BadRequestError("post message: "+e.Error(), nil)
	}
	// The OnRecordAfterCreateSuccess hook fans this out via /v1/subscribe and
	// mirrors it to Slack (if the channel is mapped) — no coupling here.
	return re.JSON(http.StatusCreated, messageView(rec))
}

func (c *api) editMessage(re *core.RequestEvent) error {
	msg, err := c.messageForAuthor(re)
	if err != nil {
		return err
	}
	var req messageReq
	if e := re.BindBody(&req); e != nil || strings.TrimSpace(req.Body) == "" {
		return re.BadRequestError("body required", nil)
	}
	msg.Set("body", req.Body)
	if e := c.app.Save(msg); e != nil {
		return re.InternalServerError("edit message", e)
	}
	return re.JSON(http.StatusOK, messageView(msg))
}

func (c *api) deleteMessage(re *core.RequestEvent) error {
	msg, err := c.messageForAuthor(re)
	if err != nil {
		return err
	}
	if e := c.app.Delete(msg); e != nil {
		return re.InternalServerError("delete message", e)
	}
	return re.JSON(http.StatusOK, map[string]any{"status": "deleted"})
}

// ── presence ────────────────────────────────────────────────────────────────

type presenceReq struct {
	Status string `json:"status"`
}

func (c *api) presence(re *core.RequestEvent) error {
	if re.Auth == nil {
		return re.UnauthorizedError("auth required", nil)
	}
	org := wsauth.CallerOrg(re)
	if org == "" {
		return re.ForbiddenError("no org context", nil)
	}
	ws, err := wsauth.ResolveWorkspace(c.app, re, wsauth.CallerUID(re), org)
	if err != nil {
		return err
	}
	if wsauth.Member(c.app, ws.Id, wsauth.CallerUID(re)) == nil {
		return re.ForbiddenError("not a member", nil)
	}
	var req presenceReq
	_ = re.BindBody(&req)
	status := req.Status
	if status != "online" && status != "away" && status != "offline" {
		status = "online"
	}
	existing, _ := c.app.FindFirstRecordByFilter("presence",
		"workspace_id = {:w} && user_id = {:u}", dbx.Params{"w": ws.Id, "u": wsauth.CallerUID(re)})
	if existing != nil {
		existing.Set("status", status)
		if e := c.app.Save(existing); e != nil {
			return re.InternalServerError("presence", e)
		}
		return re.JSON(http.StatusOK, map[string]any{"status": status})
	}
	coll, e := c.app.FindCollectionByNameOrId("presence")
	if e != nil {
		return re.InternalServerError("presence collection", e)
	}
	rec := core.NewRecord(coll)
	rec.Set("workspace_id", ws.Id)
	rec.Set("user_id", wsauth.CallerUID(re))
	rec.Set("status", status)
	if e := c.app.Save(rec); e != nil {
		return re.InternalServerError("presence", e)
	}
	return re.JSON(http.StatusOK, map[string]any{"status": status})
}

// ── scoping helpers ─────────────────────────────────────────────────────────

// channelForMember loads the {id} channel and requires the caller be a member of
// its workspace. The single gate for message reads/writes.
func (c *api) channelForMember(re *core.RequestEvent) (*core.Record, error) {
	if re.Auth == nil {
		return nil, re.UnauthorizedError("auth required", nil)
	}
	id := re.Request.PathValue("id")
	ch, _ := c.app.FindFirstRecordByFilter("channels", "id = {:id}", dbx.Params{"id": id})
	if ch == nil {
		return nil, re.NotFoundError("channel not found", nil)
	}
	if wsauth.Member(c.app, ch.GetString("workspace_id"), wsauth.CallerUID(re)) == nil {
		return nil, re.ForbiddenError("not a member of this channel's workspace", nil)
	}
	return ch, nil
}

// messageForAuthor loads the {id} message and requires the caller be BOTH a
// member of its channel's workspace AND the message author (edit/delete).
func (c *api) messageForAuthor(re *core.RequestEvent) (*core.Record, error) {
	if re.Auth == nil {
		return nil, re.UnauthorizedError("auth required", nil)
	}
	id := re.Request.PathValue("id")
	msg, _ := c.app.FindFirstRecordByFilter("messages", "id = {:id}", dbx.Params{"id": id})
	if msg == nil {
		return nil, re.NotFoundError("message not found", nil)
	}
	ch, _ := c.app.FindFirstRecordByFilter("channels", "id = {:id}",
		dbx.Params{"id": msg.GetString("channel_id")})
	if ch == nil {
		return nil, re.NotFoundError("channel not found", nil)
	}
	if wsauth.Member(c.app, ch.GetString("workspace_id"), wsauth.CallerUID(re)) == nil {
		return nil, re.ForbiddenError("not a member", nil)
	}
	if msg.GetString("author_id") != wsauth.CallerUID(re) {
		return nil, re.ForbiddenError("only the author may modify this message", nil)
	}
	return msg, nil
}

// ── views ───────────────────────────────────────────────────────────────────

func channelView(r *core.Record) map[string]any {
	return map[string]any{
		"id":        r.Id,
		"name":      r.GetString("name"),
		"topic":     r.GetString("topic"),
		"kind":      r.GetString("kind"),
		"createdBy": r.GetString("created_by"),
		"createdAt": r.GetString("created_at"),
		"updatedAt": r.GetString("updated_at"),
	}
}

func messageView(r *core.Record) map[string]any {
	return map[string]any{
		"id":        r.Id,
		"channelId": r.GetString("channel_id"),
		"authorId":  r.GetString("author_id"),
		"body":      r.GetString("body"),
		"parentId":  r.GetString("parent_id"),
		"createdAt": r.GetString("created_at"),
		"updatedAt": r.GetString("updated_at"),
	}
}

func clampLimit(s string) int {
	n, err := strconv.Atoi(s)
	if err != nil || n <= 0 {
		return 50
	}
	if n > maxPage {
		return maxPage
	}
	return n
}
