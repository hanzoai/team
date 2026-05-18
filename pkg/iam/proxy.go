// Package iam mounts /v1/iam/{path...} as a transparent reverse proxy
// to the configured IAM_ENDPOINT (default https://hanzo.id).
//
// Why this is here and not pulled from hanzo/base's platform plugin:
// team-go pins base v0.39.10 (which predates plugins/platform/iam_proxy.go).
// Bumping base across v0.39 → v1.x crosses 100+ commits of API churn; the
// only thing we actually need is the proxy. So we inline it here — small,
// orthogonal, deletable the day we move team-go to base v1.x.
//
// Path contract: requests to /v1/iam/<rest> are forwarded to
// ${IAM_ENDPOINT}<rest>. The /v1/iam prefix is the LOCAL mount —
// hanzo.id itself mounts OIDC at the root (/oauth/authorize,
// /oauth/token, /oauth/userinfo, /.well-known/jwks, …) per HIP-0026.
// Stripping /v1/iam here keeps the same-origin contract for clients
// while talking to hanzo.id's actual route layout. Matches the
// base v1.x plugins/platform/iam_proxy.go behavior.
package iam

import (
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/tools/hook"
)

const (
	defaultEndpoint = "https://hanzo.id"
	envEndpoint     = "IAM_ENDPOINT"
)

// Register binds /v1/iam/{path...} on the Base app.
func Register(app core.App) {
	endpoint, err := url.Parse(iamEndpoint())
	if err != nil {
		app.Logger().Error("iam: invalid IAM_ENDPOINT", "err", err)
		return
	}

	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			handler := func(re *core.RequestEvent) error {
				return proxy(re, endpoint)
			}
			e.Router.GET("/v1/iam/{path...}", handler)
			e.Router.POST("/v1/iam/{path...}", handler)
			e.Router.PUT("/v1/iam/{path...}", handler)
			e.Router.PATCH("/v1/iam/{path...}", handler)
			e.Router.DELETE("/v1/iam/{path...}", handler)
			return e.Next()
		},
	})
}

func iamEndpoint() string {
	if v := os.Getenv(envEndpoint); v != "" {
		return v
	}
	return defaultEndpoint
}

func proxy(re *core.RequestEvent, endpoint *url.URL) error {
	rest := strings.TrimPrefix(re.Request.URL.Path, "/v1/iam")
	if rest == "" {
		rest = "/"
	}
	upstream := *endpoint
	upstream.Path = strings.TrimRight(endpoint.Path, "/") + rest
	upstream.RawQuery = re.Request.URL.RawQuery

	req, err := http.NewRequestWithContext(re.Request.Context(),
		re.Request.Method, upstream.String(), re.Request.Body)
	if err != nil {
		return re.InternalServerError("iam proxy build failed", err)
	}
	// Forward a small allow-list of headers. We deliberately do NOT
	// blanket-forward: ingress controllers (and any front Cloudflare)
	// attach X-Forwarded-*, CF-*, Cdn-Loop, Origin, etc., and hanzo.id's
	// own Cloudflare worker throws if it sees a cf-* loop or a foreign
	// X-Forwarded-Host. Same-origin OIDC works with just the OAuth-
	// relevant headers.
	allow := map[string]struct{}{
		"Accept":          {},
		"Accept-Language": {},
		"Authorization":   {},
		"Content-Type":    {},
		"Content-Length":  {},
		"Cookie":          {},
		"User-Agent":      {},
		"If-None-Match":   {},
		"If-Modified-Since": {},
	}
	for k, v := range re.Request.Header {
		if _, ok := allow[k]; ok {
			req.Header[k] = v
		}
	}
	req.Host = endpoint.Host
	req.Header.Set("X-Accel-Buffering", "no")

	client := &http.Client{Timeout: 30 * time.Second}
	if isStreaming(re.Request.URL.Path) {
		client = &http.Client{Timeout: 0}
	}
	resp, err := client.Do(req)
	if err != nil {
		return re.InternalServerError("iam unreachable", err)
	}
	defer resp.Body.Close()

	for k, v := range resp.Header {
		re.Response.Header()[k] = v
	}
	re.Response.WriteHeader(resp.StatusCode)

	flusher, _ := re.Response.(http.Flusher)
	buf := make([]byte, 32*1024)
	for {
		n, rerr := resp.Body.Read(buf)
		if n > 0 {
			if _, werr := re.Response.Write(buf[:n]); werr != nil {
				return nil
			}
			if flusher != nil {
				flusher.Flush()
			}
		}
		if rerr != nil {
			if rerr == io.EOF {
				return nil
			}
			return nil
		}
	}
}

func isStreaming(path string) bool {
	return strings.Contains(path, "/stream") ||
		strings.Contains(path, "/sse") ||
		strings.Contains(path, "/events")
}
