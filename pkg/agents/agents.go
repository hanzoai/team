// Package agents bridges hanzo.team to the ONE canonical Hanzo Cloud agent
// store (api.hanzo.ai/v1/agents). There is no second store — team-go owns no
// agent state; this package is a same-origin, cookie-authenticated reverse
// proxy plus a minimal chat surface.
//
//	ANY /v1/agents{path...}  → ${HANZO_API_URL}/agents{path...}   (JSON + SSE)
//	GET /v1/agent            → a self-contained chat UI (true-black)
//
// The seam this closes: the browser only ever holds team-go's own HS256
// session token (jwt-simple / SERVER_SECRET), but the cloud gateway requires
// an RS256 IAM JWT so its SanitizeIdentity middleware can mint X-Org-Id from
// the verified `owner` claim. team-go already obtains that IAM access_token at
// login (authCallback → exchangeCode) and stashes it in the HttpOnly
// `hanzo_iam_token` cookie. This proxy reads that cookie and forwards it as
// `Authorization: Bearer …` to cloud — so cloud sees a real IAM token and the
// browser never has to handle it. Any client-supplied identity header is
// dropped; org scope comes only from the verified token.
package agents

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

// iamCookie carries the caller's IAM access_token (RS256). Set at login by
// pkg/account.authCallback; read here and forwarded to cloud.
const iamCookie = "hanzo_iam_token"

const (
	defaultAPIURL = "https://api.hanzo.ai/v1"
	envAPIURL     = "HANZO_API_URL"
)

// Register binds the agents proxy + UI onto app.
func Register(app core.App) {
	base, err := url.Parse(apiURL())
	if err != nil {
		app.Logger().Error("agents: invalid HANZO_API_URL", "err", err)
		return
	}
	// SSE-friendly client: no global timeout so streamed runs are not cut off
	// mid-flight; a plain /run still returns as soon as cloud does.
	client := &http.Client{}

	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			e.Router.GET("/v1/agent", handleUI)
			h := func(re *core.RequestEvent) error { return proxy(re, base, client) }
			e.Router.Any("/v1/agents", h)
			e.Router.Any("/v1/agents/{path...}", h)
			return e.Next()
		},
	})
}

func apiURL() string {
	if v := strings.TrimRight(os.Getenv(envAPIURL), "/"); v != "" {
		return v
	}
	return defaultAPIURL
}

// proxy forwards /v1/agents… to ${HANZO_API_URL}/agents…, injecting the IAM
// bearer from the hanzo_iam_token cookie. No cookie → 401 (never fall back to
// an ambient credential — that would run as the wrong principal).
func proxy(re *core.RequestEvent, base *url.URL, client *http.Client) error {
	tok := ""
	if c, err := re.Request.Cookie(iamCookie); err == nil {
		tok = c.Value
	}
	if tok == "" {
		return re.JSON(http.StatusUnauthorized, map[string]any{
			"error": "not signed in — sign in at hanzo.team first",
		})
	}

	// base already ends in /v1; strip the local /v1 so /v1/agents… lands on
	// ${base}/agents…. base=https://api.hanzo.ai/v1, path=/v1/agents/x/run
	// → https://api.hanzo.ai/v1/agents/x/run.
	upstream := *base
	upstream.Path = strings.TrimRight(base.Path, "/") + strings.TrimPrefix(re.Request.URL.Path, "/v1")
	upstream.RawQuery = re.Request.URL.RawQuery

	var body io.Reader
	switch re.Request.Method {
	case http.MethodPost, http.MethodPut, http.MethodPatch:
		body = re.Request.Body
	}
	req, err := http.NewRequestWithContext(re.Request.Context(), re.Request.Method, upstream.String(), body)
	if err != nil {
		return re.InternalServerError("agents proxy build failed", err)
	}

	// Clean allowlist: content negotiation only. We deliberately do NOT forward
	// any client X-Org-Id / X-User-* — org scope is derived by cloud from the
	// verified IAM token, never asserted by the browser.
	if ct := re.Request.Header.Get("Content-Type"); ct != "" {
		req.Header.Set("Content-Type", ct)
	}
	if ac := re.Request.Header.Get("Accept"); ac != "" {
		req.Header.Set("Accept", ac)
	}
	req.Header.Set("Authorization", "Bearer "+tok)
	req.Header.Set("X-Accel-Buffering", "no")

	// Streamed endpoints (SSE) must not be bounded by a client timeout.
	if isStreaming(re.Request.URL.Path) {
		client = &http.Client{Timeout: 0}
	} else {
		client = &http.Client{Timeout: 120 * time.Second}
	}

	resp, err := client.Do(req)
	if err != nil {
		return re.InternalServerError("agents service unreachable", err)
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
			return nil
		}
	}
}

func isStreaming(path string) bool {
	return strings.Contains(path, "/stream") ||
		strings.Contains(path, "/sse") ||
		strings.Contains(path, "/events")
}

// handleUI serves the minimal, self-contained chat page. It is same-origin, so
// the HttpOnly hanzo_iam_token cookie rides every fetch to /v1/agents… without
// any token ever touching page JS.
func handleUI(re *core.RequestEvent) error {
	re.Response.Header().Set("Content-Type", "text/html; charset=utf-8")
	re.Response.Header().Set("Cache-Control", "no-store")
	_, err := re.Response.Write([]byte(chatHTML))
	return err
}
