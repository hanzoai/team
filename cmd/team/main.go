// Command team is the hanzo team backend — a single Go binary that
// embeds @hanzo/base for storage + admin, talks to hanzo.id for auth,
// commerce.hanzo.ai for billing, and hanzo.bot for the in-app agent.
//
// Local dev:  ./team serve --dev --http :8080
// Migrate:    ./team migrate up
// Prod:       team serve (env-configured)
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/hanzoai/base"
	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/plugins/jsvm"
	"github.com/hanzoai/base/plugins/migratecmd"
	"github.com/hanzoai/base/plugins/platform"
	"github.com/hanzoai/base/tools/hook"

	teamaccount "github.com/hanzoai/team-go/pkg/account"
	teamagents "github.com/hanzoai/team-go/pkg/agents"
	teamauth "github.com/hanzoai/team-go/pkg/auth"
	teambilling "github.com/hanzoai/team-go/pkg/billing"
	teambot "github.com/hanzoai/team-go/pkg/bot"
	teambots "github.com/hanzoai/team-go/pkg/bots"
	teamchat "github.com/hanzoai/team-go/pkg/chat"
	teamfiles "github.com/hanzoai/team-go/pkg/files"
	teamiam "github.com/hanzoai/team-go/pkg/iam"
	teammetrics "github.com/hanzoai/team-go/pkg/metrics"
	teamslack "github.com/hanzoai/team-go/pkg/slack"
	teamsubscribe "github.com/hanzoai/team-go/pkg/subscribe"
	teamtransactor "github.com/hanzoai/team-go/pkg/transactor"
)

func main() {
	app := base.New()

	// ---- JSVM hooks + migrations (the "absorbed" microservices) ----
	// functions/*.fn.{ts,js} run inside a Goja pool — one goroutine
	// per request. .ts is transpiled to .js at build time (see Makefile).
	jsvm.MustRegister(app, jsvm.Config{
		HooksDir:      envOr("TEAM_HOOKS_DIR", "./functions/dist"),
		MigrationsDir: envOr("TEAM_MIGRATIONS_DIR", "./migrations"),
		HooksWatch:    os.Getenv("TEAM_HOOKS_WATCH") != "false",
		HooksPoolSize: 15,
	})

	// ---- Migration CLI: ./team migrate up | create <name> ----
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		TemplateLang: migratecmd.TemplateLangJS,
		Automigrate:  true,
		Dir:          envOr("TEAM_MIGRATIONS_DIR", "./migrations"),
	})

	// ---- Hanzo IAM + KMS (the only auth path) ----
	// Federation (Google/GitHub/SAML/etc.) is configured INSIDE IAM —
	// this binary is just an OAuth client. Env contract is the
	// canonical IAM_* set from docs.hanzo.ai/services/iam/configuration.
	platform.MustRegister(app, platform.PlatformConfig{
		IAMEndpoint:     envOr("IAM_ENDPOINT", "https://hanzo.id"),
		IAMClientID:     os.Getenv("IAM_CLIENT_ID"),
		IAMClientSecret: os.Getenv("IAM_CLIENT_SECRET"),
		IAMOrg:          envOr("IAM_ORG", "hanzo"),
		IAMApp:          envOr("IAM_APP", "hanzo-team"),
		KMSEndpoint:     envOr("KMS_ENDPOINT", "https://kms.hanzo.ai"),
	})

	// ---- Native-Go services ----
	// /v1/health is the k8s readiness/liveness target — registered FIRST
	// so it shadows any later catch-all. Always returns 200 with the
	// running binary's commit (TEAM_VERSION env, set by Dockerfile build-arg).
	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			e.Router.GET("/v1/health", func(re *core.RequestEvent) error {
				return re.JSON(http.StatusOK, map[string]string{
					"status":  "ok",
					"version": envOr("TEAM_VERSION", "dev"),
				})
			})
			return e.Next()
		},
	})

	teamiam.Register(app)              // /v1/iam/*      → IAM_ENDPOINT (transparent OIDC reverse proxy)
	teamaccount.Register(app)          // /v1/account/*  → the account API (login, workspaces) over IAM
	teamagents.Register(app)           // /v1/agents/*   → api.hanzo.ai/v1/agents (the ONE cloud store); /v1/agent chat UI
	teamauth.Register(app)             // /v1/me, /v1/logout
	teambilling.Register(app)          // /v1/billing/*  → commerce.hanzo.ai
	teambot.Register(app)              // /v1/bot/*      → hanzo.bot (chat agent in-app)
	teamchat.Register(app)             // /v1/chat/*     → REST chunter (channels/messages/presence)
	teambots.Register(app)             // /v1/bots/*     → bots-as-members (IAM SAs + cloud agents), admin
	teamslack.Register(app)            // /v1/slack/*    → bidirectional Slack relay, admin + HMAC webhook
	teamfiles.Register(app)            // /v1/files/*    → 307 alias for Base /v1/base/files/*
	teamsubscribe.Register(app)        // /v1/subscribe  → WS record-change stream
	teamtransactor.Register(app)       // /transactor/*  → the workspace data plane over ZAP (WS)
	teamtransactor.RegisterMirror(app) // Base writes (chat/bots/slack) → the ZAP plane the SPA reads
	// metrics middleware MUST register before app.Start so its wrap
	// catches every other registered route.
	teammetrics.Register(app, envOr("TEAM_VERSION", "dev"))

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
