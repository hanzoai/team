package transactor

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"
)

// live is the process-singleton transactor server. It is set in Register so the
// mirror (and any future in-process subsystem) can project writes into the
// per-workspace store the SPA reads — WITHOUT holding a client WebSocket. It is
// the ONE bridge from team-go's Base-collection write plane (REST chat, bots,
// Slack) into the ZAP plane the Huly front queries.
var live *server

// Contact/chunter class ids the mirror materializes. Kept here (one place) so the
// Huly-model wire identity lives with the code that builds it.
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

// ── typed builders (the Huly-model knowledge, one place) ─────────────────────

func createTx(objectID, objectClass, space, modifiedBy string, attrs map[string]any) map[string]any {
	now := time.Now().UnixMilli()
	return map[string]any{
		"_class": clTxCreate, "objectId": objectID, "objectClass": objectClass,
		"objectSpace": space, "modifiedBy": modifiedBy, "modifiedOn": now,
		"createdBy": modifiedBy, "createdOn": now, "attributes": attrs,
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

// PersonTxes builds the create(Person) + Employee-mixin + SocialIdentity txes for
// a member. Applied in order: the Person exists before the mixin/social attach.
func PersonTxes(m Member) []map[string]any {
	pid := PersonRef(m.UserID)
	name := m.Name
	if name == "" {
		name = m.UserID
	}
	role := strings.ToLower(m.Role)
	if role == "" {
		role = "member"
	}
	position := ""
	if m.IsBot {
		position = "Agent"
	}
	socialKey := "hanzo:" + m.UserID
	return []map[string]any{
		createTx(pid, clPerson, spaceContacts, acctSystem, map[string]any{
			"name": name, "personUuid": m.UserID, "city": "",
		}),
		// Employee mixin: active is what puts the member in the Team/Employee list
		// AND (when true) fires the PersonSpace trigger.
		mixinTx(pid, clPerson, spaceContacts, mixinEmployee, acctSystem, map[string]any{
			"active": m.Active, "role": strings.ToUpper(role), "position": position,
		}),
		// The social identity lets the account (hanzo:<uuid>) resolve to this
		// Person — the same key getSocialIds returns.
		attachedCreateTx(socialKey, clSocialIdentity, spaceContacts, pid, clPerson, "socialIds", acctSystem, map[string]any{
			"key": socialKey, "type": "hanzo", "value": m.UserID, "verifiedOn": time.Now().UnixMilli(),
		}),
	}
}

// Channel is the projection of a chat channel.
type Channel struct {
	ID        string // the Base channels.id
	Name      string
	Topic     string
	Private   bool
	CreatedBy string // account uuid
}

// ChannelRef is the deterministic Channel/space _id for a Base channel id.
func ChannelRef(channelID string) string { return "channel-" + channelID }

// ChannelTx builds the create(chunter:class:Channel) space tx. A channel IS a
// space (ChunterSpace→Space); public channels (private=false) are visible to
// every workspace member.
func ChannelTx(c Channel) map[string]any {
	members := []any{}
	if c.CreatedBy != "" {
		members = append(members, c.CreatedBy)
	}
	name := c.Name
	if name == "" {
		name = "channel"
	}
	return createTx(ChannelRef(c.ID), clChannel, spaceSpace, acctSystem, map[string]any{
		"name": name, "description": c.Topic, "topic": c.Topic,
		"private": c.Private, "archived": false, "members": members,
		"autoJoin": !c.Private,
	})
}

// Message is the projection of a chat message.
type Message struct {
	ID        string // Base messages.id
	ChannelID string // Base channels.id
	AuthorID  string // account uuid or synthetic (slack:<uid>)
	Body      string
}

// MessageRef is the deterministic ChatMessage _id for a Base message id.
func MessageRef(messageID string) string { return "msg-" + messageID }

// MessageTx builds the create(chunter:class:ChatMessage) AttachedDoc tx, attached
// to the channel space so the SPA renders it in that channel's timeline.
func MessageTx(m Message) map[string]any {
	ch := ChannelRef(m.ChannelID)
	author := m.AuthorID
	if author == "" {
		author = acctSystem
	}
	return attachedCreateTx(MessageRef(m.ID), clChatMessage, ch, ch, clChannel, "messages", author, map[string]any{
		"message": m.Body,
	})
}

// newID is a convenience for callers that need a fresh ref (unused by the mirror,
// which derives deterministic refs — kept for symmetry with future writers).
func newID() string { return uuid.NewString() }
