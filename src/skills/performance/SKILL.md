---
name: performance
description:
    Use when changing rendering, event scans, API calls, assets, animations, or
    dependency choices.
---

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or
the desired outcome is unclear, interview the user with focused questions until
intent is unambiguous. State assumptions and confirm them before proceeding.

# Performance

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../../CREDITS.md).

- Bound RPC reads and external API calls.
- Avoid adding client dependencies for server-only behavior.
- Use SVG for small UI marks.
- Animate transform, opacity, color, or border only.
- Prefer skeleton states over blocking spinners.
