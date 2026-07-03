---
name: playwright-a11y
description:
    Use after frontend UI changes, navigation changes, form changes, or
    accessibility-sensitive work. Runs Playwright routes with axe-core WCAG A/AA
    checks.
---

## Tool Fallback <!-- tool-fallback -->

- If a preferred tool, command, or skill is unavailable, failing, or a worse fit
  for the task, use the best available alternative rather than stopping or
  forcing it. Note which tool you used and why. Never fall back to a prohibited
  tool (for example `mcp__claude-in-chrome__*` is banned — use `/browse`).

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or the
desired outcome is unclear, interview the user with focused questions until intent
is unambiguous. State assumptions and confirm them before proceeding.

# Playwright Accessibility

Run from `src/`:

```bash
npm run test:e2e -- accessibility.spec.ts
```

Strict expectations:

- No WCAG A/AA axe violations.
- Do not disable axe rules to make the suite pass.
- Fix semantic markup, labels, focus order, contrast, landmarks, or copy
  instead.
- Keep wallet-dependent flows out of this public-route sweep unless mocked.
