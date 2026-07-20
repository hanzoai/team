package transactor

import (
	"encoding/json"
	"strings"
	"time"
)

// live is the process-singleton transactor server. It is set in Register so the
// mirror (and any future in-process subsystem) can project writes into the
// per-workspace store the SPA reads — WITHOUT holding a client WebSocket. It is
// the ONE bridge from team-go's Base-collection write plane (REST chat, bots,
// Slack) into the ZAP plane the front queries.
var live *server

// Contact/chunter class ids the mirror materializes. Kept here (one place) so the
// front-model wire identity lives with the code that builds it.
const (
	clPerson         = "contact:class:Person"
	mixinEmployee    = "contact:mixin:Employee"
	clSocialIdentity = "contact:class:SocialIdentity"
	spaceContacts    = "contact:space:Contacts"
	clChannel        = "chunter:class:Channel"
	clChatMessage    = "chunter:class:ChatMessage"
	spaceSpace       = "core:space:Space"
)

// Apply ingests platform CUD txes into a workspace's store exactly as a live
// client would (same applyTx path, same triggers) and broadcasts the applied
// txes to every open session of that workspace (realtime). account is the
// attribution used for triggers/PersonSpace ownership. No-op until Register runs.
func Apply(org, workspace, account string, txes ...map[string]any) {
	if live == nil || org == "" || workspace == "" || len(txes) == 0 {
		return
	}
	live.ingest(org, workspace, account, txes...)
}

func (srv *server) ingest(org, workspace, account string, txes ...map[string]any) {
	s := &session{server: srv, store: srv.store, hier: srv.hier, org: org, workspace: workspace, account: account}
	s.seedWorkspace() // system spaces must exist so space-scoped queries resolve
	var applied []json.RawMessage
	for _, t := range txes {
		raw, err := json.Marshal(t)
		if err != nil {
			continue
		}
		_, a := s.applyTx(raw)
		applied = append(applied, a...)
	}
	if len(applied) > 0 {
		srv.hub.broadcast(workspace, applied)
	}
}

// hasDoc reports whether a doc id already exists in a workspace store. It lets
// the mirror choose create-vs-update so a re-projection never full-replaces a
// doc (which would clobber fields the SPA owns — see MemberTxes).
func hasDoc(org, workspace, id string) bool {
	if live == nil {
		return false
	}
	d, _ := live.store.get(org, workspace, id)
	return d != nil
}

// ── tx builders (the front-model knowledge, one place) ────────────────────────

func createTx(objectID, objectClass, space, modifiedBy string, attrs map[string]any) map[string]any {
	now := time.Now().UnixMilli()
	return map[string]any{
		"_class": clTxCreate, "objectId": objectID, "objectClass": objectClass,
		"objectSpace": space, "modifiedBy": modifiedBy, "modifiedOn": now,
		"createdBy": modifiedBy, "createdOn": now, "attributes": attrs,
	}
}

// updateTx sets only the given operations on an existing doc (get→apply→put),
// preserving every field it does not name — the anti-clobber primitive.
func updateTx(objectID, objectClass, space, modifiedBy string, ops map[string]any) map[string]any {
	now := time.Now().UnixMilli()
	return map[string]any{
		"_class": clTxUpdate, "objectId": objectID, "objectClass": objectClass,
		"objectSpace": space, "modifiedBy": modifiedBy, "modifiedOn": now,
		"operations": ops,
	}
}

func attachedCreateTx(objectID, objectClass, space, attachedTo, attachedToClass, collection, modifiedBy string, attrs map[string]any) map[string]any {
	t := createTx(objectID, objectClass, space, modifiedBy, attrs)
	t["attachedTo"] = attachedTo
	t["attachedToClass"] = attachedToClass
	t["collection"] = collection
	return t
}

func mixinTx(objectID, objectClass, space, mixin, modifiedBy string, attrs map[string]any) map[string]any {
	now := time.Now().UnixMilli()
	return map[string]any{
		"_class": clTxMixin, "objectId": objectID, "objectClass": objectClass,
		"objectSpace": space, "mixin": mixin, "modifiedBy": modifiedBy, "modifiedOn": now,
		"attributes": attrs,
	}
}

func removeTx(objectID, objectClass, space string) map[string]any {
	return map[string]any{
		"_class": clTxRemove, "objectId": objectID, "objectClass": objectClass, "objectSpace": space,
	}
}

// ── projections ──────────────────────────────────────────────────────────────

// Member is the projection of a team member (human or bot) the mirror renders as
// a Person + Employee in the SPA directory.
type Member struct {
	UserID string // account uuid (also the Person.personUuid + social key)
	Name   string // display name
	Role   string // owner/admin/member — surfaced on the Employee mixin
	IsBot  bool
	Active bool // Employee.active — drives Team/Employee-list membership
}

// PersonRef is the deterministic Person _id for a member account — stable so
// re-syncs upsert in place (never duplicate a member).
func PersonRef(userID string) string { return "person-" + userID }

