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

// runAgent posts to {base}/v1/agents/{ref}/run with {"input":...} and the USER's
// bearer, and reads the RunResult `output`.
func TestRunAgent_RequestShape(t *testing.T) {
	var gotPath, gotAuth, gotCT string
	var gotBody map[string]string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotAuth = r.Header.Get("Authorization")
		gotCT = r.Header.Get("Content-Type")
		raw, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(raw, &gotBody)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"id": "run_1", "status": "ok", "output": "the answer is 42", "model": "zen",
		})
	}))
	defer srv.Close()

	out, err := runAgent(context.Background(), srv.URL, "hanzo", "what is the answer", "at-user")
	if err != nil {
		t.Fatalf("run: %v", err)
	}
	if out != "the answer is 42" {
		t.Fatalf("output parsed wrong: %q", out)
	}
	if gotPath != "/v1/agents/hanzo/run" {
		t.Fatalf("path wrong: %s", gotPath)
	}
	if gotAuth != "Bearer at-user" {
		t.Fatalf("must carry the USER bearer, got %q", gotAuth)
	}
	if !strings.HasPrefix(gotCT, "application/json") {
		t.Fatalf("content-type: %s", gotCT)
	}
	if gotBody["input"] != "what is the answer" {
		t.Fatalf("body input wrong: %+v", gotBody)
	}
}

// team-go must NOT forge X-Org-Id / X-User-Id — the gateway mints them from the
// user bearer (HIP-0026). Sending them would be an untrusted client-supplied org.
func TestRunAgent_NoForgedIdentityHeaders(t *testing.T) {
	var org, user string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		org = r.Header.Get("X-Org-Id")
		user = r.Header.Get("X-User-Id")
		_ = json.NewEncoder(w).Encode(map[string]any{"status": "ok", "output": "ok"})
	}))
	defer srv.Close()
	if _, err := runAgent(context.Background(), srv.URL, "hanzo", "x", "at"); err != nil {
		t.Fatalf("run: %v", err)
	}
	if org != "" || user != "" {
		t.Fatalf("must not forge identity headers, got org=%q user=%q", org, user)
	}
}

// A run that executed but the model failed comes back 502 with status!=ok — that
// is surfaced as an error (never a fabricated success).
func TestRunAgent_ErrorRunSurfaced(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
		_ = json.NewEncoder(w).Encode(map[string]any{"status": "error", "error": "model timeout"})
	}))
	defer srv.Close()
	if _, err := runAgent(context.Background(), srv.URL, "hanzo", "x", "at"); err == nil {
		t.Fatal("error run must surface an error")
	}
}

// A run is never attempted without a user bearer.
func TestRunAgent_RequiresBearer(t *testing.T) {
	if _, err := runAgent(context.Background(), "http://unused", "hanzo", "in", ""); err == nil {
		t.Fatal("missing bearer must error (never run unauthenticated)")
	}
}
