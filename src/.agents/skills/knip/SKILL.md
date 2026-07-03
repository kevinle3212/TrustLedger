---
name: knip
description:
    Use when adding dependencies, scripts, exports, files, or frontend/backend
    modules. Detects unused files, exports, dependencies, and binaries.
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

# Knip

Run from the repository root:

```bash
npm run lint:knip
```

Strict expectations:

- Follow `knip.json`.
- Prefer removing unused code over ignoring it.
- Add ignore entries only for real CLI-only or framework-discovered files.
- Keep root and `src/` workspace entry points explicit.
