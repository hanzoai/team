# Hanzo Team

[![Open in Hanzo](https://hanzo.app/badges/open-in-hanzo.svg)](https://hanzo.app/dev/open?repo=github.com/hanzoai/team&ref=main&action=open) [![Edit with Hanzo](https://hanzo.app/badges/edit-with-hanzo.svg)](https://hanzo.app/dev/open?repo=github.com/hanzoai/team&ref=main&action=edit) [![Deploy with Hanzo](https://hanzo.app/badges/deploy-with-hanzo.svg)](https://hanzo.app/dev/open?repo=github.com/hanzoai/team&ref=main&action=deploy)

The tracker and the workspace, on `@hanzo/gui` + `@hanzo/ui`, over the team
backend at `api.hanzo.ai/v1/team`.

Prerequisites: **Node.js 22+** (for native `--experimental-strip-types` script execution) and **pnpm** (`corepack enable`).

```bash
pnpm install
pnpm dev
```

By default Vite proxies `/v1` requests to `https://api.hanzo.ai`. To run against a local Cloud API instance, set `HANZO_API_ORIGIN`:

```bash
HANZO_API_ORIGIN=http://localhost:8000 pnpm dev
```

### Build, checks & smoke tests

```bash
pnpm build                              # typecheck + production bundle -> dist/
pnpm test                               # unit & contract tests (src/**/*.test.ts)
pnpm test:bundle                        # anti-mock & live-endpoint check on dist/
node scripts/check-oss-boundary.mjs     # OSS dependency & theme boundary check
pnpm exec playwright install chromium   # one-time browser install
pnpm test:e2e                           # Playwright smoke & contract specs against dist/
```

Regions, and who owns which:

| directory | region |
|---|---|
| `src/shell` | the four regions, the rail, the navigator frame, the aside |
| `src/nav` | the tracker's navigator: the standing rows and the projects tree |
| `src/tracker` | the head — trail, title, views, filter — and the board under it |
| `src/inbox` | the notification panel's contents |
| `src/chat` | the channel surface, bots included: a DM with one, an @-mention in a channel |
| `src/bots` | `/bots`, a hand-off to hanzo.bot, where one bot is worked with up close |

`src/shell/surfaces.ts` is the one declaration of what the product contains: a
surface is one entry there and is thereafter a rail icon, a navigator and a set
of addresses.

Published at `team2.hanzo.app`; `hanzo.yml` declares the build and the slug.
Any screen can be entered in a named state — `?state=realistic` and its four
siblings stand in for the whole plane, the door included.
