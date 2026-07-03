---
name: stylelint
description:
    Use when changing `src/app/**/*.css` or `src/app/**/*.scss`, Tailwind helper
    CSS, dark mode, animation utilities, or responsive SCSS.
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

# Stylelint

Run from the repository root:

```bash
npm run lint:styles
```

Strict expectations:

- Follow `.stylelintrc.json`.
- Keep Tailwind-specific at-rules limited to the configured allowlist.
- Avoid `transition: all`.
- Keep nesting depth at or below 3.
- Use kebab-case custom properties.
- Do not introduce ID selectors.
