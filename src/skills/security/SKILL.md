---
name: security
description:
    Use when changing API routes, authentication, wallet flows, secrets,
    external requests, contracts, or deployment config.
---

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
