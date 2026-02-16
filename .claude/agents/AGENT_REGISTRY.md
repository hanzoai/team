---
name: agent-registry-pages
description: Registry of wiki/pages project-specific agents
---

<!-- Swarm metadata for each agent:
  model: opus|sonnet|haiku — cost/speed tradeoff
  prerequisites: agents that must run first
  speed: fast (<30s) | medium (30-90s) | slow (>90s)
  parallel-safe: can run alongside other agents without conflicts
-->

# Agent Registry - Wiki/Pages Project

**Project-specific agents only.** For general agents, see `~/.claude/agents/AGENT_REGISTRY.md`.

### Phase Tags

| Tag | Meaning | Swarm routing |
|-----|---------|---------------|
| `[PLAN]` | Plan/design review only | Plan-review swarms only |
| `[CODE]` | Code review/implementation only | Code-review swarms only |
| `[BOTH]` | Applicable to either | Either swarm type |

---

## Project Agents

| Agent | Phase | Purpose | Model | Speed | Prerequisites | Parallel-safe |
|-------|-------|---------|-------|-------|---------------|---------------|
| `confluence-alignment-reviewer` | [BOTH] | Compare wiki features against Confluence patterns | opus | slow | none | yes |
| `confluence-migration-expert` | [CODE] | Confluence XML → mmetl → MM import pipeline | opus | medium | none | yes |
| `pages-isolation-reviewer` | [CODE] | Ensure pages don't affect posts and vice versa | opus | medium | none | yes |
| `pages-e2e-test-reviewer` | [CODE] | Enforce test_helpers.ts usage | haiku | fast | `e2e-test-reviewer` | yes |
| `tiptap-reviewer` | [CODE] | TipTap extensions, Suggestion plugin patterns | sonnet | medium | none | yes |

## General Agents

See `~/.claude/agents/AGENT_REGISTRY.md` for all general-purpose agents.

### Reference Skills (not agents)

| Skill | Recommending agents | When to recommend |
|-------|-------------------|-------------------|
| `/create-code --tdd` | any agent noting test gaps | Missing coverage, tests after code, implementation-coupled tests |

### Reference Docs (not agents)

| Doc | Purpose | Location |
|-----|---------|----------|
| `wiki-api-reference` | Wiki API endpoint reference and request/response formats | `.claude/docs/wiki-api-reference.md` |
| `react-best-practices` | React performance patterns for wiki components (barrel imports, lazy loading, selector memoization, TipTap editor perf) | `.claude/docs/react-best-practices.md` |

---

## When to Use

| Agent | Trigger |
|-------|---------|
| `architecture-assertion-auditor` | Before finalizing any architecture doc; after writing/updating design decisions |
| `plan-assertion-checker` | Auto-triggered by `/review-plan` when plan references existing tables, columns, functions, or limits |
| `confluence-alignment-reviewer` | Designing wiki features, checking industry alignment |
| `confluence-migration-expert` | Migration pipeline work, content mapping issues |
| `pages-isolation-reviewer` | Any Post/Page query changes, type filtering |
| `type-dedup-reviewer` | Frontend type changes, new type definitions |
| `pages-e2e-test-reviewer` | After `e2e-test-reviewer` on pages E2E tests |
| `tiptap-reviewer` | Editor changes, new extensions, Suggestion plugin |
| `wiki-api-reference` | API design, endpoint review |
| `review-context-builder` | [OPTIONAL] Pre-scan phase of `/review-code --swarm`; parallel agents Read files independently just as fast |

---

## Review Workflow

For full-stack wiki changes. Use `/review-code --swarm` to run these in parallel groups automatically.

### Pre-scan [OPTIONAL]

`review-context-builder` (haiku, 60s timeout) can pre-scan changed files, but parallel review agents Read files independently just as fast. Skip unless you have a specific reason to categorize files before spawning agents.

### Conditional Execution

Groups are auto-selected based on changed file types. Bridge triggers: API/model changes and schema file changes (.proto, .yaml, .json) also trigger Frontend group. If uncertain, don't skip.

| Group | When |
|-------|------|
| 1 — Core | Always |
| 2 — Backend | Go files changed |
| 3 — Frontend | TS files changed OR API/model bridge OR schema bridge |
| 4 — Wiki/Pages | Go or TS wiki files changed |
| 5 — Testing | E2E or test files changed |
| 6 — Deep | `--full` or `--thorough` |
| 7 — Design | Plan scope |

### Parallel Groups (run simultaneously within each group)

**Group 1 — Core** (always):
`race-condition-finder`, `simplicity-reviewer`, `pattern-reviewer` (canonical — wins conflicts), `error-handling-reviewer`, `validation-reviewer`, `permission-auditor`

**Group 2 — Backend** (if Go):
`api-reviewer`, `app-reviewer`, `store-reviewer`, `transaction-reviewer`, `db-call-reviewer`

**Group 3 — Frontend** (if TS or bridge):
`react-frontend`, `component-reviewer`, `redux-expert`, `tiptap-reviewer`

**Group 4 — Wiki/Pages** (wiki files):
`pages-isolation-reviewer` (specialist — wins over generalist), `confluence-alignment-reviewer`, `confluence-migration-expert`

**Group 5 — Testing** (test/E2E changes):
`test-coverage-reviewer`, `e2e-test-reviewer` → `pages-e2e-test-reviewer`

**Group 6 — Deep** (--full):
`xss-reviewer`, `owasp-security`, `null-safety-reviewer`, `concurrent-go-reviewer`, `go-pro`, `react-pro`, `typescript-pro`, `postgres-expert`, `ha-reviewer`, `i18n-expert`, `accessibility-guardian`, `type-dedup-reviewer`, `duplication-reviewer`, `performance-optimizer`, `hardcoded-values-reviewer`

**Group 7 — Design** (plan scope):
`design-flaw-finder`, `architecture-assertion-auditor`, `doc-consistency-reviewer`

### Swarm Error Handling

| Scenario | Action |
|----------|--------|
| Agent missing (pre-flight) | Skip agent; log "Missing: {name}"; note gap in report's "Skipped Agents" section |
| Agent spawn fails (runtime) | Log "Agent {name} unavailable"; mark "incomplete for {name}"; continue swarm |
| Agent times out / crashes | Skip findings; mark "incomplete for [agent-name]"; note gap in synthesis |
| Entire group has no valid agents | Skip group entirely; note in report |
| Conflicting findings | `pattern-reviewer` wins on MM patterns; specialist > generalist; else higher severity wins |
| External service fails | Agent reports what it verified locally, flags unverified claims |
| CRITICAL finding mid-swarm | Do NOT stop other agents; flag in synthesis as blocking issue |

### Result Format

All review agents should structure findings as:

```
### [CRITICAL/HIGH/MEDIUM/LOW] Category: Brief description
**File**: `path/to/file:NN`
**Evidence**: <actual code snippet>
**Risk**: <what could go wrong>
**Fix**: <specific fix>
```

The swarm leader deduplicates by file+line, keeps highest severity when overlapping.

**Domain-specific agents** may use extended formats after standard findings:
- `pages-isolation-reviewer`: Appends an isolation checklist table (PASS/FAIL per area)
- `confluence-alignment-reviewer`: Uses comparison format (Confluence Behavior / MM Current / Alignment Status) — not code findings
- `confluence-migration-expert`: Uses migration format (Issue Type / Impact / Test) — not code findings

Domain-specific formats are acceptable when the agent's output is consumed directly (not deduplicated with code review findings).

### Orchestration Model

Agents are **leaf nodes** — they receive a prompt, do their work, and return findings. All coordination (spawning, task assignment, result collection) is handled by the **orchestrator** (a skill like `/review-code --swarm` or the main Claude Code session). Agents do not use TeamCreate, TaskCreate, or SendMessage.
