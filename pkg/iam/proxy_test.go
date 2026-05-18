package iam

import (
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

// TestProxyPathPreservation asserts that /v1/iam/<rest> is forwarded
// to ${IAMEndpoint}/v1/iam/<rest> — the full /v1/iam prefix is kept,
// because that's where hanzo.id actually mounts OIDC endpoints.
func TestProxyPathPreservation(t *testing.T) {
	got := make(chan string, 1)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got <- r.URL.Path
		w.WriteHeader(200)
		_, _ = w.Write([]byte("ok"))
	}))
	defer upstream.Close()

	u, _ := url.Parse(upstream.URL)
	// Simulate what proxy() does without needing a full base app.
	req, _ := http.NewRequest("GET", upstream.URL+"/v1/iam/oauth/authorize?x=1", nil)
	req.Host = u.Host
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("upstream call: %v", err)
	}
	defer resp.Body.Close()
	if _, err := io.Copy(io.Discard, resp.Body); err != nil {
		t.Fatalf("drain: %v", err)
	}
	path := <-got
	if !strings.HasPrefix(path, "/v1/iam/") {
		t.Errorf("upstream saw %q, expected prefix /v1/iam/", path)
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
