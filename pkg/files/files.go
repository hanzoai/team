// Package files exposes /v1/files/{collection}/{recordId}/{filename}
// as a same-origin alias for the Base file API.
//
// Base mounts the file API at ${BASE_API_PREFIX}/files/{collection}/...
// (default /v1/base/files/...). Huly clients and first-party UIs both
// prefer the shorter /v1/files/... shape and shouldn't need to know
// the Base prefix exists. We solve that with a 307 Temporary Redirect:
//
//   - 307 preserves the request method and body (we don't actually need
//     either for downloads, but it costs nothing and keeps the alias
//     useful for future write endpoints).
//   - The query string (including Base's signed ?token=...) is carried
//     verbatim — match Base's signed-URL behavior 1:1.
//   - It's a single redirect, no proxy hop, no header laundering — the
//     browser fetches Base's CDN-cacheable URL directly.
//
// We deliberately do NOT reverse-proxy: the file handler already
// streams from filesystem.System through the Base router, and copying
// the bytes through another goroutine would just halve throughput
// while breaking range requests + ETag negotiation.
package files

import (
	"net/http"
	"os"
	"strings"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/tools/hook"
)

// Register binds /v1/files/{path...} on the Base app.
func Register(app core.App) {
	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			e.Router.GET("/v1/files/{path...}", redirect)
			e.Router.POST("/v1/files/token", redirect) // token-mint passthrough
			return e.Next()
		},
	})
}

// basePrefix mirrors apis.NewRouter's BASE_API_PREFIX lookup so
// /v1/files/x routes to whatever prefix Base is actually serving.
func basePrefix() string {
	if v := os.Getenv("BASE_API_PREFIX"); v != "" {
		return v
	}
	return "/v1/base"
}

func redirect(re *core.RequestEvent) error {
	rest := strings.TrimPrefix(re.Request.URL.Path, "/v1/files")
	if rest == "" {
		rest = "/"
	}
	target := basePrefix() + "/files" + rest
	if re.Request.URL.RawQuery != "" {
		target += "?" + re.Request.URL.RawQuery
	}
	// 307 preserves method + body. 308 would also work but Safari < 14
	// is buggy with cached 308s; 307 is the safe default.
	http.Redirect(re.Response, re.Request, target, http.StatusTemporaryRedirect)
	return nil
}
