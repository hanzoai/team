# OSS Team SDK Boundary (`hanzoai/team` vs `hanzo-inc/team`)

Per owner directive (hanzoai/team#44), this public repository is the **open-source collaboration framework, SDK, protocol primitives, reusable UI components, and generic self-hosted examples**. The production `hanzo.team` product and backend live in private `hanzo-inc/team`.

## Ownership & Import Direction

```
hanzoai/team (public OSS: Apache-2.0 OR MIT)
  ├── Reusable workspace/channel/thread/tracker UI primitives & SDK contracts
  ├── Consumes canonical `@hanzo/ui`, `@hanzo/gui`, and `@hanzo/appearance` (no global `!important` theme overrides)
  └── MUST NOT depend on `hanzo-inc/*`, private billing/commercial logic, or hardcoded product secrets

hanzo-inc/team (private production product: hanzo.team)
  ├── Go backend (`cmd/team`, `pkg/bots`, `pkg/bot`, `pkg/chat`, `pkg/transactor`, `pkg/billing`)
  └── Consumes published `@hanzo/team` primitives alongside IAM-authorized workspace/Bot services
```

## Migration Inventory

- `src/theme/tokens.css`: Removed `!important` global accent overrides (`--primary`, `--accent`, `--highlight`) so `@hanzo/appearance` user/org preferences take precedence cleanly without cascade fights.
- `src/app.tsx` & `src/settings/preferences.ts`: Keep generic SDK exports backward-compatible while product-specific hosting/billing/SaaS wiring lives in `hanzo-inc/team`.
- Automated enforcement: `node scripts/check-oss-boundary.mjs` verifies zero `hanzo-inc/*` dependencies and zero `!important` overrides on `--primary`/`--accent`/`--highlight`.
