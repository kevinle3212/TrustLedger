---
name: security
description:
    Use when changing API routes, authentication, wallet flows, secrets,
    external requests, contracts, or deployment config.
---

# Security

- Validate request bodies and query params before service calls.
- Keep non-public env vars server-only.
- Gate email, cron, and privileged operations with bearer secrets.
- Do not leak stack traces, secrets, private keys, or tokens.
- Update `SECURITY.md` and `docs/SECURITY.md` for new trust boundaries.
