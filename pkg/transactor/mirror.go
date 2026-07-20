package transactor

import (
	"encoding/json"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/dbx"
)

// backfillMarker is a per-workspace sentinel doc written after the one-time
// historical projection. Its own synthetic class is never a findAll candidate,
// so it is invisible to the SPA. Gating on it (not on Person count) guarantees
// backfill runs exactly once even if a create/update hook already projected a
// doc before the first connect.
const backfillMarker = "team:marker:Backfill"

// RegisterMirror binds the ONE plane bridge: every create/update/delete to the
// Base write-plane collections (members/channels/messages) is projected into the
// per-workspace transactor store the front SPA reads, and broadcast live. This is
// what makes REST-chat, bots-as-members and Slack-relayed messages actually
// appear in the workbench — the SPA never reads the Base collections directly.
//
// Direction is one-way (Base → transactor). SPA-native writes already land in the
// store via the tx path, so both sources converge in the one plane the front
// queries. Idempotent: every projection is keyed by a deterministic _id, and an
// existing doc is UPDATED (never full-replaced), so SPA-owned fields survive.
func RegisterMirror(app core.App) {
	m := &mirror{app: app}
	app.OnRecordAfterCreateSuccess("members").BindFunc(m.member)
	app.OnRecordAfterUpdateSuccess("members").BindFunc(m.member)
	app.OnRecordAfterCreateSuccess("channels").BindFunc(m.channel)
	app.OnRecordAfterUpdateSuccess("channels").BindFunc(m.channel)
	app.OnRecordAfterCreateSuccess("messages").BindFunc(m.message)
	app.OnRecordAfterUpdateSuccess("messages").BindFunc(m.message)
	app.OnRecordAfterDeleteSuccess("messages").BindFunc(m.messageDeleted)
}

type mirror struct{ app core.App }

// member → contact:class:Person (+ Employee mixin + social identity). Humans are
// always active Employees; a bot's Employee.active tracks its member.active so a
// deactivated bot drops out of the Team list while its authorship survives. An
// existing Person is updated in place (never full-replaced).
func (m *mirror) member(e *core.RecordEvent) error {
	r := e.Record
	if r == nil {
		return e.Next()
	}
	wsUUID, org, ok := m.wsCtx(r.GetString("workspace_id"))
	uid := r.GetString("user_id")
	if ok && uid != "" {
		isBot := r.GetBool("is_bot")
		Apply(org, wsUUID, acctSystem, MemberTxes(Member{
			UserID: uid,
			Name:   pick(r.GetString("display_name"), uid),
			Role:   r.GetString("role"),
			IsBot:  isBot,
			Active: !isBot || r.GetBool("active"),
		}, hasDoc(org, wsUUID, PersonRef(uid)))...)
	}
	return e.Next()
}

// channel → chunter:class:Channel (a space), members = the workspace roster so a
// public channel is visible to everyone.
func (m *mirror) channel(e *core.RecordEvent) error {
	r := e.Record
	if r == nil {
		return e.Next()
	}
	if wsUUID, org, ok := m.wsCtx(r.GetString("workspace_id")); ok {
		Apply(org, wsUUID, acctSystem, ChannelTx(Channel{
			ID:        r.Id,
			Name:      r.GetString("name"),
			Topic:     r.GetString("topic"),
			Private:   r.GetString("kind") == "private",
			CreatedBy: r.GetString("created_by"),
			Members:   m.memberIDs(r.GetString("workspace_id")),
		}, hasDoc(org, wsUUID, ChannelRef(r.Id))))
	}
	return e.Next()
}

// message → chunter:class:ChatMessage (attached to the channel space).
func (m *mirror) message(e *core.RecordEvent) error {
	r := e.Record
	if r == nil {
		return e.Next()
	}
	chID := r.GetString("channel_id")
	wsUUID, org, ok := m.channelCtx(chID)
	if !ok {
		return e.Next()
	}
	Apply(org, wsUUID, r.GetString("author_id"), MessageTx(Message{
		ID:        r.Id,
		ChannelID: chID,
		AuthorID:  r.GetString("author_id"),
		Body:      r.GetString("body"),
		CreatedAt: millis(r, "created_at"),
	}, hasDoc(org, wsUUID, MessageRef(r.Id))))
	return e.Next()
}

// messageDeleted → TxRemoveDoc so a deleted Slack/REST message leaves the plane.
func (m *mirror) messageDeleted(e *core.RecordEvent) error {
	r := e.Record
	if r == nil {
		return e.Next()
	}
	chID := r.GetString("channel_id")
	if wsUUID, org, ok := m.channelCtx(chID); ok {
		Apply(org, wsUUID, acctSystem, RemoveMessageTx(r.Id, chID))
	}
	return e.Next()
}

// ── resolution ───────────────────────────────────────────────────────────────

// wsCtx resolves a Base workspace record id to the (uuid, owner_org) the store is
// keyed by. Both must be present — owner_org is the tenant, uuid is the store
// path — or the projection is skipped (never mis-file another tenant's data).
func (m *mirror) wsCtx(workspaceRecordID string) (wsUUID, org string, ok bool) {
	if workspaceRecordID == "" {
		return "", "", false
	}
	ws, err := m.app.FindFirstRecordByFilter("workspaces", "id = {:id}", dbx.Params{"id": workspaceRecordID})
	if err != nil || ws == nil {
		return "", "", false
	}
	u, o := ws.GetString("uuid"), ws.GetString("owner_org")
	if u == "" || o == "" {
		return "", "", false
	}
	return u, o, true
}

