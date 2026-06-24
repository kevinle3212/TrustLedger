---
name: api-design
description:
    Use when changing Next.js API routes, services, response shapes, validation,
    caching, or monitoring.
---

# API Design

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../../CREDITS.md).

- Validate inputs at the route boundary.
- Return JSON-safe values, especially for bigint data.
- Keep external calls bounded, observable, and cached when appropriate.
- Use service helpers for reusable logic.
- Document endpoint behavior and examples.
