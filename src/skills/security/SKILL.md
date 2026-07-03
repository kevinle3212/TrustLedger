---
name: security
description:
    Use when changing API routes, authentication, wallet flows, secrets,
    external requests, contracts, or deployment config.
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

# Security

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../../CREDITS.md).

- Validate request bodies and query params before service calls.
- Keep non-public env vars server-only.
- Gate email, cron, and privileged operations with bearer secrets.
- Do not leak stack traces, secrets, private keys, or tokens.
- Update `SECURITY.md` and `docs/SECURITY.md` for new trust boundaries.
