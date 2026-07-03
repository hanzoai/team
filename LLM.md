# team-go — Hanzo Team backend, mounted into the unified cloud binary (HIP-0106)

## What this is

The Hanzo Team (hanzo.team) backend: account (IAM-bridged OIDC), the Huly
**transactor** (the ZAP/model wire protocol the SPA speaks), chat/presence, bots,
Slack, files — all on **Hanzo Base** (`github.com/hanzoai/base`, embedded SQLite).
The Huly **front** SPA (`~/work/hanzo/team`) is reused unchanged; team-go serves
the contract it expects.

## Target architecture — one binary, one deploy

team-go is **NOT** a standalone Deployment. Per the firm directive
("all of team-go should merge into unified cloud should not be two deploys") and
HIP-0106, team is a **cloud subsystem** mounted into the ONE unified cloud binary
(`github.com/hanzoai/cloud`) via the canonical `Mount(app *zip.App, deps cloud.Deps)`
+ `cloud.Register` contract — the SAME pattern cloud uses for base/ai/authz/vfs.
Served from the one cloud binary at **`/v1/team/*`** (namespaced; bare `/v1/` is the
LLM router) + the transactor at **`/v1/team/transactor`**.

### Module story (decided)

team-go **stays its own Go module** `github.com/hanzoai/team-go`, mirroring how
`hanzoai/base` and `hanzoai/ai` are separate modules that cloud imports:

- team-go depends on `github.com/hanzoai/cloud` for the `Mount`/`Register`/`Deps`
  contract (base's own `mount.go` does exactly this — cloud root never imports
  team, only `cloud/subsystems` blank-imports it, so there is no cycle).
- team-go exposes a top-level `team.Mount(app *zip.App, deps cloud.Deps) error`
  + `init()` → `cloud.RegisterWithShutdown("team", 129, mount, Shutdown)`.
- `cloud/subsystems/subsystems.go` adds `_ "github.com/hanzoai/team-go"`.
- team-go upgrades **base v0.39.10 → v1.4.6** (cloud's version — one module graph,
  one base version). This is a compile-alignment pass, not a rewrite: the
  PocketBase-lineage API team uses (`OnServe`, `RequestEvent.JSON/BindBody/*Error`,
  `NewRecord`, `NewBaseCollection`, `OnRecordAfter*Success`) is stable across the
  jump.
- `cmd/team/main.go` (standalone daemon) **stays** for local dev, exactly like
  base keeps its standalone daemon. Production is via cloud.

Rejected alternative — porting team to raw-SQLite-on-zip (crm/agents style): team's
data plane IS Base collections + record-hooks + realtime (the mirror bridges Base
writes → transactor via `OnRecordAfterCreateSuccess`). Rewriting that reimplements
Base's collection/hook/realtime engine — massive new code, violates "reuse Base
plumbing, write as little code as possible." team keeps its `core.App`.

### Base-instance model (decided): team owns its own core.App

cloud's `base` subsystem builds ONE generic Base at `/v1/base` and does NOT expose
its instance; base v1.4.6 carries process-global `AppMigrations`/`SystemMigrations`/
`Fields`, so its `mount.go` warns "call base.Mount AT MOST ONCE per process."

team does **not** call `base.Mount`. team builds its **own** `core.App` via
`base.NewWithConfig(Config{DefaultDataDir: {deps.DataDir}/team, HideStartBanner:true})`
— exactly as the standalone `cmd/team` binary does today. The shared globals are
safe: `Fields` is a read-only type registry; the base *system* migrations are
idempotent collection-creates that BOTH Base apps legitimately need; team's own
schema is per-instance JS migrations from `migrations/` (not the Go global).
`base.Mount` (the generic `/v1/base`) remains the only caller of the package-global
`mountedHandle`/env path.

### Mount mechanics

