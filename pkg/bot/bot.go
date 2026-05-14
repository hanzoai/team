// Package bot wires hanzo.bot (the in-app AI agent) into team-go.
//
// hanzo.bot is the unified Hanzo Bot framework (hanzoai/bot v1.0.0
// wrapper, runtimes in hanzobot/ts, hanzobot/go, etc.). This package
// exposes a single SSE endpoint that team's Svelte UI can talk to:
//
//	POST /api/bot/chat   { messages: [...] }   → SSE stream
//	GET  /api/bot/skills                       → skill list (cached)
//
// Skills + auth + rate limits live inside hanzo.bot. team-go just
// forwards requests with the JWT-validated identity so the bot can
// scope tool access per user/org.
package bot

import (
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/tools/hook"
)

const (
	defaultEndpoint = "https://hanzo.bot"
	envEndpoint     = "BOT_ENDPOINT"
)

// Register binds /api/bot/* onto app.
func Register(app core.App) {
	endpoint, err := url.Parse(botEndpoint())
	if err != nil {
		app.Logger().Error("bot: invalid BOT_ENDPOINT", "err", err)
		return
	}

	// SSE-friendly client: no global timeout; per-request stream.
	client := &http.Client{}

	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			e.Router.Any("/api/bot/{path...}", func(re *core.RequestEvent) error {
				return proxy(re, endpoint, client)
			})
			return e.Next()
		},
	})
}

func botEndpoint() string {
	if v := os.Getenv(envEndpoint); v != "" {
		return v
	}
	return defaultEndpoint
}

func proxy(re *core.RequestEvent, endpoint *url.URL, client *http.Client) error {
	if re.Auth == nil {
		return re.UnauthorizedError("bot requires auth", nil)
	}

	upstream := *endpoint
	upstream.Path = strings.TrimRight(endpoint.Path, "/") + re.Request.URL.Path
	upstream.RawQuery = re.Request.URL.RawQuery

	req, err := http.NewRequestWithContext(re.Request.Context(),
		re.Request.Method, upstream.String(), re.Request.Body)
	if err != nil {
		return re.InternalServerError("bot proxy build failed", err)
	}
	for k, v := range re.Request.Header {
		if k == "X-User-Id" || k == "X-Org-Id" || k == "X-User-Email" {
			continue
		}
		req.Header[k] = v
	}
	req.Header.Set("X-User-Id", re.Auth.Id)
	req.Header.Set("X-User-Email", re.Auth.Email())
	if owner := re.Auth.GetString("owner"); owner != "" {
		req.Header.Set("X-Org-Id", owner)
	}
	// Force chunked transfer + disable proxy buffering so SSE streams
	// reach the browser as they come off hanzo.bot.
	req.Header.Set("X-Accel-Buffering", "no")

	// Override client timeout for SSE-style streams.
	if strings.Contains(req.URL.Path, "/chat") || strings.Contains(req.URL.Path, "/stream") {
		client.Timeout = 0
	} else {
		client.Timeout = 30 * time.Second
	}

	resp, err := client.Do(req)
	if err != nil {
		return re.InternalServerError("bot unreachable", err)
	}
	defer resp.Body.Close()

	for k, v := range resp.Header {
		re.Response.Header()[k] = v
	}
	re.Response.WriteHeader(resp.StatusCode)

	flusher, _ := re.Response.(http.Flusher)
	buf := make([]byte, 4096)
	for {
		n, err := resp.Body.Read(buf)
		if n > 0 {
			_, _ = re.Response.Write(buf[:n])
			if flusher != nil {
				flusher.Flush()
			}
		}
		if err != nil {
			break
		}
	}
	return nil
}
