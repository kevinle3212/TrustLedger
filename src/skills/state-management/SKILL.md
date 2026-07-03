---
name: state-management
description:
    Use when changing React state, context, localStorage, wallet state, React
    Query, or route data flow.
---

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or
the desired outcome is unclear, interview the user with focused questions until
intent is unambiguous. State assumptions and confirm them before proceeding.

# State Management

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../../CREDITS.md).

- Keep state local unless it crosses a route or provider boundary.
- Use context only for cross-cutting state such as role.
- Keep wallet state in wagmi/Reown hooks.
- Avoid localStorage during server render.
- Prefer derived values over duplicated state.
