// Package auth surfaces the small set of endpoints the Team Svelte UI
// needs on top of what hanzo/base's platform plugin already provides:
//
//	GET  /v1/me     — returns the resolved IAM user from the request ctx
//	POST /v1/logout — clears the local session cookie (IAM end-session
//	                  is reachable at IAM_ENDPOINT/oauth/logout)
//
// All actual auth — code exchange, JWT validation, /oauth/userinfo —
// is handled by hanzo/base/plugins/platform. This file is just thin UI
// glue. Federation (Google, GitHub, SAML, OIDC) is configured INSIDE
// Hanzo IAM; team-go never sees it.
package auth

import (
	"net/http"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/tools/hook"
)

// Register binds /v1/me and /v1/logout on the Base app.
func Register(app core.App) {
	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			e.Router.GET("/v1/me", handleMe)
			e.Router.POST("/v1/logout", handleLogout)
			return e.Next()
		},
	})
}

// handleMe returns the current user record. The platform plugin
// populates the auth record on the request context after JWT
// validation. If the request is unauthenticated, return 401.
func handleMe(e *core.RequestEvent) error {
	authRecord := e.Auth
	if authRecord == nil {
		return e.UnauthorizedError("not authenticated", nil)
	}
	return e.JSON(http.StatusOK, map[string]any{
		"id":           authRecord.Id,
		"email":        authRecord.Email(),
		"name":         authRecord.GetString("name"),
		"avatar":       authRecord.GetString("avatar"),
		"collectionId": authRecord.Collection().Id,
	})
}

// handleLogout clears the local cookie. To globally sign out (revoke
// IAM SSO session) the client should additionally hit
// `${IAM_ENDPOINT}/oauth/logout` — that is a frontend concern.
func handleLogout(e *core.RequestEvent) error {
	e.Response.Header().Set("Clear-Site-Data", `"cookies"`)
	return e.NoContent(http.StatusNoContent)
}
