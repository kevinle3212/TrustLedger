# WCAG 2.2 AA Static Audit

| Field              | Value                   |
| ------------------ | ----------------------- |
| Audit type         | accessibility           |
| Timestamp (UTC)    | 2026-07-01T04:02:14Z    |
| Git branch         | main                    |
| Commit hash        | a2c4dcf                 |
| Repository version | 0.1.0                   |
| Auditor            | Kevin Khanh Le (Claude) |

## Scope

Accessibility review of the frontend against WCAG 2.2 AA, Section 508, EN 301
549, and ADA/EAA expectations. Combines source inspection with a headless **axe
run** (Chromium, via the existing `accessibility.spec.ts`). Verification limits:
no screen reader (VoiceOver/NVDA/JAWS), no Lighthouse, and no
Safari/Firefox/Edge/Arc/Brave testing was performed.

## Files Inspected

- `app/[locale]/layout.tsx` (lang/dir, skip link, landmarks)
- `app/globals.scss`, `app/helpers.css` (focus, contrast, reduced motion)
- `components/Navbar.tsx`, `components/Footer.tsx`,
  `components/ConnectButton.tsx`
- `components/FaqContent.tsx` and 28 route `page.tsx` files (spot-checked)

## Existing Strengths (verified in source)

- `<html lang>` and `dir` are set per-locale; RTL handled for Arabic.
- Skip-to-main link (`.skip-link`) and a labelled `<main id="main-content">`.
- `focus-visible` outlines throughout; a dedicated high-contrast mode
  (`.high-contrast` surface overrides).
- `prefers-reduced-motion` honored in `globals.scss` (4 guarded blocks).
- Icon-only controls carry `aria-label`; decorative SVGs use `aria-hidden`.
- Touch targets use `min-h-10/11` (>=44px) on interactive controls.

## Issues Found

An automated axe gate **already exists** at `src/tests/accessibility.spec.ts`
(via `@axe-core/playwright`, run by `npm run test:e2e` in CI). Running it this
session showed 8 routes failing `color-contrast` — but root-cause analysis
proved this was a **test-sampling artifact, not a palette regression**.

The compiled tokens are AA-compliant at rest: `--color-indigo-600` = `#4f39f6`
(**6.45:1** on white) and `--color-gray-500` = `#6a7282` (**4.93:1**). The axe
failures reported `#8474f9` / `#727a86` — those exact tokens at ~70% opacity,
i.e. axe was analyzing the newly-added cookie banner **mid-fade-in** (the spec
asserts the Navbar `<header>` is visible, then analyzes before the separate
banner element finishes animating from `opacity: 0`).

| #   | Severity | Issue                                                                                                                                                                            | Location                          | Status   |
| --- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | -------- |
| 1   | Medium   | axe gate flaky: it sampled the cookie banner's fade-in and reported false `color-contrast` failures (`#8474f9`=3.59:1, `#727a86`=4.33:1) on transient sub-opacity frames.        | `tests/accessibility.spec.ts`     | Fixed    |
| 2   | Info     | Underlying color tokens (`indigo-600` 6.45:1, `gray-500` 4.93:1) meet AA at rest; no palette regression exists. Earlier "palette below AA" hypothesis in this session was wrong. | `app/globals.scss`, `helpers.css` | Verified |
| 3   | Info     | New `Docs` nav link (this session) is an `aria-hidden` SVG with `aria-label` on the link, `rel="noopener noreferrer"`, and a focus ring — no contrast rule applies; compliant.   | `Navbar.tsx`                      | Verified |

## Fixes Applied

- **#1** — Freeze entrance animations before axe analysis: after `page.goto`,
  the spec now injects `*{animation:none!important;transition:none!important}`
  so axe evaluates the settled DOM. Result: **8/8 routes pass** (was 8 failing).
  This is the correct root-cause fix; no change was made to the
  already-compliant color palette.

## Files Modified

- `src/tests/accessibility.spec.ts` (animation freeze before `analyze()`).

## Recommendations

- Expand the (now stable) axe gate to more routes and add the `wcag22aa` tag to
  cover WCAG 2.2 success criteria (e.g. target-size 2.5.8).
- Run Lighthouse a11y (target 100) and manual screen-reader passes on the top
  flows (New Contract, Dashboard, Dispute) in real browsers.

## Follow-up Actions

- [x] Expand the axe gate coverage (more routes) and add the `wcag22aa` tag —
      resolved in the `20260702-051105-axe-gate-expansion-wcag-2-2.md` report.
- [ ] Human screen-reader + Lighthouse pass on the 28 routes — not automatable
      in this environment (no screen readers or real browsers); needs a human.

## Remaining Work

- Screen-reader, Lighthouse, and non-Chromium browser verification are
  outstanding by necessity (tooling limits).

## Verification Performed

Source inspection + a headless axe run (Chromium). **Not verified:** screen
readers, Lighthouse, and any non-Chromium browser. The axe run found the
contrast defects above; the codebase's a11y infrastructure (landmarks, skip
link, focus rings, reduced motion, high-contrast mode) is otherwise sound.

### Commands Executed

```bash
grep -rln "skip-link\|high-contrast\|prefers-reduced-motion\|aria-live" app components
find "app/[locale]" -name page.tsx | wc -l   # 28 routes
```

### Test Results

`accessibility.spec.ts` (axe, Chromium): **8/8 routes pass** after the
animation-freeze fix (previously 8 failing on transient mid-fade opacity of the
cookie banner). No real contrast defect exists in the tokens.

### Build Status

Production build passes (session build, exit 0).

## Sign-off

- Auditor: Kevin Khanh Le (Claude)
- Reviewed by:
- Date:
