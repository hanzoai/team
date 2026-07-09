# Notification-API tests: the "Firefox-only" premise is stale — no browser-switch needed

## Context (superseded finding — read this before anything else)

The original ask was "some tests can only run under Firefox due to an environment limitation — design a way to run them under the `firefox` Playwright project in CI." That premise traced back to a doc comment in `e2e-tests/playwright/lib/src/mock_browser_api.ts:34`:

> "Works across browsers and devices, except in headless mode, where stubbing the Notification API is supported only in Firefox and WebKit."

...and a matching guard in `specs/functional/channels/notifications/notification.spec.ts:17-20`:
```ts
test.skip(
    headless && browserName !== 'firefox',
    'Works across browsers and devices, except in headless mode, where stubbing the Notification API is supported only in Firefox and WebKit.',
);
```

**This claim was verified empirically against the live local dev server (`http://localhost:8065`) and found to be false for the currently-installed toolchain (Playwright `1.61.1`, its bundled `chromium_headless_shell` build — the exact same version CI's `prep-deps` job installs via `npx playwright install chromium`).**

### What was tested
1. Baseline: ran `MM-T483` (`notification.spec.ts`) under `--project=chrome` unmodified → skipped, as designed (confirms the guard is live and would otherwise gate this test out).
2. Bypassed the skip guard, added `channel: 'chromium'` (Chrome's new unified headless mode) to the `chrome` project → **test passed.** This was the original hypothesis: default Playwright headless Chromium uses a stripped-down legacy `headless-shell` build, and the new `channel: 'chromium'`/`'chrome'` mode restores full feature parity with headed Chrome.
3. Reverted the `channel` override entirely (back to plain default `chrome` project, zero config changes) and re-ran with only the skip guard bypassed → **test still passed.** Ran it 3 more times back-to-back → **5/5 passes total**, no flakiness observed.
4. Also re-tested `group_messages.spec.ts` `MM-T469` (the second test flagged in the original investigation for having the *same* `stubNotification`/`waitForNotification` dependency but *no* guard at all) under plain default `chrome` → **passed**, both with and without the `channel` override.

Conclusion: **Chrome already "works by default"** for this API in the currently pinned Playwright/Chromium version — no config change, no new browser install, no new CI project/job/tag is needed. The `firefox`/`channel: 'chromium'` avenues explored earlier are unnecessary. The only actual bug is that the skip guard's premise is outdated, so `notification.spec.ts`'s test has been silently skipped in CI for no current reason.

## Revised, much smaller plan

### 1. Relax the stale skip guard — `notification.spec.ts`
Change:
```ts
test.skip(
    headless && browserName !== 'firefox',
    'Works across browsers and devices, except in headless mode, where stubbing the Notification API is supported only in Firefox and WebKit.',
);
```
to either remove it entirely, or narrow it to only the browsers actually still unverified (there is no `webkit` project configured in this repo, so there's nothing left to guard against for the projects that actually run here — `chrome`, `ipad`, `firefox` all now pass). Recommend removing the `test.skip` call outright; if a real regression shows up on a future Chromium bump, it's a one-line guard to re-add.

### 2. Correct the doc comment — `lib/src/mock_browser_api.ts:34`
Update/remove the outdated "except in headless mode... only Firefox and WebKit" claim on `stubNotification`'s docstring so future readers don't reintroduce the same stale assumption.

### 3. `group_messages.spec.ts` (`MM-T469`)
No change needed — it already passes today under the default `chrome` project. (Originally flagged as a "latent unguarded bug"; that flag was based on the same now-disproven premise. No fix required.)

### 4. No CI changes needed
- No new browser install (`prep-deps`'s `npx playwright install chromium` is unchanged).
- No new tag, no `firefox` project wiring, no new job/step, no `assert-results` changes.
- The pre-existing, already-unused `firefox` project in `playwright.config.ts` is untouched — out of scope, no reason to remove or repurpose it as part of this fix.

## Verification
- Local (done): 5/5 passes for `MM-T483` and 2/2 for `MM-T469` under plain default headless `chrome`, against the live dev server, with Playwright `1.61.1` — same version CI installs.
- Recommended before merging: let the first real CI run (on the actual `ubuntu-24.04` runner, via the normal `playwright-full-v2` job) confirm the same result — Linux vs. macOS Chromium builds *should* behave identically for this Blink-level API, but CI is the authoritative environment and costs nothing extra to confirm since this test now runs as part of the existing `chrome` project with no new infrastructure.
- If CI unexpectedly disagrees with local (e.g. some runner-specific quirk), the revert is a single line (`test.skip(...)` restored) — low blast radius either way.
