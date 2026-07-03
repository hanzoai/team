package slack

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/hanzoai/base/core"
)

// addAgentCollections adds the two agent-bridge collections to a test app (the
// shared boot() predates them). Indexes are omitted — upsert logic queries by
// filter, so correctness does not depend on a DB unique constraint here.
func addAgentCollections(t *testing.T, app core.App, _ *core.Record) {
	t.Helper()
	wsColl, err := app.FindCollectionByNameOrId("workspaces")
	if err != nil {
		t.Fatalf("workspaces collection: %v", err)
	}
	installs := core.NewBaseCollection("slack_installs")
	installs.Fields.Add(&core.RelationField{Name: "workspace_id", CollectionId: wsColl.Id, Required: true})
	installs.Fields.Add(&core.TextField{Name: "owner_org", Required: true})
	installs.Fields.Add(&core.TextField{Name: "slack_team_id", Required: true})
	must(t, app, installs)

	links := core.NewBaseCollection("slack_user_links")
	links.Fields.Add(&core.TextField{Name: "slack_team_id", Required: true})
	links.Fields.Add(&core.TextField{Name: "slack_user_id", Required: true})
	links.Fields.Add(&core.TextField{Name: "hanzo_subject", Required: true})
	links.Fields.Add(&core.TextField{Name: "hanzo_org"})
	must(t, app, links)
}

// installOrg resolves team -> tenant org + workspace, and upsert is idempotent.
func TestInstallOrg_RoundTrip(t *testing.T) {
	app, wsRec, _, _ := boot(t)
	addAgentCollections(t, app, wsRec)
	c := &controller{app: app, cfg: config{}}

	if err := c.upsertInstall("T1", wsRec.Id, "hanzo"); err != nil {
		t.Fatalf("upsert: %v", err)
	}
	org, wsID, ok := c.installOrg("T1")
	if !ok || org != "hanzo" || wsID != wsRec.Id {
		t.Fatalf("install lookup: org=%q ws=%q ok=%v", org, wsID, ok)
	}
	if _, _, ok := c.installOrg("T-unknown"); ok {
		t.Fatal("unknown team must be not-ok")
	}
	if err := c.upsertInstall("T1", wsRec.Id, "hanzo"); err != nil {
		t.Fatalf("re-upsert: %v", err)
	}
	if n, _ := app.CountRecords("slack_installs"); n != 1 {
		t.Fatalf("upsert must be idempotent, got %d rows", n)
	}
}

// An UNLINKED user gets the account-link prompt (with the signed link URL), and
// the agent is NOT run.
func TestAgentReply_UnlinkedPromptsLink(t *testing.T) {
	app, wsRec, _, _ := boot(t)
	addAgentCollections(t, app, wsRec)
	redirect := "https://api.hanzo.ai/v1/slack/link/callback"
	c := &controller{
		app:        app,
		cfg:        config{secret: "s", linkRedirect: redirect},
		userTokens: newUserTokenStore("http://unused", "hk"),
		oidc:       newOIDCClient("https://hanzo.id", "id", "sec", redirect),
	}
	if err := c.upsertInstall("T1", wsRec.Id, "hanzo"); err != nil {
		t.Fatalf("install: %v", err)
	}
	reply := c.agentReply(context.Background(), "T1", "U1", "hi")
	if !strings.Contains(reply, "/v1/slack/link?state=") {
		t.Fatalf("unlinked user should get a link prompt, got %q", reply)
	}
	if !strings.Contains(reply, "Connect your Hanzo account") {
		t.Fatalf("prompt text wrong: %q", reply)
	}
}

