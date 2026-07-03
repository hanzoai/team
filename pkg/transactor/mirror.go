package transactor

import (
	"encoding/json"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/dbx"
)

// RegisterMirror binds the ONE plane bridge: every create/update to the Base
// write-plane collections (members/channels/messages) is projected into the
// per-workspace transactor store the Huly SPA reads, and broadcast live. This is
// what makes REST-chat, bots-as-members and Slack-relayed messages actually
// appear in the workbench — the SPA never reads the Base collections directly.
//
// Direction is one-way (Base → transactor). SPA-native writes already land in the
// store via the tx path, so both sources converge in the one plane the front
// queries. Idempotent: every projection is keyed by a deterministic _id.
func RegisterMirror(app core.App) {
	m := &mirror{app: app}
	app.OnRecordAfterCreateSuccess("members").BindFunc(m.member)
	app.OnRecordAfterUpdateSuccess("members").BindFunc(m.member)
	app.OnRecordAfterCreateSuccess("channels").BindFunc(m.channel)
	app.OnRecordAfterCreateSuccess("messages").BindFunc(m.message)
}

type mirror struct{ app core.App }

// member → contact:class:Person (+ Employee mixin + social identity). Humans are
// always active Employees; a bot's Employee.active tracks its member.active so a
// deactivated bot drops out of the Team list while its authorship survives.
func (m *mirror) member(e *core.RecordEvent) error {
	r := e.Record
	if r == nil {
		return e.Next()
	}
	wsUUID, org, ok := m.wsCtx(r.GetString("workspace_id"))
	uid := r.GetString("user_id")
	if ok && uid != "" {
		isBot := r.GetBool("is_bot")
		Apply(org, wsUUID, acctSystem, PersonTxes(Member{
			UserID: uid,
			Name:   pick(r.GetString("display_name"), uid),
			Role:   r.GetString("role"),
			IsBot:  isBot,
			Active: !isBot || r.GetBool("active"),
		})...)
	}
	return e.Next()
}

// channel → chunter:class:Channel (a space).
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
		}))
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
	ch, err := m.app.FindFirstRecordByFilter("channels", "id = {:id}", dbx.Params{"id": chID})
	if err != nil || ch == nil {
		return e.Next()
	}
	if wsUUID, org, ok := m.wsCtx(ch.GetString("workspace_id")); ok {
		Apply(org, wsUUID, r.GetString("author_id"), MessageTx(Message{
			ID:        r.Id,
			ChannelID: chID,
			AuthorID:  r.GetString("author_id"),
			Body:      r.GetString("body"),
		}))
	}
	return e.Next()
}

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

func pick(a, b string) string {
	if a != "" {
		return a
	}
	return b
}

// backfillFromBase projects a workspace's authoritative Base rows (members →
// Persons, channels, recent messages) into the store on first connect, so a user
// always sees the full team directory + existing channels/history — including
// rows written before the mirror hooks ran. Gated on "no Persons yet" so it runs
// once per workspace; the create/update hooks keep the plane current thereafter.
func (s *session) backfillFromBase() {
	app := s.server.app
	if app == nil {
		return
	}
	if len(s.queryDocs(clPerson, nil)) > 0 {
		return // already populated — hooks maintain it from here
	}
	ws, err := app.FindFirstRecordByFilter("workspaces", "uuid = {:u}", dbx.Params{"u": s.workspace})
	if err != nil || ws == nil {
		return
	}
	wsID := ws.Id

	members, _ := app.FindRecordsByFilter("members", "workspace_id = {:w}", "", 1000, 0, dbx.Params{"w": wsID})
	for _, m := range members {
		uid := m.GetString("user_id")
		if uid == "" {
			continue
		}
		isBot := m.GetBool("is_bot")
		s.applyLocal(PersonTxes(Member{
			UserID: uid,
			Name:   pick(m.GetString("display_name"), uid),
			Role:   m.GetString("role"),
			IsBot:  isBot,
			Active: !isBot || m.GetBool("active"),
		})...)
	}

	channels, _ := app.FindRecordsByFilter("channels", "workspace_id = {:w}", "", 1000, 0, dbx.Params{"w": wsID})
	for _, c := range channels {
		s.applyLocal(ChannelTx(Channel{
			ID: c.Id, Name: c.GetString("name"), Topic: c.GetString("topic"),
			Private: c.GetString("kind") == "private", CreatedBy: c.GetString("created_by"),
		}))
		msgs, _ := app.FindRecordsByFilter("messages", "channel_id = {:c}", "created_at", 200, 0, dbx.Params{"c": c.Id})
		for _, mm := range msgs {
			s.applyLocal(MessageTx(Message{
				ID: mm.Id, ChannelID: c.Id, AuthorID: mm.GetString("author_id"), Body: mm.GetString("body"),
			}))
		}
	}
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
