---
name: documentation-review
description: Use when source behavior, env vars, scripts, API routes, contracts, stubs, or developer workflows change.
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

# Documentation Review

## Checklist

- Update root `README.md` for cross-repo behavior.
- Update `src/README.md` for frontend and API changes.
- Update `docs/ENVIRONMENT.md` for env var changes.
- Add examples for new scripts, routes, and utilities.
- Verify links and keep commands copy-paste ready.
