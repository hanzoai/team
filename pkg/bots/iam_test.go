package bots

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestMapIamUser_Envelope(t *testing.T) {
	// owner → organization; forbidden OR deleted → disabled.
	got := mapIamUser(iamUser{
		ID: "id1", Name: "hanzo-triage", Owner: "hanzo",
		DisplayName: "Triage", AgentModel: "opus", IsForbidden: false, IsDeleted: false,
	})
	if got.Organization != "hanzo" {
		t.Fatalf("owner not mapped to organization: %q", got.Organization)
	}
	if got.Disabled {
		t.Fatal("active SA marked disabled")
	}
	if mapIamUser(iamUser{IsForbidden: true}).Disabled != true {
		t.Fatal("forbidden should be disabled")
	}
	if mapIamUser(iamUser{IsDeleted: true}).Disabled != true {
		t.Fatal("deleted should be disabled")
	}
}

func TestListServiceAccounts_ParsesEnvelope(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Assert the canonical path + query + bearer.
		if r.URL.Path != "/v1/iam/service-accounts" {
			t.Errorf("wrong path: %s", r.URL.Path)
		}
		if r.URL.Query().Get("organization") != "hanzo" {
			t.Errorf("missing org query: %s", r.URL.RawQuery)
		}
		if !strings.HasPrefix(r.Header.Get("Authorization"), "Bearer ") {
			t.Errorf("missing bearer")
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok","data":[
			{"id":"a","name":"hanzo-a","owner":"hanzo","type":"agent"},
			{"id":"b","name":"hanzo-b","owner":"hanzo","isForbidden":true}
		]}`))
	}))
	defer srv.Close()

	c := newIAMClient(srv.URL, staticToken("hk-test"))
	sas, err := c.listServiceAccounts(context.Background(), "hanzo")
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if len(sas) != 2 {
		t.Fatalf("want 2 SAs, got %d", len(sas))
	}
	if sas[0].Organization != "hanzo" || sas[1].Disabled != true {
		t.Fatalf("envelope mapping wrong: %+v", sas)
	}
}

func TestListServiceAccounts_ErrorEnvelopeIsError(t *testing.T) {
	// A 200 with status:"error" (IAM unauthorized) is an ERROR, not empty.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"error","msg":"Unauthorized operation"}`))
	}))
	defer srv.Close()

	c := newIAMClient(srv.URL, staticToken("hk-test"))
	_, err := c.listServiceAccounts(context.Background(), "hanzo")
	if err == nil {
		t.Fatal("status:error envelope must surface as an error")
	}
	if !strings.Contains(err.Error(), "Unauthorized operation") {
		t.Fatalf("error msg not propagated: %v", err)
	}
}

func TestListServiceAccounts_HTTPError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
		_, _ = w.Write([]byte(`forbidden`))
	}))
	defer srv.Close()
	c := newIAMClient(srv.URL, staticToken("hk-test"))
	if _, err := c.listServiceAccounts(context.Background(), "hanzo"); err == nil {
		t.Fatal("HTTP 403 must be an error")
	}
}
