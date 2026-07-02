package slack

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/tests"
	"github.com/hanzoai/base/tools/router"
	"github.com/hanzoai/dbx"
)

// boot builds a Base app with the collections the Slack relay touches, seeds a
// workspace + admin owner + a channel, and returns them.
func boot(t *testing.T) (*tests.TestApp, *core.Record, *core.Record, *core.Record) {
	t.Helper()
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatalf("new test app: %v", err)
	}
	t.Cleanup(app.Cleanup)

	ws := core.NewBaseCollection("workspaces")
	ws.Fields.Add(&core.TextField{Name: "slug", Required: true})
	ws.Fields.Add(&core.TextField{Name: "name", Required: true})
	ws.Fields.Add(&core.TextField{Name: "owner"})
	ws.Fields.Add(&core.TextField{Name: "owner_org"})
	ws.Fields.Add(&core.TextField{Name: "uuid"})
	must(t, app, ws)

	mem := core.NewBaseCollection("members")
	mem.Fields.Add(&core.RelationField{Name: "workspace_id", CollectionId: ws.Id, Required: true})
	mem.Fields.Add(&core.TextField{Name: "user_id", Required: true})
	mem.Fields.Add(&core.TextField{Name: "role", Required: true})
	must(t, app, mem)

	ch := core.NewBaseCollection("channels")
	ch.Fields.Add(&core.RelationField{Name: "workspace_id", CollectionId: ws.Id, Required: true})
	ch.Fields.Add(&core.TextField{Name: "name", Required: true})
	ch.Fields.Add(&core.SelectField{Name: "kind", Values: []string{"public", "private", "dm"}, MaxSelect: 1})
	ch.Fields.Add(&core.TextField{Name: "created_by"})
	must(t, app, ch)

	msg := core.NewBaseCollection("messages")
	msg.Fields.Add(&core.RelationField{Name: "channel_id", CollectionId: ch.Id, Required: true})
	msg.Fields.Add(&core.TextField{Name: "author_id", Required: true})
	msg.Fields.Add(&core.TextField{Name: "body", Required: true})
	msg.Fields.Add(&core.AutodateField{Name: "created_at", OnCreate: true})
	must(t, app, msg)

	sm := core.NewBaseCollection("slack_mappings")
	sm.Fields.Add(&core.RelationField{Name: "workspace_id", CollectionId: ws.Id, Required: true})
	sm.Fields.Add(&core.RelationField{Name: "channel_id", CollectionId: ch.Id, Required: true})
	sm.Fields.Add(&core.TextField{Name: "slack_team_id", Required: true})
	sm.Fields.Add(&core.TextField{Name: "slack_channel_id", Required: true})
	sm.Fields.Add(&core.TextField{Name: "slack_channel_name"})
	sm.Fields.Add(&core.BoolField{Name: "enabled"})
	sm.Fields.Add(&core.TextField{Name: "created_by", Required: true})
	sm.Fields.Add(&core.AutodateField{Name: "created_at", OnCreate: true})
	must(t, app, sm)

	wsRec := core.NewRecord(ws)
	wsRec.Set("slug", "acme")
	wsRec.Set("name", "Acme")
	wsRec.Set("owner", "hanzo")
	wsRec.Set("owner_org", "hanzo")
	wsRec.Set("uuid", "33333333-3333-3333-3333-333333333333")
	must2(t, app, wsRec)

	chRec := core.NewRecord(ch)
	chRec.Set("workspace_id", wsRec.Id)
	chRec.Set("name", "general")
	chRec.Set("kind", "public")
	chRec.Set("created_by", "admin")
	must2(t, app, chRec)

	users, _ := app.FindCollectionByNameOrId("users")
	admin := core.NewRecord(users)
	admin.Set("email", "a@acme.test")
	admin.Set("password", "test12345")
	admin.Set("owner", "hanzo")
	must2(t, app, admin)
	m := core.NewRecord(mem)
	m.Set("workspace_id", wsRec.Id)
	m.Set("user_id", admin.Id)
	m.Set("role", "owner")
	must2(t, app, m)

	return app, wsRec, chRec, admin
}

func must(t *testing.T, app core.App, c *core.Collection) {
	t.Helper()
	if err := app.Save(c); err != nil {
		t.Fatalf("save %s: %v", c.Name, err)
	}
}
func must2(t *testing.T, app core.App, r *core.Record) {
	t.Helper()
	if err := app.Save(r); err != nil {
		t.Fatal(err)
	}
}

// TestWebhook_UnsignedRejected proves the HMAC gate: an unsigned/forged request
// never reaches the relay.
func TestWebhook_UnsignedRejected(t *testing.T) {
	app, _, _, _ := boot(t)
	c := &controller{
		app:        app,
		cfg:        config{slackSigning: "signing-secret"},
		seenEvents: newSeenSet(time.Minute),
	}
	body := `{"type":"event_callback","event_id":"E1","team_id":"T","event":{"type":"message","channel":"C","user":"U","text":"hi","ts":"1"}}`
	req := httptest.NewRequest("POST", "/v1/slack/events", strings.NewReader(body))
	req.Header.Set("X-Slack-Signature", "v0=deadbeef")
	req.Header.Set("X-Slack-Request-Timestamp", strconv.FormatInt(time.Now().Unix(), 10))
	rec := drive(app, req, nil, c.events)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("forged webhook should be 401, got %d", rec.Code)
	}
}

// TestWebhook_SignedRelayCreatesMessage proves a verified inbound message lands
// in the mapped channel, and the dedupe blocks a retry.
func TestWebhook_SignedRelayCreatesMessage(t *testing.T) {
	app, wsRec, chRec, admin := boot(t)

	// Map general <-> Slack C1 on team T1.
	smColl, _ := app.FindCollectionByNameOrId("slack_mappings")
	mapping := core.NewRecord(smColl)
	mapping.Set("workspace_id", wsRec.Id)
	mapping.Set("channel_id", chRec.Id)
	mapping.Set("slack_team_id", "T1")
	mapping.Set("slack_channel_id", "C1")
	mapping.Set("enabled", true)
	mapping.Set("created_by", admin.Id)
	must2(t, app, mapping)

	c := &controller{
		app:        app,
		cfg:        config{slackSigning: "sig"},
		seenEvents: newSeenSet(time.Minute),
	}

	body := `{"type":"event_callback","event_id":"Ev1","team_id":"T1","event":{"type":"message","channel":"C1","user":"U9","text":"from slack","ts":"1"}}`
	ts := strconv.FormatInt(time.Now().Unix(), 10)
	req := httptest.NewRequest("POST", "/v1/slack/events", strings.NewReader(body))
	req.Header.Set("X-Slack-Signature", validSig("sig", ts, body))
	req.Header.Set("X-Slack-Request-Timestamp", ts)
	rec := drive(app, req, nil, c.events)
	if rec.Code != http.StatusOK {
		t.Fatalf("signed webhook: %d %s", rec.Code, rec.Body.String())
	}
	// relayIncoming runs in a goroutine; wait for the row to appear.
	waitFor(t, func() bool {
		n, _ := app.CountRecords("messages", dbx.HashExp{"channel_id": chRec.Id})
		return n == 1
	})
	m, _ := app.FindFirstRecordByFilter("messages", "channel_id = {:c}", dbx.Params{"c": chRec.Id})
	if m == nil || m.GetString("body") != "from slack" {
		t.Fatalf("relayed message wrong: %+v", m)
	}
	// Author is a synthetic slack: id (never a human, and the echo guard uses it).
	if !strings.HasPrefix(m.GetString("author_id"), "slack:") {
		t.Fatalf("relayed author should be slack:*, got %s", m.GetString("author_id"))
	}

	// A retry of the SAME event_id is deduped (no second message).
	req2 := httptest.NewRequest("POST", "/v1/slack/events", strings.NewReader(body))
	req2.Header.Set("X-Slack-Signature", validSig("sig", ts, body))
	req2.Header.Set("X-Slack-Request-Timestamp", ts)
	_ = drive(app, req2, nil, c.events)
	time.Sleep(100 * time.Millisecond)
	if n, _ := app.CountRecords("messages", dbx.HashExp{"channel_id": chRec.Id}); n != 1 {
		t.Fatalf("retry created a duplicate: %d messages", n)
	}
}