// A LINKED user runs the agent on-behalf-of their account: KMS yields the stored
// refresh token, IAM mints a fresh access token, and the gateway run carries
// THAT user bearer. The answer is returned verbatim.
func TestAgentReply_LinkedRunsOnBehalf(t *testing.T) {
	app, wsRec, _, _ := boot(t)
	addAgentCollections(t, app, wsRec)

	iam := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/iam/oauth/token" {
			_ = json.NewEncoder(w).Encode(map[string]any{
				"access_token": "at-user", "refresh_token": "r1", "token_type": "Bearer", "expires_in": 3600,
			})
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer iam.Close()

	kms := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet &&
			strings.Contains(r.URL.Path, "/orgs/hanzo/") &&
			strings.Contains(r.URL.Path, "slack-user-tokens") {
			_ = json.NewEncoder(w).Encode(map[string]any{
				"secret": map[string]string{"value": `{"refreshToken":"r1","subject":"sub-1","org":"hanzo"}`},
			})
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer kms.Close()

	var gotAuth, gotInput string
	gw := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		raw, _ := io.ReadAll(r.Body)
		var b map[string]string
		_ = json.Unmarshal(raw, &b)
		gotInput = b["input"]
		_ = json.NewEncoder(w).Encode(map[string]any{"status": "ok", "output": "42"})
	}))
	defer gw.Close()

	c := &controller{
		app: app,
		cfg: config{
			secret: "s", agentsBase: gw.URL, agentRef: "hanzo",
			linkRedirect: "https://api.hanzo.ai/v1/slack/link/callback",
		},
		userTokens: newUserTokenStore(kms.URL, "hk"),
		oidc:       newOIDCClient(iam.URL, "id", "sec", "https://api.hanzo.ai/v1/slack/link/callback"),
	}
	if err := c.upsertInstall("T1", wsRec.Id, "hanzo"); err != nil {
		t.Fatalf("install: %v", err)
	}
	if err := c.saveUserLink("T1", "U1", "sub-1", "hanzo"); err != nil {
		t.Fatalf("link: %v", err)
	}

	reply := c.agentReply(context.Background(), "T1", "U1", "what is 6*7")
	if reply != "42" {
		t.Fatalf("linked run should return the agent answer, got %q", reply)
	}
	if gotAuth != "Bearer at-user" {
		t.Fatalf("run must use the minted USER bearer, got %q", gotAuth)
	}
	if gotInput != "what is 6*7" {
		t.Fatalf("run input wrong: %q", gotInput)
	}
}

// linkedToken mints from the stored refresh token and PERSISTS a rotated refresh
// token back to KMS; an unlinked user returns ok=false with no error.
func TestLinkedToken_RefreshRotation(t *testing.T) {
	app, wsRec, _, _ := boot(t)
	addAgentCollections(t, app, wsRec)

	store := map[string]string{"slack-user-tokens/T1.U1": `{"refreshToken":"r1","subject":"s","org":"hanzo"}`}
	var saved string
	kms := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := strings.TrimPrefix(r.URL.Path, "/v1/kms/orgs/hanzo/secrets/")
		switch r.Method {
		case http.MethodGet:
			v, ok := store[key]
			if !ok {
				w.WriteHeader(http.StatusNotFound)
				return
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"secret": map[string]string{"value": v}})
		case http.MethodPost:
			raw, _ := io.ReadAll(r.Body)
			var b map[string]string
			_ = json.Unmarshal(raw, &b)
			store[b["path"]+"/"+b["name"]] = b["value"]
			saved = b["value"]
			w.WriteHeader(http.StatusCreated)
		}
	}))
	defer kms.Close()

	iam := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"access_token": "at2", "refresh_token": "r2", "token_type": "Bearer", "expires_in": 3600,
		})
	}))
	defer iam.Close()

	c := &controller{
		app:        app,
		cfg:        config{},
		userTokens: newUserTokenStore(kms.URL, "hk"),
		oidc:       newOIDCClient(iam.URL, "id", "sec", "x"),
	}
	if err := c.upsertInstall("T1", wsRec.Id, "hanzo"); err != nil {
		t.Fatalf("install: %v", err)
	}
	if err := c.saveUserLink("T1", "U1", "s", "hanzo"); err != nil {
		t.Fatalf("link: %v", err)
	}

	bearer, org, ok, err := c.linkedToken(context.Background(), "T1", "U1")
	if err != nil || !ok {
		t.Fatalf("linkedToken: ok=%v err=%v", ok, err)
	}
	if bearer != "at2" {
		t.Fatalf("minted bearer wrong: %q", bearer)
	}
	if org != "hanzo" {
		t.Fatalf("org wrong: %q", org)
	}
	if !strings.Contains(saved, "r2") {
		t.Fatalf("rotated refresh token not persisted to KMS: %q", saved)
	}

	_, _, ok2, err2 := c.linkedToken(context.Background(), "T1", "U-none")
	if ok2 || err2 != nil {
		t.Fatalf("unlinked must be ok=false with nil err, got ok=%v err=%v", ok2, err2)
	}
}
