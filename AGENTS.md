# AGENTS.md

Explicitly import subdirectory instruction files that must always be in context:
@server/AGENTS.md

## Push to git.hanzo.ai. GitHub is a copy and builds nothing.

    git.hanzo.ai/hanzoteam/server    canonical — Actions build the image here
    github.com/hanzoteam/server      a copy, with no push mirror keeping it current

There is no mirror between them, so the GitHub copy drifts and has sat nine
releases behind. A push there succeeds, reports success, and ships nothing; the
image its `master` would build has not existed since 0.1.10. Check what you are
pointed at before committing:

    git config --get remote.origin.url

Two things make the drift read as something else. Every image SHA (the
`sha-<short>-amd64` tags on the package) answers `422 No commit found` on GitHub,
which looks like history loss and is not — those commits are all on the forge.
And `https://git.hanzo.ai/api/v1/repos/...` 404s for a repo that exists, because
the forge API base is **`/v1/`**, not `/api/v1/`; reading that 404 as "the forge
does not have this repo" is what sent one agent to the wrong remote for a day.
When the API disagrees with you, ask the forge's own database:

    kubectl -n hanzo exec sql-0 -- psql -U hanzo -d git -tAc \
      "select r.owner_name||'/'||r.name, b.name, substr(b.commit_id,1,12)
         from branch b join repository r on r.id=b.repo_id
        where r.owner_name='hanzoteam';"

## The API is served at /v1/workspace

`model.APIURLSuffix` is `/v1/workspace` here, not upstream's `/api/v4`. Anything
built against the upstream `server/public` module addresses routes this server
does not serve — take the constant from this module instead of spelling the
prefix a second time.

Probing it is a trap: **`/v1/<anything>` returns 200 text/html**, because the SPA
catch-all answers unrouted paths. `/v1/users/me` therefore looks alive and is
not. Read the content type, and note that `/api/v4/users/me` returning a JSON 404
is the API router answering — a real signal, unlike the 200.

## Pull Requests

When creating a pull request, follow `.github/PULL_REQUEST_TEMPLATE.md` exactly:

- Remove all `<!-- -->` comments.
- Omit sections that are not applicable (Ticket Link, Screenshots) — do not write N/A, just remove the header.
- The `#### Release Note` header and its "```release-note" fenced code block **must always be present** (WITHOUT escaping the ``` characters). Write `NONE` if the change has no API, schema, UI, or breaking changes.

## Cursor Cloud Agents

This repository has a checked-in Cloud Agent environment under `.cursor/`. Docker is started by `.cursor/scripts/cloud-agent-start.sh`; if Docker is unavailable in Cloud, treat that as an environment failure rather than falling back to snapshot assumptions.

The environment declares `mattermost/enterprise` as a Cursor multi-repo dependency. Cursor clones the repositories as siblings, so `server/Makefile` can use its default `../../enterprise` path; the install hook does not clone or symlink enterprise.