// TestMapChannel_RequiresTeamOwnership proves a workspace cannot map a Slack team
// it hasn't connected: the KMS token fetch (ownership proof) fails → 403.
func TestMapChannel_RequiresTeamOwnership(t *testing.T) {
	app, _, chRec, admin := boot(t)
	// KMS that has NO token for any team (every GET → 404).
	kms := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer kms.Close()

	c := &controller{
		app:    app,
		cfg:    config{secret: "s", kmsEndpoint: kms.URL, kmsBearer: "hk"},
		tokens: newTokenStore(kms.URL, "hk"),
	}
	body, _ := json.Marshal(map[string]any{
		"slackTeamId": "T-not-mine", "slackChannelId": "C1", "channelId": chRec.Id,
	})
	req := httptest.NewRequest("POST", "/v1/slack/mappings?workspace=acme", strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	rec := drive(app, req, admin, c.mapChannel)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("mapping an unowned team should be 403, got %d %s", rec.Code, rec.Body.String())
	}
	if n, _ := app.CountRecords("slack_mappings"); n != 0 {
		t.Fatalf("no mapping should be created, got %d", n)
	}
}

// TestOutgoingHook_SkipsSlackAuthored proves the echo-loop guard: a message
// authored by slack:* is NOT re-mirrored to Slack.
func TestOutgoingHook_SkipsSlackAuthored(t *testing.T) {
	app, wsRec, chRec, admin := boot(t)
	smColl, _ := app.FindCollectionByNameOrId("slack_mappings")
	mapping := core.NewRecord(smColl)
	mapping.Set("workspace_id", wsRec.Id)
	mapping.Set("channel_id", chRec.Id)
	mapping.Set("slack_team_id", "T1")
	mapping.Set("slack_channel_id", "C1")
	mapping.Set("enabled", true)
	mapping.Set("created_by", admin.Id)
	must2(t, app, mapping)

	posted := make(chan string, 1)
	slackSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		posted <- r.URL.Path
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer slackSrv.Close()

	c := &controller{app: app, cfg: config{}, tokens: newTokenStore("http://unused", "hk")}

	// Simulate a slack-authored (mirrored-in) message → the hook must skip it.
	msgColl, _ := app.FindCollectionByNameOrId("messages")
	m := core.NewRecord(msgColl)
	m.Set("channel_id", chRec.Id)
	m.Set("author_id", "slack:U1")
	m.Set("body", "echo")
	ev := &core.RecordEvent{}
	ev.App = app
	ev.Record = m
	if err := c.onMessageCreated(ev); err != nil {
		t.Fatalf("hook err: %v", err)
	}
	select {
	case p := <-posted:
		t.Fatalf("slack-authored message was re-mirrored (posted to %s) — echo loop", p)
	case <-time.After(150 * time.Millisecond):
		// good: nothing posted
	}
}

// ── harness helpers ──────────────────────────────────────────────────────────

func validSig(secret, ts, body string) string {
	return slackSig(secret, ts, body)
}

func drive(app core.App, req *http.Request, auth *core.Record, h func(*core.RequestEvent) error) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	re := &core.RequestEvent{App: app, Auth: auth}
	re.Request = req
	re.Response = rec
	if err := h(re); err != nil {
		apiErr := router.ToApiError(err)
		rec.WriteHeader(apiErr.Status)
		_ = json.NewEncoder(rec).Encode(apiErr)
	}
	return rec
}

func waitFor(t *testing.T, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatal("condition not met within timeout")
}
