package account

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hanzoai/base/plugins/platform"
)

func TestOAuthBase(t *testing.T) {
	cases := []struct{ in, want string }{
		{"https://hanzo.id", "https://hanzo.id/v1/iam"},
		{"https://hanzo.id/", "https://hanzo.id/v1/iam"},
		{"", "https://hanzo.id/v1/iam"},
		{"http://localhost:8080", "http://localhost:8080/v1/iam"},
	}
	for _, c := range cases {
		if got := oauthBase(c.in); got != c.want {
			t.Errorf("oauthBase(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

// TestExchangeCodeHitsCanonicalEndpoint proves the server-side code exchange
// POSTs to ${IAMEndpoint}/v1/iam/oauth/token (JSON), not the bare
// ${IAMEndpoint}/oauth/token (the SPA that returns HTML 200). Regression guard
// for error=exchange_failed on hanzo.team.
func TestExchangeCodeHitsCanonicalEndpoint(t *testing.T) {
	var gotPath, gotClientID, gotSecret, gotCode, gotRedirect string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		_ = r.ParseForm()
		gotClientID = r.FormValue("client_id")
		gotSecret = r.FormValue("client_secret")
		gotCode = r.FormValue("code")
		gotRedirect = r.FormValue("redirect_uri")
		if r.URL.Path == "/v1/iam/oauth/token" {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"access_token":"AT","refresh_token":"RT"}`))
			return
		}
		// The bare /oauth/token path on the real IAM is the SPA: HTML 200.
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte("<!DOCTYPE html><html></html>"))
	}))
	defer srv.Close()

	g := &api{cfg: config{platform: platform.PlatformConfig{
		IAMEndpoint:     srv.URL,
		IAMClientID:     "hanzo-team",
		IAMClientSecret: "s3cr3t",
	}}}

	access, err := g.exchangeCode("code123", "https://hanzo.team/v1/account/auth/openid/callback")
	if err != nil {
		t.Fatalf("exchangeCode returned error: %v", err)
	}
	if gotPath != "/v1/iam/oauth/token" {
		t.Fatalf("exchange hit %q, want /v1/iam/oauth/token", gotPath)
	}
	if access != "AT" {
		t.Fatalf("access = %q, want AT", access)
	}
	if gotClientID != "hanzo-team" || gotSecret != "s3cr3t" || gotCode != "code123" ||
		gotRedirect != "https://hanzo.team/v1/account/auth/openid/callback" {
		t.Fatalf("exchange form mismatch: client_id=%q secret=%q code=%q redirect=%q",
			gotClientID, gotSecret, gotCode, gotRedirect)
	}
}

// TestExchangeCodeSurfacesOAuthError proves a JSON OAuth error body is surfaced
// (so the cause appears in logs) rather than masked as a generic failure.
func TestExchangeCodeSurfacesOAuthError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":"invalid_client","error_description":"client_secret is invalid"}`))
	}))
	defer srv.Close()

	g := &api{cfg: config{platform: platform.PlatformConfig{IAMEndpoint: srv.URL}}}
	_, err := g.exchangeCode("c", "https://x/cb")
	if err == nil {
		t.Fatal("expected error for invalid_client, got nil")
	}
}
