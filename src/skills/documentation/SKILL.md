---
name: documentation
description:
    Use when changing README files, docs, examples, developer workflows, routes,
    utilities, or env vars.
---

## Tool Fallback <!-- tool-fallback -->

- If a preferred tool, command, or skill is unavailable, failing, or a worse fit
  for the task, use the best available alternative rather than stopping or
  forcing it. Note which tool you used and why. Never fall back to a prohibited
  tool (for example `mcp__claude-in-chrome__*` is banned — use `/browse`).

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or
the desired outcome is unclear, interview the user with focused questions until
intent is unambiguous. State assumptions and confirm them before proceeding.

# Documentation

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../../CREDITS.md).

- Update root `README.md` for cross-repo behavior.
- Update `src/README.md` for frontend behavior.
- Link new docs from `mkdocs.yml` when they belong in the docs site.
- Keep examples concrete and commands copy-paste ready.
- Avoid placeholders and unsupported roadmap claims.