`apis.NewRouter(app).BuildMux()` binds base's built-in routes but does **NOT** fire
`OnServe` (that lives in `apis/serve.go`). team registers ALL its routes via
`OnServe`, so `team.Mount` replicates `apis/serve.go`'s route-collection sequence:

1. `b := base.NewWithConfig(...)`; `b.Bootstrap()`.
2. Register every team concern on `b` (account/auth/billing/bot/bots/chat/files/
   iam/slack/subscribe + transactor + mirror + metrics), plus jsvm (functions/) +
   migratecmd (migrations/) + platform (IAM/KMS from `deps`).
3. Set `BASE_API_PREFIX=/v1/team` (sequenced AFTER base subsystem mounted at
   order 60, so the process-env write does not race base's `/v1/base`).
4. `r := apis.NewRouter(b)`; build a `ServeEvent{App:b, Router:r, ...}`; fire
   `b.OnServe().Trigger(serveEvent, …)` to run every team + platform OnServe hook;
   `handler := r.BuildMux()`.
5. `app.Mount("/v1/team", handler)` — `zip.App.Mount` does NOT strip the prefix
   (base mounts `/v1/base/*` at `/v1/base` and works), so team routes carry full
   `/v1/team/*` paths.

Route namespacing: every team custom route moves `/v1/<x>` → `/v1/team/<x>`; the
transactor mount `/transactor` → `/v1/team/transactor`; base's built-in collection/
file/realtime routes land under `/v1/team` via `BASE_API_PREFIX`. team drops its own
`/v1/health` — cloud auto-registers `GET /v1/team/health` for every subsystem.

### Deps (in-process)

team consumes cloud's `deps` for IAM issuer / KMS / commerce in-process rather than
its own HTTP env where possible. Interim: the platform plugin stays env-driven
(`IAM_ENDPOINT`, `KMS_ENDPOINT`) but populated from `deps`/cfg; converge to the
in-process clients as a follow-up. Storage (`{deps.DataDir}/team` for Base SQLite +
`{deps.DataDir}/team/team_workspaces` for the transactor read store) is under
cloud's DataDir.

### Preserved invariants

- **Plane bridge** (`transactor.RegisterMirror`): Base writes (chat/bots/slack) →
  transactor store → live broadcast. bots-as-members (red-approved 0.4.6):
  `is_bot` members → `contact:class:Person` + Employee mixin.
- **MODEL_VERSION** `0.6.0` (`pkg/model.Version()`), returned by the transactor
  `hello` as `serverVersion` — the front's version check.
- Tenant isolation: `owner_org` on workspaces; every store path keyed by
  `(org, workspace)`.

## Phase plan (each phase blue→red, ship green + deployed + verified)

- **P1 — module wiring + mount harness.** team-go → base v1.4.6 (compile-fix),
  import cloud, `team.Mount`+`init`, cloud/subsystems imports it. cloud builds+boots
  with team mounted; `/v1/team/health` 200; ONE real route proven (account unauth
  → 401 or transactor handshake); `go build`/`vet`/`test` green.
- **P2 — full surface under /v1/team.** account/chat/bots/slack/files/subscribe +
  transactor + mirror + migrations + functions, all namespaced; cloud tests green.
- **P3 — repoint front + ingress.** Huly front `ACCOUNTS_URL`/`TRANSACTOR_URL` →
  cloud `/v1/team`; ingress `hanzo.team` → cloud for `/v1/team` + transactor, front
  for the SPA. Run cloud-team in PARALLEL with live team-go 0.4.6 — do not break
  live.
- **P4 — deploy + verify + remove standalone.** cloud carries team; Playwright
  verify hanzo.team loads (front→cloud), login, workbench, channel+message,
  bots-as-members. Then scale down + REMOVE the standalone `team-go` Deployment
  (ns team-go). One binary serves team. No two deploys.

## Live baseline (do not break during cutover)

team-go `0.4.6` is LIVE standalone on hanzo-k8s ns team-go (bots-bridge done). That
deploy is removed only at P4, after cloud-team is verified live.

## Slack @hanzo agent bridge (pkg/slack)

`@hanzo` in Slack is the front-door to the whole Hanzo cloud. It is ADDITIVE to
the existing bidirectional channel-mirror relay — the relay is unchanged.

**Triggers** (all HMAC-verified with the same `verifySignature`):
- `app_mention` — `@hanzo …` in a channel (`POST /v1/slack/events`).
- `message` with `channel_type=="im"` — a DM to the bot (`POST /v1/slack/events`).
- `POST /v1/slack/commands` — the `/hanzo` slash command (urlencoded body).

The leading `<@BOTID>` token is stripped; the reply threads under the triggering
message (`thread_ts`, falling back to `ts`). Events are deduped on Slack
`event_id` via the shared `seenEvents` set. `app_mention` and the paired
`message` event have distinct event_ids, so a mapped-channel @mention still
mirrors AND runs the agent (no double-handling within either path).

**On-behalf-of auth (the money path).** The run bills the *Slack user's own*
Hanzo account, so it is authorized with THAT user's IAM access token:
1. `installOrg(team)` (`slack_installs`) → the workspace tenant org.
2. `linkedToken(team, slackUser)`: look up `slack_user_links`; fetch the user's
   refresh token from KMS (path `slack-user-tokens`, name `<team>.<user>`, under
   the tenant org); mint a fresh access token at IAM
   `POST {IAM}/v1/iam/oauth/token` (`grant_type=refresh_token`); rotate the
   stored refresh token if IAM issued a new one.
3. `runAgent(api.hanzo.ai, SLACK_AGENT_REF, text, userBearer)`:
   `POST /v1/agents/{ref}/run {"input":…}` with ONLY `Authorization: Bearer` —
   the gateway mints `X-Org-Id` (HIP-0026) + principal from the JWT; team-go
   never forges identity headers. Reads the RunResult `output` (`status=="ok"`).
4. Post the answer into the SAME thread with the workspace bot token
   (`postThreadMessage`) — slash replies go to the command's `response_url`.

All async after a fast 200/empty ack (Slack's 3s budget). Unlinked users get a
one-time prompt linking to `GET /v1/slack/link` (see below). Errors are terse,
never leak internals, never log tokens.

**Per-user link (hanzo.id OIDC, authorization-code, confidential client).**
- `GET /v1/slack/link?state=…` — reached from a server-minted prompt carrying a
  signed, single-use `(team,user)` state (itself gated by a verified Slack
  signature); redirects to `{IAM}/v1/iam/oauth/authorize` (scope
  `openid profile email offline_access`) with the SAME state.
- `GET /v1/slack/link/callback` — verifies the single-use state, exchanges the
  code, resolves identity (`/v1/iam/oauth/userinfo` sub + `owner` claim), stores
  the refresh token KMS-encrypted + the `(team,user)→account` pointer row.

**Config (env):** `SLACK_AGENT_REF` (default `hanzo`), `SLACK_LINK_REDIRECT_URI`
(default `https://api.hanzo.ai/v1/slack/link/callback`), reuses `IAM_CLIENT_ID/
SECRET`, `AGENTS_ENDPOINT`, `KMS_ENDPOINT`/`HANZO_API_KEY`, `SERVER_SECRET`.
Missing IAM creds → the link endpoints 503; the rest of Slack keeps serving.

**Collections** (`migrations/1747800000_slack_agent_bridge.js`, plugin-owned,
deny public CRUD): `slack_installs` (team→workspace+owner_org, unique per team),
`slack_user_links` (team+user→hanzo_subject+hanzo_org, unique per (team,user)).

**One-way factoring:** ONE `kmsClient` (tokens.go) underpins both the bot-token
and user-refresh-token stores; ONE `signSubjectState` primitive (verify.go)
underpins both the workspace OAuth state and the `(team,user)` link state; ONE
`agentReply` brain serves the @mention/DM and slash paths.
