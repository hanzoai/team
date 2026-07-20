<p align="center"><img src=".github/hero.svg" alt="team-go" width="880"></p>

# hanzo-team

> **ARCHIVED.** hanzo.team is served in-process by the unified cloud binary —
> [`hanzoai/cloud`](https://github.com/hanzoai/cloud) `clients/team`. All
> hardening and features land there; this standalone repo is retired.

Single-binary Go backend for `hanzo.team`. Replaces the 40+
TypeScript/Node microservices the upstream fork shipped, while keeping the
existing Svelte frontend.

## What this is

```
hanzo-team (one Go process, one port)
├── @hanzo/base               # SQLite + admin UI + JSVM + plugin system
├── platform plugin           # Hanzo IAM auth, KMS, multi-tenant
├── jsvm plugin               # Goja runtime, .fn.ts handlers in goroutines
├── pkg/iam                   # /v1/iam/*     → IAM_ENDPOINT (OIDC reverse proxy)
├── pkg/account               # /v1/account/* → login + workspace select (front SPA)
├── pkg/auth                  # /v1/me, /v1/logout
├── pkg/billing               # /v1/billing/* → commerce.hanzo.ai
├── pkg/bot                   # /v1/bot/*     → hanzo.bot
├── pkg/chat                  # /v1/chat/*    → REST chunter (channels/msgs/presence)
├── pkg/bots                  # /v1/bots/*    → bots-as-members (IAM SAs + agents)
├── pkg/slack                 # /v1/slack/*   → bidirectional Slack relay
├── pkg/files                 # /v1/files/*   → 307 alias for Base blob API
├── pkg/subscribe             # /v1/subscribe → member-scoped WS record stream
├── pkg/transactor            # /transactor   → front data plane over ZAP (WS)
├── pkg/wsauth                # ONE place: workspace resolve + admin gate
├── functions/*.fn.ts         # ai, notify, calendar, github, … (one
│                             #   .fn.ts per legacy TS pod)
└── migrations/*.js           # workspaces, members, channels, messages,
                              #   presence, slack_mappings, …
```

Auth: ALL social federation (Google / GitHub / SAML / OIDC) is
configured **inside Hanzo IAM**. team-go never sees it — we are just
an OAuth client.

Billing: Commerce (`commerce.hanzo.ai`) is the single source of truth.
The `/v1/billing/*` surface here is a thin proxy that re-mints the
identity headers from the JWT-validated auth context. Chat + files are
storage (not per-call metered here); metered AI/agent runs debit credits
in Commerce (fail-closed 402) on the `/v1/bot` + `/v1/agents` paths.

AI: `/v1/bot/*` proxies to `hanzo.bot`. `/v1/ai/complete` (in
`functions/ai.fn.ts`) is a one-shot completion helper.

Chat: `/v1/chat/*` is the clean REST surface for chunter over the
`channels`/`messages`/`presence` collections (member-scoped). It is
orthogonal to the ZAP transactor the front SPA uses. Realtime = clients
`GET /v1/subscribe?collection=messages`; the REST layer is the req/resp
half (structured to later ride the cloud ZAP duplex).

Bots as members: `/v1/bots/*` (admin-gated) reconciles a workspace's
persistent bot members against Hanzo IAM agent service-accounts
(`GET /v1/iam/service-accounts?organization=`) ∪ the cloud agent
registry (`GET /v1/agents`). A bot is a `members` row whose account is
the **deterministic** `uuid v5("iam:sa:<id>")`, so re-sync never dupes.
A cron reconciles every workspace on `BOTS_SYNC_INTERVAL` (default 15m).

Slack (bidirectional): `/v1/slack/events` is the HMAC-verified webhook
(constant-time, 5-min replay window, event_id dedupe); `/v1/slack/connect`
+ `/v1/slack/oauth` are the admin OAuth flow (single-use, workspace-bound
signed `state`); `/v1/slack/mappings` bridges a Hanzo channel to a Slack
channel (admin, and only for a Slack team the workspace actually connected
— proven by a KMS token fetch). Slack bot tokens are stored via the
**canonical KMS secrets API** (`POST /v1/kms/orgs/{org}/secrets`; KMS
encrypts at rest — no wrap/unwrap, no DB column, never logged).

## Run locally

```bash
cp .env.example .env
# fill in IAM_CLIENT_SECRET if you have it; otherwise you can run
# with `IAM_ENDPOINT=disabled` and use Base's superuser bootstrap.

make dev
# → ./team serve --dev --http :8080
# → http://localhost:8080/_/        Base admin UI
# → http://localhost:8080/v1/       app API surface
```

Migration CLI:

```bash
./team migrate up                       # apply
./team migrate down 1                   # roll back 1 step
./team migrate create add_my_table      # scaffold .js
```

## Build

```bash
make build                              # local binary
make docker                             # ghcr.io/hanzoai/team:dev
```

The Dockerfile produces a distroless image (~30 MB) with the static
Go binary, compiled `.fn.js` and `.js` migrations. No node_modules,
no runtime npm.

## Deploy (prod)

`hanzoai/universe/infra/k8s/team-go/deployment.yaml` pins
`ghcr.io/hanzoai/team:<sem-ver>`. Env values come from the KMS-synced
`team-secret`:

| K8s Secret key       | Env                  |
|----------------------|----------------------|
| `iam_client_id`      | `IAM_CLIENT_ID`      |
| `iam_client_secret`  | `IAM_CLIENT_SECRET`  |
| `iam_endpoint`       | `IAM_ENDPOINT`       |
| `commerce_endpoint`  | `COMMERCE_ENDPOINT`  |
| `bot_endpoint`       | `BOT_ENDPOINT`       |
| `hanzo_api_key`      | `HANZO_API_KEY`      |

Storage: defaults to SQLite at `hz_data/data.db`. For multi-tenant
prod, point Base at Postgres via the standard `BASE_*` env knobs (see
`hanzo/base` docs).

## Porting one TypeScript pod at a time

Each legacy `pods/X/src/__start.ts` becomes one `functions/X.fn.ts`:

```ts
/// <reference path="./types.d.ts" />
routerAdd("POST", "/v1/x/foo", (e) => {
  if (!e.auth) return e.json(401, { error: "auth required" });
  // … your handler …
  return e.json(200, { ok: true });
});
```

`make functions` transpiles to `functions/dist/X.fn.js`; the JSVM
plugin loads them at boot. Each handler executes in a goroutine
against a pre-warmed Goja runtime — no per-pod containers, no
microservice fan-out.

## Layout

```
.
├── cmd/team/main.go        # ~80 lines — boot Base + plugins
├── pkg/auth/auth.go        # /v1/me, /v1/logout
├── pkg/billing/billing.go  # commerce proxy
├── pkg/bot/bot.go          # hanzo.bot proxy
├── functions/
│   ├── types.d.ts          # ambient types for .fn.ts
│   ├── ai.fn.ts
│   └── notify.fn.ts
├── migrations/
│   └── 1747260000_init_collections.js
├── Makefile
├── Dockerfile
├── .env.example
└── README.md
```