// MemberTxes builds the txes to project a member. When the Person already EXISTS
// it only UPDATES the mirror-owned name + refreshes the Employee mixin (which
// merges, never replaces) — so avatar/city/birthday/profile and any SPA-set
// mixin survive. On first projection it creates the Person + the hanzo social
// identity. The Employee mixin (active) is what puts the member in the Team list
// and fires the PersonSpace trigger.
func MemberTxes(m Member, exists bool) []map[string]any {
	pid := PersonRef(m.UserID)
	name := personName(pick(m.Name, m.UserID))
	role := strings.ToUpper(pick(m.Role, "member"))
	position := ""
	if m.IsBot {
		position = "Agent"
	}
	var txes []map[string]any
	if exists {
		// Refresh the mirror-owned display fields (name + avatar placeholder) in
		// place; SPA-owned profile fields (city, avatar upload, …) are untouched.
		txes = append(txes, updateTx(pid, clPerson, spaceContacts, acctSystem, map[string]any{
			"name": name, "avatarType": "color",
		}))
	} else {
		txes = append(txes, createTx(pid, clPerson, spaceContacts, acctSystem, map[string]any{
			"name": name, "personUuid": m.UserID, "city": "", "avatarType": "color",
		}))
	}
	txes = append(txes, mixinTx(pid, clPerson, spaceContacts, mixinEmployee, acctSystem, map[string]any{
		"active": m.Active, "role": role, "position": position,
	}))
	if !exists {
		socialKey := "hanzo:" + m.UserID
		txes = append(txes, attachedCreateTx(socialKey, clSocialIdentity, spaceContacts, pid, clPerson, "socialIds", acctSystem, map[string]any{
			"key": socialKey, "type": "hanzo", "value": m.UserID, "verifiedOn": time.Now().UnixMilli(),
		}))
	}
	return txes
}

// Channel is the projection of a chat channel.
type Channel struct {
	ID        string // the Base channels.id
	Name      string
	Topic     string
	Private   bool
	CreatedBy string   // account uuid
	Members   []string // workspace member account uuids (public-channel visibility)
}

// ChannelRef is the deterministic Channel/space _id for a Base channel id.
func ChannelRef(channelID string) string { return "channel-" + channelID }

// ChannelTx builds the create/update for a chunter:class:Channel space. A channel
// IS a space; a public channel (private=false, autoJoin) is visible to every
// workspace member. On update it refreshes name/topic/privacy/membership without
// disturbing anything else.
func ChannelTx(c Channel, exists bool) map[string]any {
	members := memberSet(c.CreatedBy, c.Members)
	name := pick(c.Name, "channel")
	attrs := map[string]any{
		"name": name, "description": c.Topic, "topic": c.Topic,
		"private": c.Private, "archived": false, "members": members, "autoJoin": !c.Private,
	}
	if exists {
		return updateTx(ChannelRef(c.ID), clChannel, spaceSpace, acctSystem, attrs)
	}
	return createTx(ChannelRef(c.ID), clChannel, spaceSpace, acctSystem, attrs)
}

// Message is the projection of a chat message.
type Message struct {
	ID        string // Base messages.id
	ChannelID string // Base channels.id
	AuthorID  string // account uuid or synthetic (slack:<uid>)
	Body      string
	CreatedAt int64 // original created_at (unix millis); preserves timeline order on backfill
}

// MessageRef is the deterministic ChatMessage _id for a Base message id.
func MessageRef(messageID string) string { return "msg-" + messageID }

// MessageTx builds the create/update for a chunter:class:ChatMessage AttachedDoc,
// attached to the channel space so the SPA renders it in that channel's timeline.
// The body is wrapped as Markup (ProseMirror JSON) — the front renders a raw
// string as empty, so a plain body would silently not display.
func MessageTx(m Message, exists bool) map[string]any {
	ch := ChannelRef(m.ChannelID)
	if exists {
		return updateTx(MessageRef(m.ID), clChatMessage, ch, pick(m.AuthorID, acctSystem), map[string]any{
			"message": markup(m.Body),
		})
	}
	t := attachedCreateTx(MessageRef(m.ID), clChatMessage, ch, ch, clChannel, "messages", pick(m.AuthorID, acctSystem), map[string]any{
		"message": markup(m.Body),
	})
	// Preserve the original timeline order (the SPA sorts by createdOn); without
	// this, backfilled history would all cluster at projection time.
	if m.CreatedAt > 0 {
		t["createdOn"] = m.CreatedAt
		t["modifiedOn"] = m.CreatedAt
	}
	return t
}

// RemoveMessageTx removes a mirrored ChatMessage (Base delete → plane delete).
func RemoveMessageTx(messageID, channelID string) map[string]any {
	return removeTx(MessageRef(messageID), clChatMessage, ChannelRef(channelID))
}

// ── helpers ──────────────────────────────────────────────────────────────────

// personName formats a display name into the canonical Person.name convention
// "last,first" (the SPA renders it "first last"; a native SPA person stores ","
// for an empty name). A single-token name (most bots) has no last name, so it
// becomes the first name (",token") — rendered verbatim. Empty stays ",".
func personName(display string) string {
	display = strings.TrimSpace(display)
	if display == "" {
		return ","
	}
	if i := strings.LastIndex(display, " "); i > 0 {
		return strings.TrimSpace(display[i+1:]) + "," + strings.TrimSpace(display[:i])
	}
	return "," + display
}

// markup wraps a plain-text body in the minimal Markup (ProseMirror JSON)
// the front parses. An empty body becomes an empty paragraph.
func markup(body string) string {
	if body == "" {
		return `{"type":"doc","content":[{"type":"paragraph"}]}`
	}
	text, _ := json.Marshal(body) // JSON-escape the text node value
	return `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":` + string(text) + `}]}]}`
}

// memberSet returns the de-duplicated union of the creator and the workspace
// members as an []any (the stored members array).
func memberSet(creator string, members []string) []any {
	seen := map[string]bool{}
	out := []any{}
	add := func(id string) {
		if id != "" && !seen[id] {
			seen[id] = true
			out = append(out, id)
		}
	}
	add(creator)
	for _, m := range members {
		add(m)
	}
	return out
}
