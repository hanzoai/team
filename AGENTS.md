# AGENTS.md

Explicitly import subdirectory instruction files that must always be in context:
@server/AGENTS.md

## Pull Requests

When creating a pull request, follow `.github/PULL_REQUEST_TEMPLATE.md` exactly:

- Remove all `<!-- -->` comments.
- Omit sections that are not applicable (Ticket Link, Screenshots) — do not write N/A, just remove the header.
- The `#### Release Note` header and its "```release-note" fenced code block **must always be present** (WITHOUT escaping the ``` characters). Write `NONE` if the change has no API, schema, UI, or breaking changes.

## Cursor Cloud Agents

This repository has a checked-in Cloud Agent environment under `.cursor/`. Docker is started by `.cursor/scripts/cloud-agent-start.sh`; if Docker is unavailable in Cloud, treat that as an environment failure rather than falling back to snapshot assumptions.

The environment declares `mattermost/enterprise` as a Cursor multi-repo dependency. Cursor clones the repositories as siblings, so `server/Makefile` can use its default `../../enterprise` path; the install hook does not clone or symlink enterprise.

## Cursor Cloud specific instructions

Run/setup details live in `.cursor/cursor.md` (materialized as `.cursor/AGENTS.md` at start) and `.cursor/README.md`; prefer those over duplicating commands. Non-obvious caveats:

- `.cursor/Dockerfile` pins toolchain versions independently of the repo. Keep its `GO_VERSION` in sync with `server/.go-version` and `NODE_VERSION` with `.nvmrc`; a stale `GO_VERSION` will fail to build the server (`go.mod` enforces the version).
- The dev UI is served by the Go server at `http://localhost:8065`. `cd webapp && make run` compiles/watches the client into `server/client` (served by the server); it is not a standalone dev server, so the app is exercised at `:8065`.
- Webapp Jest uses a newer flag: filter tests with `--testPathPatterns=<pattern>` (the old `--testPathPattern` is removed).
