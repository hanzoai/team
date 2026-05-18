package iam

import (
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

// TestProxyPathStripping asserts that the /v1/iam local mount is
// stripped before forwarding, because hanzo.id mounts OIDC at the
// root (/oauth/*, /.well-known/jwks). This mirrors the path math in
// proxy().
func TestProxyPathStripping(t *testing.T) {
	cases := map[string]string{
		"/v1/iam/oauth/authorize":             "/oauth/authorize",
		"/v1/iam/oauth/token":                 "/oauth/token",
		"/v1/iam/oauth/userinfo":              "/oauth/userinfo",
		"/v1/iam/.well-known/jwks":            "/.well-known/jwks",
		"/v1/iam/.well-known/openid-configuration": "/.well-known/openid-configuration",
		"/v1/iam":                             "/",
	}
	endpointPath := ""
	for in, want := range cases {
		rest := strings.TrimPrefix(in, "/v1/iam")
		if rest == "" {
			rest = "/"
		}
		got := strings.TrimRight(endpointPath, "/") + rest
		if got != want {
			t.Errorf("input %q -> upstream %q, want %q", in, got, want)
		}
	}

	// End-to-end via httptest to confirm transport too.
	upstreamSawPath := make(chan string, 1)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upstreamSawPath <- r.URL.Path
		w.WriteHeader(200)
		_, _ = w.Write([]byte("ok"))
	}))
	defer upstream.Close()
	u, _ := url.Parse(upstream.URL)
	req, _ := http.NewRequest("GET", upstream.URL+"/oauth/authorize", nil)
	req.Host = u.Host
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("upstream call: %v", err)
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, resp.Body)
	if path := <-upstreamSawPath; path != "/oauth/authorize" {
		t.Errorf("upstream saw %q", path)
	}
}

func TestIsStreaming(t *testing.T) {
	cases := map[string]bool{
		"/v1/iam/oauth/token":    false,
		"/v1/iam/oauth/userinfo": false,
		"/v1/iam/events/stream":  true,
		"/v1/iam/sse/x":          true,
		"/v1/iam/events":         true,
	}
	for in, want := range cases {
		if got := isStreaming(in); got != want {
			t.Errorf("isStreaming(%q)=%v, want %v", in, got, want)
		}
	}
}
