package files

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/tools/router"
)

// TestRedirectPathMath is a pure-function check of the
// /v1/files → /v1/base/files rewrite. The redirect handler itself
// just glues this to http.Redirect, so the unit-level invariant
// lives here (no need to spin up a full router).
func TestRedirectPathMath(t *testing.T) {
	cases := map[string]string{
		"/v1/files/posts/abc123/cover.png":    "/v1/base/files/posts/abc123/cover.png",
		"/v1/files/_users_auth_/u1/avatar.jpg": "/v1/base/files/_users_auth_/u1/avatar.jpg",
		"/v1/files/token":                      "/v1/base/files/token",
		"/v1/files":                            "/v1/base/files/",
	}
	for in, want := range cases {
		rest := strings.TrimPrefix(in, "/v1/files")
		if rest == "" {
			rest = "/"
		}
		got := basePrefix() + "/files" + rest
		if got != want {
			t.Errorf("input %q -> %q, want %q", in, got, want)
		}
	}
}

// TestBasePrefixOverride asserts the env override is honored — the
// alias must follow wherever Base is actually serving, otherwise
// downstream deployments that re-prefix Base would silently 404.
func TestBasePrefixOverride(t *testing.T) {
	t.Setenv("BASE_API_PREFIX", "/api")
	if got := basePrefix(); got != "/api" {
		t.Errorf("basePrefix() with override = %q, want /api", got)
	}
	if err := os.Unsetenv("BASE_API_PREFIX"); err != nil {
		t.Fatal(err)
	}
	if got := basePrefix(); got != "/v1/base" {
		t.Errorf("basePrefix() default = %q, want /v1/base", got)
	}
}

// TestRedirectHandler invokes the actual redirect handler — proves
// status 307, Location header carries the rewritten path + query,
// and method is preserved (browsers will replay the GET to /v1/base).
func TestRedirectHandler(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet,
		"/v1/files/posts/abc123/cover.png?token=t.k&thumb=128x128", nil)
	re := &core.RequestEvent{Event: router.Event{Response: rr, Request: req}}

	if err := redirect(re); err != nil {
		t.Fatalf("handler err: %v", err)
	}
	if rr.Code != http.StatusTemporaryRedirect {
		t.Errorf("status = %d, want 307", rr.Code)
	}
	loc := rr.Header().Get("Location")
	want := "/v1/base/files/posts/abc123/cover.png?token=t.k&thumb=128x128"
	if loc != want {
		t.Errorf("Location = %q, want %q", loc, want)
	}
}

// TestRedirectTokenPost exercises the alias for the POST token-mint
// endpoint — must still 307 and preserve method.
func TestRedirectTokenPost(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/files/token", nil)
	re := &core.RequestEvent{Event: router.Event{Response: rr, Request: req}}
	if err := redirect(re); err != nil {
		t.Fatalf("handler err: %v", err)
	}
	if rr.Code != http.StatusTemporaryRedirect {
		t.Errorf("status = %d, want 307", rr.Code)
	}
	if got := rr.Header().Get("Location"); got != "/v1/base/files/token" {
		t.Errorf("Location = %q", got)
	}
}

// TestQueryPreserved is the signed-URL contract: Base mints
// /v1/base/files/...?token=... and clients must follow the alias
// without losing the token, otherwise file_token auth dies.
func TestQueryPreserved(t *testing.T) {
	in := "/v1/files/posts/abc/cover.png"
	q := "token=signed.jwt.here&thumb=128x128"
	rest := strings.TrimPrefix(in, "/v1/files")
	got := basePrefix() + "/files" + rest + "?" + q
	want := "/v1/base/files/posts/abc/cover.png?token=signed.jwt.here&thumb=128x128"
	if got != want {
		t.Errorf("query-preserve got %q want %q", got, want)
	}
}
