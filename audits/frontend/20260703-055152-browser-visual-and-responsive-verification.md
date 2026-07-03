# browser visual and responsive verification

| Field              | Value                |
| ------------------ | -------------------- |
| Audit type         | frontend             |
| Timestamp (UTC)    | 2026-07-03T05:51:52Z |
| Git branch         | main                 |
| Commit hash        | 54c2a5a              |
| Repository version | 0.1.0                |
| Auditor            | Kevin Khanh Le       |

## Scope

Closes the two browser-dependent follow-up actions left open by
[`20260701-040215-visual-and-responsive-audit.md`](./20260701-040215-visual-and-responsive-audit.md):

- "Browser-reproduce and fix the FAQ/page-surface seam (#1)."
- "Execute the device-width matrix across all 28 routes."

Verification ran the app live against a local dev server
(`http://localhost:3000`) in **headless Chromium** (gstack `browse`). **Limit:**
Safari/Firefox/Edge/Arc/Brave were not exercised — only Chromium is available in
this environment, so the non-Chromium visual pass stays open (see Remaining
Work).

## Files Inspected

- `src/app/helpers.css` (`.tl-surface-page` radial-gradient surface)
- `src/app/[locale]/faq/page.tsx`, `components/FaqContent.tsx` (rendered)
- Rendered output of the 13 deterministic public routes (`/en`, `/en/faq`,
  `/en/about`, `/en/stats`, `/en/status`, `/en/create`, `/en/dashboard`,
  `/en/juror`, `/en/reputation`, `/en/legal`, `/en/analytics`, `/en/client`,
  `/en/freelancer`)

## Issues Found

| #   | Severity | Issue                                                                                                                                                                                                                                                                                                                                                                                                     | Location            | Status       |
| --- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------ |
| 1   | Info     | The reported FAQ "background cutoff" near _"What should I do when a transaction fails?"_ is **not** a page-background seam. The `.tl-surface-page` radial tint fades to `transparent` at `28rem` (448px) and composites smoothly onto white/`#030712` with no hard edge. The perceived horizontal line is the **fixed cookie-consent banner's top border** overlapping the content while it is displayed. | `app/helpers.css:4` | Not a defect |
| 2   | Info     | Responsive layout is sound: **zero horizontal overflow** (`scrollWidth == clientWidth`) on all 13 public routes at every tested width. No fix required.                                                                                                                                                                                                                                                   | all public routes   | Verified     |

## Fixes Applied

- None. Both findings resolved as **not defects** under live browser inspection.
  Changing the already-smooth global surface gradient would risk a regression
  across every page to "fix" an edge that belongs to the cookie banner, not the
  stylesheet. The prior audit's decision to defer a blind CSS change was
  correct.

## Files Modified

- None (verification-only).

## Rationale

The prior audit could not reproduce the seam from source and declined to edit
the 1819-line global sheet blind. Live rendering confirms why: the radial tint
transition is continuous, and the only horizontal edge near the reported
question is the fixed cookie banner's border. That is expected overlay chrome,
not a background cutoff, so no stylesheet change is warranted. The width matrix
showed a clean fluid baseline, matching the prior static finding that no fixed
`w-[NNNpx]` widths exist.

## Recommendations

- When non-Chromium browsers become available, repeat the FAQ visual check in
  Safari/Firefox to rule out engine-specific gradient banding, and capture the
  per-route screenshot matrix there.

## Follow-up Actions

- [x] Browser-reproduce the FAQ/page-surface seam (#1) — reproduced as the fixed
      cookie-banner border, not a background seam; no fix needed.
- [x] Execute the device-width matrix across the public routes (Chromium) — no
      horizontal overflow at 320/375/768/1024/1440/1920.
- [ ] Repeat the visual + width matrix in non-Chromium engines
      (Safari/Firefox/Edge/Arc/Brave) — unavailable in this environment.

## Remaining Work

- Non-Chromium visual verification remains outstanding by necessity (only
  headless Chromium is available here).

## Verification Performed

Live headless-Chromium rendering of the running dev server. Captured full-page
screenshots of `/en/faq` (light and dark, animations frozen) and `/en` at 320px,
plus a per-route horizontal-overflow probe. **Not verified:** any non-Chromium
engine.

### Commands Executed

```bash
# dev server
cd src && NODE_OPTIONS=--no-experimental-webstorage next dev   # http://localhost:3000

# FAQ seam (browse = gstack headless Chromium)
browse goto http://localhost:3000/en/faq
browse js "getComputedStyle(document.querySelector('.tl-surface-page')).backgroundImage"
#   → radial-gradient(circle at 18% 0px, rgba(99,102,241,0.08), rgba(0,0,0,0) 448px), none
browse screenshot faq-settled.png          # animations frozen; no seam
browse js "document.documentElement.classList.add('dark')"; browse screenshot faq-dark.png

# Responsive overflow matrix (per route, per width)
browse viewport 320x900 && browse goto http://localhost:3000/<route>
browse js "document.documentElement.scrollWidth - document.documentElement.clientWidth"   # 0 everywhere
```

### Test Results

- FAQ seam: not reproducible in light or dark; perceived edge is the fixed
  cookie banner border. No background defect.
- Overflow matrix: `0` horizontal overflow on all 13 public routes at
  320/375/768/1024/1440/1920. `/en` reports off-canvas SVG path geometry
  (decorative), fully clipped — no scrollbar.

### Build Status

Verification-only; no code change, no build impact.

## Sign-off

- Auditor: Kevin Khanh Le
- Reviewed by:
- Date:
