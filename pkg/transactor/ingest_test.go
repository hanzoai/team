package transactor

import (
	"os"
	"strings"
	"testing"
)

// ingestServer builds a standalone transactor server + a query session sharing
// one store, and publishes it as the `live` singleton so Apply() targets it.
func ingestServer(t *testing.T, org, ws string) (*server, *session) {
	t.Helper()
	dir, err := os.MkdirTemp("", "team-ingest")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { os.RemoveAll(dir) })
	srv := &server{hub: newHub(), store: newStore(dir), hier: buildHierarchy(modelJSON)}
	live = srv
	t.Cleanup(func() { live = nil })
	sess := &session{server: srv, store: srv.store, hier: srv.hier, org: org, workspace: ws, account: acctSystem}
	return srv, sess
}

// TestIngestMirrorsMemberToEmployee is the BLOCKER-5 / #19 core: a member
// projected via Apply(MemberTxes) shows up under BOTH contact:class:Person and
// the contact:mixin:Employee (Team) query, carries the display name, and links a
// hanzo social identity — exactly what the SPA Contacts/Team modules read.
func TestIngestMirrorsMemberToEmployee(t *testing.T) {
	const org, ws = "hanzo", "e48f81fd-12be-4bcd-aecb-3eaa9a9b5b18"
	const uid = "2d4d67ab-30f1-474e-b81f-f60461852259"
	_, sess := ingestServer(t, org, ws)

	Apply(org, ws, acctSystem, MemberTxes(Member{UserID: uid, Name: "Zeekay", Role: "owner", Active: true}, false)...)

	persons := sess.queryDocs(clPerson, nil)
	if len(persons) != 1 {
		t.Fatalf("contact:class:Person count = %d, want 1", len(persons))
	}
	if persons[0]["name"] != ",Zeekay" { // canonical "last,first"; single token → first-name only
		t.Fatalf("person name = %v, want ,Zeekay", persons[0]["name"])
	}
	if persons[0]["avatarType"] != "color" { // colored placeholder avatar, like a native SPA person
		t.Fatalf("person avatarType = %v, want color", persons[0]["avatarType"])
	}
	if persons[0]["personUuid"] != uid {
		t.Fatalf("personUuid = %v, want %s", persons[0]["personUuid"], uid)
	}
	if _, ok := persons[0][mixinEmployee].(map[string]any); !ok {
		t.Fatalf("person missing Employee mixin: %v", persons[0])
	}

	// The Team/Employee list query must return the same member.
	emps := sess.queryDocs(mixinEmployee, nil)
	if len(emps) != 1 {
		t.Fatalf("contact:mixin:Employee (Team) count = %d, want 1", len(emps))
	}
	if active, _ := emps[0][mixinEmployee].(map[string]any)["active"].(bool); !active {
		t.Fatalf("employee not active: %v", emps[0][mixinEmployee])
	}

	// The social identity (hanzo:<uid>) that links the account to this Person.
	sids := sess.queryDocs(clSocialIdentity, map[string]any{"key": "hanzo:" + uid})
	if len(sids) != 1 {
		t.Fatalf("social identity count = %d, want 1", len(sids))
	}
}

// TestMemberUpdatePreservesProfile is the RED H1 regression: a members-row update
// re-projects the member, and MUST NOT clobber Person fields the SPA owns
// (avatar/city/…). It updates only name + the Employee mixin.
func TestMemberUpdatePreservesProfile(t *testing.T) {
	const org, ws = "hanzo", "e48f81fd-12be-4bcd-aecb-3eaa9a9b5b18"
	const uid = "2d4d67ab-30f1-474e-b81f-f60461852259"
	_, sess := ingestServer(t, org, ws)

	Apply(org, ws, acctSystem, MemberTxes(Member{UserID: uid, Name: "Zeekay", Role: "owner", Active: true}, false)...)

	// Simulate the SPA writing profile fields onto the Person.
	pid := PersonRef(uid)
	doc, _ := sess.store.get(org, ws, pid)
	doc["avatar"] = "blob:xyz"
	doc["city"] = "Tokyo"
	if err := sess.store.put(org, ws, doc); err != nil {
		t.Fatal(err)
	}

	// A members-row update re-projects with exists=true (name + role change).
	Apply(org, ws, acctSystem, MemberTxes(Member{UserID: uid, Name: "Zeekay Kanjo", Role: "admin", Active: true}, true)...)

	after, _ := sess.store.get(org, ws, pid)
	if after["avatar"] != "blob:xyz" {
		t.Fatalf("avatar clobbered: %v (want blob:xyz)", after["avatar"])
	}
	if after["city"] != "Tokyo" {
		t.Fatalf("city clobbered: %v (want Tokyo)", after["city"])
	}
	if after["name"] != "Kanjo,Zeekay" { // "Zeekay Kanjo" → canonical "last,first"
		t.Fatalf("name not updated: %v (want Kanjo,Zeekay)", after["name"])
	}
	if role, _ := after[mixinEmployee].(map[string]any)["role"].(string); role != "ADMIN" {
		t.Fatalf("employee role not refreshed: %v", after[mixinEmployee])
	}
}