// channelCtx resolves a message's channel_id to its workspace (uuid, owner_org).
func (m *mirror) channelCtx(channelID string) (wsUUID, org string, ok bool) {
	if channelID == "" {
		return "", "", false
	}
	ch, err := m.app.FindFirstRecordByFilter("channels", "id = {:id}", dbx.Params{"id": channelID})
	if err != nil || ch == nil {
		return "", "", false
	}
	return m.wsCtx(ch.GetString("workspace_id"))
}

// memberIDs returns the account uuids of a workspace's members.
func (m *mirror) memberIDs(workspaceRecordID string) []string {
	rows, _ := m.app.FindRecordsByFilter("members", "workspace_id = {:w}", "", 1000, 0, dbx.Params{"w": workspaceRecordID})
	out := make([]string, 0, len(rows))
	for _, r := range rows {
		if u := r.GetString("user_id"); u != "" {
			out = append(out, u)
		}
	}
	return out
}

// ── first-connect backfill ───────────────────────────────────────────────────

// backfillFromBase projects a workspace's authoritative Base rows into the store
// on connect, so a user always sees the full team directory + existing
// channels/history — including rows written before the mirror hooks ran.
//
// The member ROSTER is reconciled on EVERY connect (idempotent): members are
// added continuously — bot sync, invites — including while the mirror wasn't
// running (an image without the bridge) or after the one-time history backfill.
// Gating the roster on the sentinel would strand every member added after the
// first connect (e.g. bots synced post-sentinel would never become Employees),
// which is exactly the failure this reconcile-don't-assume-empty pass fixes.
//
// The expensive HISTORY (channels + recent messages) is projected EXACTLY once,
// gated on a per-workspace sentinel; the create/update hooks keep it current
// thereafter.
func (s *session) backfillFromBase() {
	app := s.server.app
	if app == nil {
		return
	}
	ws, err := app.FindFirstRecordByFilter("workspaces", "uuid = {:u}", dbx.Params{"u": s.workspace})
	if err != nil || ws == nil {
		return
	}
	wsID := ws.Id

	// Roster — EVERY connect, idempotent (exists → update name + refresh Employee
	// mixin; absent → create Person + Employee + social identity).
	memberIDs := []string{}
	members, _ := app.FindRecordsByFilter("members", "workspace_id = {:w}", "", 1000, 0, dbx.Params{"w": wsID})
	for _, mem := range members {
		uid := mem.GetString("user_id")
		if uid == "" {
			continue
		}
		memberIDs = append(memberIDs, uid)
		isBot := mem.GetBool("is_bot")
		s.applyLocal(MemberTxes(Member{
			UserID: uid,
			Name:   pick(mem.GetString("display_name"), uid),
			Role:   mem.GetString("role"),
			IsBot:  isBot,
			Active: !isBot || mem.GetBool("active"),
		}, s.exists(PersonRef(uid)))...)
	}

	// History — ONCE per workspace (sentinel-gated); the roster above already ran.
	if done, _ := s.store.get(s.org, s.workspace, backfillMarker); done != nil {
		return
	}

	channels, _ := app.FindRecordsByFilter("channels", "workspace_id = {:w}", "", 1000, 0, dbx.Params{"w": wsID})
	for _, c := range channels {
		s.applyLocal(ChannelTx(Channel{
			ID: c.Id, Name: c.GetString("name"), Topic: c.GetString("topic"),
			Private: c.GetString("kind") == "private", CreatedBy: c.GetString("created_by"), Members: memberIDs,
		}, s.exists(ChannelRef(c.Id))))
		// Newest 200 (not oldest) — the recent history is what users expect.
		msgs, _ := app.FindRecordsByFilter("messages", "channel_id = {:c}", "-created_at", 200, 0, dbx.Params{"c": c.Id})
		for _, mm := range msgs {
			s.applyLocal(MessageTx(Message{
				ID: mm.Id, ChannelID: c.Id, AuthorID: mm.GetString("author_id"),
				Body: mm.GetString("body"), CreatedAt: millis(mm, "created_at"),
			}, s.exists(MessageRef(mm.Id))))
		}
	}

	// Sentinel: backfill is complete for this workspace.
	_ = s.store.put(s.org, s.workspace, map[string]any{
		"_id": backfillMarker, "_class": "team:class:BackfillMarker", "space": "core:space:Workspace",
	})
}

// exists reports whether a doc id is already in this session's workspace store.
func (s *session) exists(id string) bool {
	d, _ := s.store.get(s.org, s.workspace, id)
	return d != nil
}

// applyLocal applies projection txes to this session's store without a broadcast
// (backfill runs before the client's first query, so there is nothing live to
// notify — the client reads the populated store on its initial findAll).
func (s *session) applyLocal(txes ...map[string]any) {
	for _, t := range txes {
		raw, err := json.Marshal(t)
		if err != nil {
			continue
		}
		s.applyTx(raw)
	}
}

// ── helpers ──────────────────────────────────────────────────────────────────

func pick(a, b string) string {
	if a != "" {
		return a
	}
	return b
}

// millis reads a Base datetime field as unix milliseconds (0 if unset).
func millis(r *core.Record, field string) int64 {
	t := r.GetDateTime(field).Time()
	if t.IsZero() {
		return 0
	}
	return t.UnixMilli()
}
