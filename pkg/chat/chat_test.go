package chat

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/tests"
	"github.com/hanzoai/base/tools/router"
	"github.com/hanzoai/dbx"
)

// setup boots a real Base test app, creates the chat collections (mirroring the
// migration) and seeds a workspace + two member auth records. Returns the app,
// the workspace record, and two auth records (a member and a non-member).
func setup(t *testing.T) (*tests.TestApp, *core.Record, *core.Record, *core.Record) {
	t.Helper()
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatalf("new test app: %v", err)
	}
	t.Cleanup(app.Cleanup)

	mustCollections(t, app)

	// A workspace.
	wsColl, _ := app.FindCollectionByNameOrId("workspaces")
	ws := core.NewRecord(wsColl)
	ws.Set("slug", "acme")
	ws.Set("name", "Acme")
	ws.Set("owner", "hanzo")
	ws.Set("uuid", "11111111-1111-1111-1111-111111111111")
	if err := app.Save(ws); err != nil {
		t.Fatalf("save ws: %v", err)
	}

	// Two auth records (from the seeded users collection).
	member := authRecord(t, app, "member@acme.test")
	stranger := authRecord(t, app, "stranger@acme.test")

	// member is an owner of the workspace; stranger is not a member.
	mColl, _ := app.FindCollectionByNameOrId("members")
	m := core.NewRecord(mColl)
	m.Set("workspace_id", ws.Id)
	m.Set("user_id", member.Id)
	m.Set("role", "owner")
	if err := app.Save(m); err != nil {
		t.Fatalf("save member: %v", err)
	}
	return app, ws, member, stranger
}

// mustCollections creates workspaces/members/channels/messages/presence with the
// same shape the JS migrations produce (Go equivalent for the test harness).
func mustCollections(t *testing.T, app core.App) {
	t.Helper()
	// workspaces
	ws := core.NewBaseCollection("workspaces")
	ws.Fields.Add(&core.TextField{Name: "slug", Required: true})
	ws.Fields.Add(&core.TextField{Name: "name", Required: true})
	ws.Fields.Add(&core.TextField{Name: "owner"})
	ws.Fields.Add(&core.TextField{Name: "owner_org"})
	ws.Fields.Add(&core.TextField{Name: "uuid"})
	save(t, app, ws)

	// members
	mem := core.NewBaseCollection("members")
	mem.Fields.Add(&core.RelationField{Name: "workspace_id", CollectionId: ws.Id, Required: true})
	mem.Fields.Add(&core.TextField{Name: "user_id", Required: true})
	mem.Fields.Add(&core.TextField{Name: "role", Required: true})
	mem.Fields.Add(&core.BoolField{Name: "is_bot"})
	mem.Fields.Add(&core.TextField{Name: "service_account_id"})
	mem.Fields.Add(&core.TextField{Name: "organization"})
	mem.Fields.Add(&core.TextField{Name: "agent_model"})
	mem.Fields.Add(&core.TextField{Name: "display_name"})
	mem.Fields.Add(&core.BoolField{Name: "active"})
	mem.Fields.Add(&core.AutodateField{Name: "joined_at", OnCreate: true})
	save(t, app, mem)

	// channels
	ch := core.NewBaseCollection("channels")
	ch.Fields.Add(&core.RelationField{Name: "workspace_id", CollectionId: ws.Id, Required: true})
	ch.Fields.Add(&core.TextField{Name: "name", Required: true})
	ch.Fields.Add(&core.TextField{Name: "topic"})
	ch.Fields.Add(&core.SelectField{Name: "kind", Values: []string{"public", "private", "dm"}, MaxSelect: 1})
	ch.Fields.Add(&core.TextField{Name: "created_by"})
	ch.Fields.Add(&core.AutodateField{Name: "created_at", OnCreate: true})
	ch.Fields.Add(&core.AutodateField{Name: "updated_at", OnCreate: true, OnUpdate: true})
	save(t, app, ch)

	// messages
	msg := core.NewBaseCollection("messages")
	msg.Fields.Add(&core.RelationField{Name: "channel_id", CollectionId: ch.Id, Required: true})
	msg.Fields.Add(&core.TextField{Name: "author_id", Required: true})
	msg.Fields.Add(&core.TextField{Name: "body", Required: true})
	msg.Fields.Add(&core.TextField{Name: "parent_id"})
	msg.Fields.Add(&core.AutodateField{Name: "created_at", OnCreate: true})
	msg.Fields.Add(&core.AutodateField{Name: "updated_at", OnCreate: true, OnUpdate: true})
	save(t, app, msg)

	// presence
	pr := core.NewBaseCollection("presence")
	pr.Fields.Add(&core.RelationField{Name: "workspace_id", CollectionId: ws.Id, Required: true})
	pr.Fields.Add(&core.TextField{Name: "user_id", Required: true})
	pr.Fields.Add(&core.SelectField{Name: "status", Values: []string{"online", "away", "offline"}, MaxSelect: 1})
	pr.Fields.Add(&core.AutodateField{Name: "last_seen", OnCreate: true, OnUpdate: true})
	save(t, app, pr)
}

func save(t *testing.T, app core.App, c *core.Collection) {
	t.Helper()
	if err := app.Save(c); err != nil {
		t.Fatalf("save collection %s: %v", c.Name, err)
	}
}

func authRecord(t *testing.T, app core.App, email string) *core.Record {
	t.Helper()
	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		t.Fatalf("users collection: %v", err)
	}
	r := core.NewRecord(users)
	r.Set("email", email)
	r.Set("password", "test12345")
	if err := app.Save(r); err != nil {
		t.Fatalf("save auth record: %v", err)
	}
	return r
}

// call drives one chat handler through a synthetic RequestEvent with an injected
// auth record, and returns the recorder for assertions.
func call(app core.App, method, url string, auth *core.Record, body string, handler func(*core.RequestEvent) error) *httptest.ResponseRecorder {
	var rdr *strings.Reader
	if body != "" {
		rdr = strings.NewReader(body)
	} else {
		rdr = strings.NewReader("")
	}
	req := httptest.NewRequest(method, url, rdr)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	re := &core.RequestEvent{App: app, Auth: auth}
	re.Request = req
	re.Response = rec
	// The prod router serializes a returned error via ToApiError → WriteHeader.
	// Replicate that here so status assertions reflect real behavior.
	if err := handler(re); err != nil {
		apiErr := router.ToApiError(err)
		rec.WriteHeader(apiErr.Status)
		_ = json.NewEncoder(rec).Encode(apiErr)
	}
	return rec
}

// ── tests ────────────────────────────────────────────────────────────────────

