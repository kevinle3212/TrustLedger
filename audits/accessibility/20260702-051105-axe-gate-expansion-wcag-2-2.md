# axe gate expansion wcag 2.2

| Field              | Value                |
| ------------------ | -------------------- |
| Audit type         | accessibility        |
| Timestamp (UTC)    | 2026-07-02T05:11:05Z |
| Git branch         | main                 |
| Commit hash        | b90cb32              |
| Repository version | 0.1.0                |
| Auditor            | Kevin Khanh Le       |

## Scope

Closes the first follow-up action from
[`20260701-040214-wcag-2-2-aa-static-audit.md`](./20260701-040214-wcag-2-2-aa-static-audit.md):
"Expand the axe gate coverage (more routes) and add the `wcag22aa` tag."

Scope is the automated axe gate (`src/tests/accessibility.spec.ts`). The second
follow-up (human screen-reader + Lighthouse passes on real browsers) remains out
of reach in this environment and is left open — see Remaining Work.

## Files Inspected

- `src/tests/accessibility.spec.ts` (axe gate)
- `src/app/[locale]/*/page.tsx` route inventory (23 segments)
- `src/proxy.ts` (`/admin` IP gating) to exclude non-deterministic routes

## Issues Found

| #   | Severity | Issue                                                                                                                                                                  | Location                                                | Status |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------ |
| 1   | Info     | The axe gate covered 8 public routes and only WCAG 2.0/2.1 tags, so newer routes and WCAG 2.2 success criteria (e.g. target-size, SC 2.5.8) were untested.             | `tests/accessibility.spec.ts`                           | Fixed  |
| 2   | Low      | Dev-server logs showed a hydration mismatch in `/about`'s `ProjectAgeTimer.tsx` (SSR `00` vs client `01` on a live counter), surfaced while running the expanded gate. | `app/[locale]/about/_components/ProjectAgeTimer.tsx:60` | Fixed  |

## Fixes Applied

- **#1** — Added `wcag22a` and `wcag22aa` to the `withTags(...)` set and
  expanded the route list from 8 to 11 by adding `/en/about`, `/en/stats`, and
  `/en/status`. `/admin` (IP-gated 404 via `src/proxy.ts`) and `/account`
  (wallet-gated) were deliberately excluded to keep the gate deterministic. The
  existing animation-freeze fix from the prior audit is retained, so the new
  routes are also evaluated on the settled DOM.
- **#2** — Added `suppressHydrationWarning` to the live-digit `<p>` in
  `ProjectAgeTimer.tsx`. The server renders the true age at request time and the
  client re-reads `Date.now()` at hydration, so the digits differ by up to a
  second; this is the canonical live-clock hydration case, and suppressing the
  warning on that text node keeps the correct SSR output rather than emitting a
  stale placeholder. `useVisibleTimestamp`'s interval keeps it live thereafter.

## Files Modified

- `src/tests/accessibility.spec.ts`
- `src/app/[locale]/about/_components/ProjectAgeTimer.tsx`

## Rationale

Adding the two WCAG 2.2 tags is the direct ask and, with axe-core 4.11.4, pulls
in the `target-size` rule (SC 2.5.8) at no extra config cost. Route selection
favored public, banner-rendering pages so the existing `getByRole("banner")`
readiness wait stays valid and the gate does not flake on auth/IP gating.

## Recommendations

- Continue toward full-route coverage once `/account` has a deterministic
  connected-wallet fixture (the `@wallet` E2E path already mocks a connector).

## Follow-up Actions

- [x] Expand the axe gate coverage (more routes) and add the `wcag22aa` tag.
- [ ] Human screen-reader + Lighthouse pass on the 28 routes (tooling-limited;
      unchanged from the prior report).

## Remaining Work

- Screen-reader (VoiceOver/NVDA/JAWS), Lighthouse, and non-Chromium browser
  verification remain outstanding by necessity — only headless Chromium is
  available in this environment. CI still runs the Lighthouse CI budgets job for
  automated coverage.

## Verification Performed

Ran the expanded spec against a dev server (headless Chromium + mobile-chrome
projects).

### Commands Executed

```bash
cd src && PLAYWRIGHT_USE_DEV_SERVER=1 NODE_OPTIONS=--no-experimental-webstorage \
  env -u NO_COLOR npx playwright test accessibility.spec.ts --reporter=line
```

### Test Results

**22 passed** — 11 routes × 2 projects (desktop + mobile-chrome), zero axe
violations with the WCAG 2.0/2.1/2.2 A + AA tag set. After the finding #2 fix,
the dev-server log no longer emits the `ProjectAgeTimer` hydration mismatch.
**Not verified:** any screen reader, Lighthouse (outside CI), or non-Chromium
engine.

### Build Status

Test-only change; no application build impact.

## Sign-off

- Auditor: Kevin Khanh Le
- Reviewed by:
- Date:
