package bots

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAgentsClient_ListMapsToServiceAccounts(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/agents" {
			t.Errorf("wrong path: %s", r.URL.Path)
		}
		if r.Header.Get("X-Org-Id") != "hanzo" {
			t.Errorf("org not forwarded: %s", r.Header.Get("X-Org-Id"))
		}
		_, _ = w.Write([]byte(`{"agents":[
			{"id":"ag1","name":"researcher","model":"opus","status":"active"},
			{"id":"ag2","name":"retired","model":"haiku","status":"archived"}
		]}`))
	}))
	defer srv.Close()

	c := newAgentsClient(srv.URL)
	sas, err := c.list(context.Background(), "hanzo", "u1", "bearer")
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(sas) != 2 {
		t.Fatalf("want 2, got %d", len(sas))
	}
	// Cloud agent ids are namespaced "agent:<id>" so they never collide with IAM SA ids.
	if sas[0].ID != "agent:ag1" {
		t.Fatalf("agent id not namespaced: %s", sas[0].ID)
	}
	if sas[0].Disabled {
		t.Fatal("active agent marked disabled")
	}
	// A non-active status (archived) → disabled, so reconcile removes its member.
	if !sas[1].Disabled {
		t.Fatal("archived agent should be disabled")
	}
}

func TestNewAgentsClient_EmptyBaseIsNil(t *testing.T) {
	if newAgentsClient("") != nil {
		t.Fatal("empty AGENTS_ENDPOINT should yield a nil client (feature off)")
	}
}