func TestChat_CreateAndListChannel(t *testing.T) {
	app, _, member, _ := setup(t)
	c := &api{app: app}

	rec := call(app, "POST", "/v1/chat/channels?workspace=acme", member,
		`{"name":"general","kind":"public"}`, c.createChannel)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create channel: %d %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"general"`) {
		t.Fatalf("channel not in response: %s", rec.Body.String())
	}

	rec = call(app, "GET", "/v1/chat/channels?workspace=acme", member, "", c.listChannels)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "general") {
		t.Fatalf("list channels: %d %s", rec.Code, rec.Body.String())
	}
}

func TestChat_StrangerDenied(t *testing.T) {
	app, _, _, stranger := setup(t)
	c := &api{app: app}
	// A non-member cannot list a workspace's channels.
	rec := call(app, "GET", "/v1/chat/channels?workspace=acme", stranger, "", c.listChannels)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("stranger should be forbidden, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestChat_PostListEditDeleteMessage(t *testing.T) {
	app, ws, member, stranger := setup(t)
	c := &api{app: app}

	// Create a channel.
	chColl, _ := app.FindCollectionByNameOrId("channels")
	ch := core.NewRecord(chColl)
	ch.Set("workspace_id", ws.Id)
	ch.Set("name", "eng")
	ch.Set("kind", "public")
	ch.Set("created_by", member.Id)
	if err := app.Save(ch); err != nil {
		t.Fatal(err)
	}

	// Post a message (member).
	rec := call(app, "POST", "/v1/chat/channels/"+ch.Id+"/messages", member, `{"body":"hello"}`,
		withPath(c.postMessage, "id", ch.Id))
	if rec.Code != http.StatusCreated {
		t.Fatalf("post: %d %s", rec.Code, rec.Body.String())
	}
	var posted map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &posted)
	msgID, _ := posted["id"].(string)
	if msgID == "" {
		t.Fatal("no message id returned")
	}

	// Stranger cannot post to the channel.
	rec = call(app, "POST", "/v1/chat/channels/"+ch.Id+"/messages", stranger, `{"body":"intrusion"}`,
		withPath(c.postMessage, "id", ch.Id))
	if rec.Code != http.StatusForbidden {
		t.Fatalf("stranger post should be forbidden: %d", rec.Code)
	}

	// List messages.
	rec = call(app, "GET", "/v1/chat/channels/"+ch.Id+"/messages", member, "",
		withPath(c.listMessages, "id", ch.Id))
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "hello") {
		t.Fatalf("list messages: %d %s", rec.Code, rec.Body.String())
	}

	// A different member cannot edit the author's message.
	other := authRecord(t, app, "other@acme.test")
	mColl, _ := app.FindCollectionByNameOrId("members")
	om := core.NewRecord(mColl)
	om.Set("workspace_id", ws.Id)
	om.Set("user_id", other.Id)
	om.Set("role", "member")
	_ = app.Save(om)
	rec = call(app, "PATCH", "/v1/chat/messages/"+msgID, other, `{"body":"hijack"}`,
		withPath(c.editMessage, "id", msgID))
	if rec.Code != http.StatusForbidden {
		t.Fatalf("non-author edit should be forbidden: %d %s", rec.Code, rec.Body.String())
	}

	// Author can edit.
	rec = call(app, "PATCH", "/v1/chat/messages/"+msgID, member, `{"body":"edited"}`,
		withPath(c.editMessage, "id", msgID))
	if rec.Code != http.StatusOK {
		t.Fatalf("author edit: %d %s", rec.Code, rec.Body.String())
	}

	// Author can delete.
	rec = call(app, "DELETE", "/v1/chat/messages/"+msgID, member, "",
		withPath(c.deleteMessage, "id", msgID))
	if rec.Code != http.StatusOK {
		t.Fatalf("author delete: %d %s", rec.Code, rec.Body.String())
	}
	if n, _ := app.CountRecords("messages", dbx.HashExp{"id": msgID}); n != 0 {
		t.Fatalf("message not deleted (count=%d)", n)
	}
}

func TestChat_Presence(t *testing.T) {
	app, _, member, _ := setup(t)
	c := &api{app: app}
	rec := call(app, "POST", "/v1/chat/presence?workspace=acme", member, `{"status":"online"}`, c.presence)
	if rec.Code != http.StatusOK {
		t.Fatalf("presence: %d %s", rec.Code, rec.Body.String())
	}
	// Idempotent: a second heartbeat updates in place (no duplicate row).
	_ = call(app, "POST", "/v1/chat/presence?workspace=acme", member, `{"status":"away"}`, c.presence)
	if n, _ := app.CountRecords("presence", dbx.HashExp{"user_id": member.Id}); n != 1 {
		t.Fatalf("presence should be one row per user, got %d", n)
	}
}

// withPath wraps a handler so the {id} path value is set on the request (the
// router does this in prod; we set it explicitly for the direct-call harness).
func withPath(h func(*core.RequestEvent) error, key, val string) func(*core.RequestEvent) error {
	return func(re *core.RequestEvent) error {
		re.Request.SetPathValue(key, val)
		return h(re)
	}
}
