// Package billing is a thin proxy onto commerce.hanzo.ai.
//
// Per docs (hanzo/universe/CLAUDE.md): Commerce is the single source
// of truth for billing, credits, usage and subscription state across
// every Hanzo service. team-go does not own any of that — it just
// reverse-proxies authenticated requests to /api/billing/* into the
// Commerce REST surface, attaching X-User-Id + X-Org-Id from the
// JWT-validated request context.
//
//	GET  /api/billing/subscription            — current plan
//	GET  /api/billing/usage?from=&to=         — usage records
//	GET  /api/billing/invoices                — invoice list
//	POST /api/billing/checkout                — start checkout session
//
// The Commerce endpoint is read from COMMERCE_ENDPOINT
// (default https://commerce.hanzo.ai). In-cluster, set to
// http://commerce.hanzo.svc:8001 to avoid a public hop.
package billing

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
	defaultEndpoint = "https://commerce.hanzo.ai"
	envEndpoint     = "COMMERCE_ENDPOINT"
)

// Register binds the /api/billing/* proxy onto app.
func Register(app core.App) {
	endpoint, err := url.Parse(commerceEndpoint())
	if err != nil {
		app.Logger().Error("billing: invalid COMMERCE_ENDPOINT", "err", err)
		return
	}

	client := &http.Client{Timeout: 15 * time.Second}

	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			e.Router.Any("/api/billing/{path...}", func(re *core.RequestEvent) error {
				return proxy(re, endpoint, client)
			})
			return e.Next()
		},
	})
}

func commerceEndpoint() string {
	if v := os.Getenv(envEndpoint); v != "" {
		return v
	}
	return defaultEndpoint
}

func proxy(re *core.RequestEvent, endpoint *url.URL, client *http.Client) error {
	if re.Auth == nil {
		return re.UnauthorizedError("billing requires auth", nil)
	}

	// /api/billing/foo → COMMERCE/api/billing/foo (Commerce serves
	// this surface natively, so no path rewrite).
	upstream := *endpoint
	upstream.Path = strings.TrimRight(endpoint.Path, "/") + re.Request.URL.Path
	upstream.RawQuery = re.Request.URL.RawQuery

	req, err := http.NewRequestWithContext(re.Request.Context(),
		re.Request.Method, upstream.String(), re.Request.Body)
	if err != nil {
		return re.InternalServerError("billing proxy build failed", err)
	}
	for k, v := range re.Request.Header {
		// Strip client-supplied identity headers — only the JWT-
		// validated path sets identity (per Hanzo HTTP header
		// convention). Authorization is forwarded.
		if k == "X-User-Id" || k == "X-Org-Id" || k == "X-User-Email" {
			continue
		}
		req.Header[k] = v
	}
	// Re-mint identity from validated auth ctx.
	req.Header.Set("X-User-Id", re.Auth.Id)
	req.Header.Set("X-User-Email", re.Auth.Email())
	if owner := re.Auth.GetString("owner"); owner != "" {
		req.Header.Set("X-Org-Id", owner)
	}

	resp, err := client.Do(req)
	if err != nil {
		return re.InternalServerError("commerce unreachable", err)
	}
	defer resp.Body.Close()

	for k, v := range resp.Header {
		re.Response.Header()[k] = v
	}
	re.Response.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(re.Response, resp.Body)
	return nil
}
