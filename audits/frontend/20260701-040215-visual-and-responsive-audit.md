# Visual & Responsive Audit

| Field              | Value                   |
| ------------------ | ----------------------- |
| Audit type         | frontend                |
| Timestamp (UTC)    | 2026-07-01T04:02:15Z    |
| Git branch         | main                    |
| Commit hash        | a2c4dcf                 |
| Repository version | 0.1.0                   |
| Auditor            | Kevin Khanh Le (Claude) |

## Scope

Visual consistency (Task 2) and responsive behavior (Task 3) across the 28
`[locale]` routes. **Verification limit:** only headless Chromium is available;
Safari/Firefox/Edge/Arc/Brave and the 320–1920px device matrix were not visually
exercised. Findings below are from source inspection plus a passing production
build.

## Files Inspected

- `app/globals.scss` (1819 lines), `app/helpers.css` (surfaces, gradients)
- `components/Navbar.tsx`, `components/Footer.tsx`, `components/FaqContent.tsx`
- Home hero + interactive preview components under `app/[locale]/_components/`

## Findings

| #   | Severity | Issue                                                                                                                                                                                                                                                                                                                                                | Location                          | Status              |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------- |
| 1   | Low      | Reported FAQ "background cutoff" near _"What should I do when a transaction fails?"_ could not be reproduced from source: FAQ renders over the shared `.tl-surface-page` body gradient (`radial-gradient(... transparent 28rem), #fff`) with no section-level background. The perceived seam is the radial tint fading to the flat base ~28rem down. | `helpers.css:2`, `FaqContent.tsx` | Needs browser repro |
| 2   | Info     | No fixed `w-[NNNpx]` pixel widths found in components (grep empty) — layouts are fluid/utility-driven, a good responsive baseline.                                                                                                                                                                                                                   | `components/`, `app/`             | Verified (static)   |
| 3   | Info     | Navbar uses a responsive grid with `tl-nav-scroller` overflow handling and a `MobileNavMenu` below `xl`; the new Docs icon inherits the GitHub icon's `hidden sm:inline-flex` treatment.                                                                                                                                                             | `Navbar.tsx`                      | Verified (static)   |

## Fixes Applied

- None. The one concrete report (FAQ seam) is a render-level perception I could
  not reproduce in source; a blind change to the 1819-line global stylesheet
  risks regressions I cannot visually verify. Deferred to a browser repro.

## Files Modified

- None (audit-only).

## Rationale

Changing global background math without seeing the rendered result could trade a
reported seam for a real regression across all pages. The responsible step is to
reproduce in a browser first, then adjust the `transparent 28rem` stop or switch
to a fixed-viewport background so the fade is unconditionally smooth.

## Recommendations

- Reproduce #1 in a browser at the reporter's viewport. If confirmed, options:
  (a) widen/soften the radial stop, or (b) use `background-attachment: fixed` on
  the page surface so the tint never shows a scroll-dependent edge, or (c) move
  the tint to a full-height fixed pseudo- element.
- Run the full 320/375/390/414/768/820/1024/1280/1440/1920 matrix in real
  browsers and capture screenshots per route.

## Follow-up Actions

- [ ] Browser-reproduce and fix the FAQ/page-surface seam (#1).
- [ ] Execute the device-width matrix across all 28 routes.

## Remaining Work

- Cross-browser visual verification and the responsive matrix are outstanding
  (tooling limits).

## Verification Performed

Source inspection + passing production build. **Not verified:** any rendered
visual output, any non-Chromium browser, any specific viewport.

### Commands Executed

```bash
grep -rhoE "w-\[[0-9]+px\]" components app   # (no matches — fluid layouts)
npm run build:frontend                          # exit 0
```

### Test Results

Unaffected (audit-only).

### Build Status

Production build passes (exit 0).

## Sign-off

- Auditor: Kevin Khanh Le (Claude)
- Reviewed by:
- Date:
