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

`@hanzo` in Slack is the front-door to the whole Hanzo cloud. ADDITIVE to the
bidirectional channel-mirror relay (unchanged).

**Triggers** (HMAC-verified): `app_mention` + `message`(channel_type=im) via
`POST /v1/slack/events`; `POST /v1/slack/commands` (`/hanzo`). Leading `<@BOTID>`
stripped; reply threads under `thread_ts` (falls back to `ts`).

**On-behalf-of run (the money path).** `installOrg(team)`→tenant org;
`linkedToken(team,user)` fetches the KMS refresh token (path `slack-user-tokens`,
name `<team>.<user>`, under the tenant org), mints a fresh access token at IAM
`/v1/iam/oauth/token` (grant_type=refresh_token, rotates); `runAgent` posts
`api.hanzo.ai/v1/agents/{ref}/run {"input"}` with ONLY the user Bearer — the
gateway mints X-Org-Id (HIP-0026); team-go never forges identity headers. Answer
posted into the same thread with the workspace bot token; slash replies via
`response_url` (host-pinned to hooks.slack.com).

**Account link — hijack-hardened (C1).** The Slack subject bound to a Hanzo
account is proven by a Slack SIGN-IN leg and carried in a browser-bound cookie,
NEVER taken from a URL/state param:
1. `GET /v1/slack/link?state=…` (signed (team,user) = provenance only) → mint a
   random continuity nonce; set httpOnly init cookie `hanzo_slack_init`=nonce AND
   carry the SAME nonce as the subject of the `slack-signin` state; redirect to
   Slack authorize (`user_scope=openid`).
2. `GET /v1/slack/link/slack` — require the init cookie to EQUAL the state's
   subject (browser continuity, F1) and consume the state nonce (single-use);
   only THEN `oauth.v2.access` returns the Slack-verified `authed_user.id`; clear
   the init cookie; set the httpOnly/Secure/SameSite=Lax/path-scoped cookie
   `hanzo_slack_link` = signLinkState(team, authed_user.id); redirect to hanzo.id
   OIDC with `state` == cookie. A transplanted leg-2 URL (attacker's code+state
   pasted into a victim's browser) has no matching init cookie → refused BEFORE
   the code is exchanged, so no attacker Slack identity is ever planted.
3. `GET /v1/slack/link/callback` — bind ONLY from the cookie (no cookie ⇒ refuse;
   `state`!=cookie ⇒ refuse); exchange the hanzo code; consume the single-use
   nonce AFTER a successful exchange; store the refresh token KMS-encrypted +
   the `(team,user)→account` row. A forwarded link carries no cookie, and a
   login as a different Hanzo subject binds only to the cookie's Slack user.
   The unlinked prompt is delivered EPHEMERALLY (`chat.postEphemeral` /
   `response_type:ephemeral`) so a link URL never reaches a channel.

**Other hardening.**
- **First-org-wins (M1):** `upsertInstall` refuses to change a team's `owner_org`
  (`errInstallConflict`); `oauth()` records the install BEFORE storing the token,
  so a second org cannot capture a team another org connected. Effective
  ownership is (org, team).
- **Durable dedupe (M2):** the agent path inserts into `slack_processed_events`
  (unique `event_key` = Slack event_id / slash trigger_id) before dispatch —
  survives restart, so a retry never double-runs/double-bills. Fails closed
  (skip) on a dedupe DB error. The in-process seen-set stays for the (cosmetic)
  relay path. `slack_processed_events` is pruned hourly (rows older than 24h,
  well past Slack's retry horizon) so it cannot grow unbounded (F3).
- **Concurrency cap (M3):** `dispatchAgent` bounds simultaneous agent turns
  (`SLACK_AGENT_CONCURRENCY`, default 32); excess is dropped + logged.
- **Fail-closed secret (L1):** all signed-state endpoints 503 when `SERVER_SECRET`
  is empty or `token.DefaultSecret`.

**Org-scoped connect (console Integrations).** `GET /v1/slack/connect` accepts an
org JWT (`wsauth.CallerOrg`) IN ADDITION to workspace-admin; both resolve to an
org and the OAuth `state` binds that org. POLICY (F2): initiating connect is
intentionally NOT gated to org owner/admin — the real gates are external (Slack
requires a workspace admin to Allow the install; first-org-wins blocks cross-org
capture; org is the caller's own validated tenant), leaving only same-org
griefing as an accepted residual. Full bot scopes by default
(app_mentions:read,chat:write,channels:history,channels:read,groups:history,
im:history,im:read,im:write,users:read,commands). `oauth()` stores the token
per-org and upserts `slack_installs(team→org)` (first-org-wins).

**Config (env):** `SLACK_AGENT_REF` (default `hanzo`), `SLACK_LINK_REDIRECT_URI`
(hanzo callback), `SLACK_LINK_SLACK_REDIRECT_URI` (Slack sign-in callback — a NEW
Slack redirect URL), `SLACK_AGENT_CONCURRENCY`; reuses `IAM_CLIENT_ID/SECRET`,
`AGENTS_ENDPOINT`, `KMS_ENDPOINT`/`HANZO_API_KEY`, `SERVER_SECRET`.

**Slack app manifest deltas:** add redirect URL `https://api.hanzo.ai/v1/slack/link/slack`
(the Slack sign-in leg); add user token scope `openid`; bot scopes as above.

**Collections** (`migrations/1747800000_slack_agent_bridge.js`, plugin-owned):
`slack_installs` (team→owner_org, optional workspace_id, unique per team),
`slack_user_links` (team+user→hanzo_subject+hanzo_org), `slack_processed_events`
(unique event_key).

**One-way factoring:** ONE `kmsClient` underpins both token stores; ONE
`signSubjectState` primitive underpins the org OAuth state, the (team,user) link
state, and the link cookie; ONE `agentReply` brain serves the mention/DM and
slash paths (returning a linkPrompt flag so each caller delivers it ephemerally).
