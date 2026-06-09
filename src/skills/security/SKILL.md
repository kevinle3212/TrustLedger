---
name: security
description:
    Use when changing API routes, authentication, wallet flows, secrets,
    external requests, contracts, or deployment config.
---

# Security

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

- Validate request bodies and query params before service calls.
- Keep non-public env vars server-only.
- Gate email, cron, and privileged operations with bearer secrets.
- Do not leak stack traces, secrets, private keys, or tokens.
- Update `SECURITY.md` and `docs/SECURITY.md` for new trust boundaries.
