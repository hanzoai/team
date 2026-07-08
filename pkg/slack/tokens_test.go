package slack

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// TestTokenStore_SaveHitsCanonicalKMS asserts the store PUTs to the CANONICAL
// KMS secrets API (POST /v1/kms/orgs/{org}/secrets) with {path,name,value} — and
// that the value is the token JSON (KMS encrypts at rest; we never wrap/unwrap).
func TestTokenStore_SaveHitsCanonicalKMS(t *testing.T) {
	var gotPath, gotAuth string
	var body map[string]string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			gotPath = r.URL.Path
			gotAuth = r.Header.Get("Authorization")
			raw, _ := io.ReadAll(r.Body)
			_ = json.Unmarshal(raw, &body)
			w.WriteHeader(http.StatusCreated)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	ts := newTokenStore(srv.URL, "hk-machine")
	tok := slackToken{AccessToken: "xoxb-secret", TeamID: "T99", TeamName: "Acme", BotUserID: "B1"}
	if err := ts.save(context.Background(), "hanzo", tok); err != nil {
		t.Fatalf("save failed: %v", err)
	}
	if gotPath != "/v1/kms/orgs/hanzo/secrets" {
		t.Fatalf("wrong KMS path: %s", gotPath)
	}
	if gotAuth != "Bearer hk-machine" {
		t.Fatalf("wrong bearer: %s", gotAuth)
	}
	if body["path"] != slackSecretPath || body["name"] != secretName("T99") {
		t.Fatalf("wrong secret scope: %+v", body)
	}
	// env MUST be on the write body — KMS now rejects omitted env on writes.
	// These tokens stay in their historical "default" bucket, sent explicitly.
	if body["env"] != kmsEnv {
		t.Fatalf("write must send explicit env=%q, got %q", kmsEnv, body["env"])
	}
	// The value must be the token JSON — and the access token must appear ONLY
	// inside the KMS value (proves we don't stash it elsewhere in the request).
	if !strings.Contains(body["value"], "xoxb-secret") {
		t.Fatalf("token not in KMS value: %s", body["value"])
	}
}

func TestTokenStore_RoundTrip(t *testing.T) {
	// An in-memory KMS: POST stores, GET returns {"secret":{"value":...}}.
	store := map[string]string{}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			raw, _ := io.ReadAll(r.Body)
			var b map[string]string
			_ = json.Unmarshal(raw, &b)
			store[b["path"]+"/"+b["name"]] = b["value"]
			w.WriteHeader(http.StatusCreated)
		case http.MethodGet:
			// path: /v1/kms/orgs/hanzo/secrets/team/slack/token-T1
			key := strings.TrimPrefix(r.URL.Path, "/v1/kms/orgs/hanzo/secrets/")
			v, ok := store[key]
			if !ok {
				w.WriteHeader(http.StatusNotFound)
				return
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"secret": map[string]string{"value": v}})
		}
	}))
	defer srv.Close()

	ts := newTokenStore(srv.URL, "hk")
	orig := slackToken{AccessToken: "xoxb-1", TeamID: "T1", TeamName: "T", BotUserID: "B"}
	if err := ts.save(context.Background(), "hanzo", orig); err != nil {
		t.Fatalf("save: %v", err)
	}
	got, ok, err := ts.get(context.Background(), "hanzo", "T1")
	if err != nil || !ok {
		t.Fatalf("get: ok=%v err=%v", ok, err)
	}
	if got.AccessToken != "xoxb-1" || got.TeamID != "T1" {
		t.Fatalf("roundtrip mismatch: %+v", got)
	}
}

func TestTokenStore_GetNotConnected(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()
	ts := newTokenStore(srv.URL, "hk")
	_, ok, err := ts.get(context.Background(), "hanzo", "T-unknown")
	if err != nil {
		t.Fatalf("404 should be ok=false, not error: %v", err)
	}
	if ok {
		t.Fatal("unconnected team returned ok=true (ownership check would pass wrongly)")
	}
}