// TestIngestBotDeactivationDropsFromTeam proves a bot re-sync with active=false
// removes it from the Employee/Team list (Employee.active=false) while its Person
// survives (authorship history) — the bots-as-members lifecycle.
func TestIngestBotDeactivationDropsFromTeam(t *testing.T) {
	const org, ws = "hanzo", "e48f81fd-12be-4bcd-aecb-3eaa9a9b5b18"
	const bot = "11111111-1111-4111-8111-111111111111"
	_, sess := ingestServer(t, org, ws)

	Apply(org, ws, acctSystem, MemberTxes(Member{UserID: bot, Name: "Zen Agent", Role: "member", IsBot: true, Active: true}, false)...)
	if n := len(sess.queryDocs(mixinEmployee, map[string]any{"active": true})); n != 1 {
		t.Fatalf("active employees after add = %d, want 1", n)
	}

	// Re-sync as inactive (deactivate) — exists path (update).
	Apply(org, ws, acctSystem, MemberTxes(Member{UserID: bot, Name: "Zen Agent", Role: "member", IsBot: true, Active: false}, true)...)
	if n := len(sess.queryDocs(mixinEmployee, map[string]any{"active": true})); n != 0 {
		t.Fatalf("active employees after deactivate = %d, want 0", n)
	}
	if n := len(sess.queryDocs(clPerson, nil)); n != 1 {
		t.Fatalf("persons after deactivate = %d, want 1 (history preserved)", n)
	}
}

// TestIngestMirrorsChannelAndMessage is the BLOCKER-3 core: a channel + message
// written on the Base plane (REST/Slack/bot) are queryable in the transactor
// plane the SPA reads — the message attached to its channel space, body wrapped
// as the Markup the front renders (H3).
func TestIngestMirrorsChannelAndMessage(t *testing.T) {
	const org, ws = "hanzo", "e48f81fd-12be-4bcd-aecb-3eaa9a9b5b18"
	_, sess := ingestServer(t, org, ws)

	Apply(org, ws, acctSystem, ChannelTx(Channel{ID: "chan1", Name: "general", Topic: "all hands", CreatedBy: "u1"}, false))
	Apply(org, ws, "slack:U123", MessageTx(Message{ID: "m1", ChannelID: "chan1", AuthorID: "slack:U123", Body: "hello from slack"}, false))

	chans := sess.queryDocs(clChannel, map[string]any{"name": "general"})
	if len(chans) != 1 {
		t.Fatalf("channels = %d, want 1", len(chans))
	}
	if chans[0]["_id"] != ChannelRef("chan1") {
		t.Fatalf("channel _id = %v, want %s", chans[0]["_id"], ChannelRef("chan1"))
	}

	msgs := sess.queryDocs(clChatMessage, map[string]any{"attachedTo": ChannelRef("chan1")})
	if len(msgs) != 1 {
		t.Fatalf("messages in channel = %d, want 1", len(msgs))
	}
	msg, _ := msgs[0]["message"].(string)
	if !strings.Contains(msg, `"type":"doc"`) || !strings.Contains(msg, `"text":"hello from slack"`) {
		t.Fatalf("message not wrapped as markup: %q", msg)
	}
	if msgs[0]["space"] != ChannelRef("chan1") {
		t.Fatalf("message space = %v, want channel ref", msgs[0]["space"])
	}
}

// TestMessageEditAndDelete proves the M1 update/delete paths: an edited message
// updates its markup in place; a deleted message leaves the plane.
func TestMessageEditAndDelete(t *testing.T) {
	const org, ws = "hanzo", "e48f81fd-12be-4bcd-aecb-3eaa9a9b5b18"
	_, sess := ingestServer(t, org, ws)

	Apply(org, ws, acctSystem, ChannelTx(Channel{ID: "c1", Name: "general", CreatedBy: "u1"}, false))
	Apply(org, ws, "u1", MessageTx(Message{ID: "m1", ChannelID: "c1", AuthorID: "u1", Body: "first"}, false))

	// Edit.
	Apply(org, ws, "u1", MessageTx(Message{ID: "m1", ChannelID: "c1", AuthorID: "u1", Body: "edited"}, true))
	msgs := sess.queryDocs(clChatMessage, nil)
	if len(msgs) != 1 {
		t.Fatalf("messages after edit = %d, want 1", len(msgs))
	}
	if m, _ := msgs[0]["message"].(string); !strings.Contains(m, `"text":"edited"`) {
		t.Fatalf("message not edited in place: %q", m)
	}

	// Delete.
	Apply(org, ws, acctSystem, RemoveMessageTx("m1", "c1"))
	if n := len(sess.queryDocs(clChatMessage, nil)); n != 0 {
		t.Fatalf("messages after delete = %d, want 0", n)
	}
}
