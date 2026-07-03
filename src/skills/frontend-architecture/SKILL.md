---
name: frontend-architecture
description:
    Use when changing Next.js routes, React components, state management, wallet
    integration, or frontend API calls.
---

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or
the desired outcome is unclear, interview the user with focused questions until
intent is unambiguous. State assumptions and confirm them before proceeding.

# Frontend Architecture

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../../CREDITS.md).

- Keep route-specific components colocated with their route.
- Keep shared primitives in `components/`.
- Keep wallet setup and addresses in `lib/wagmi.ts`.
- Keep server-only logic in `services/` or API routes.
- Run typecheck, frontend lint, targeted tests, and React Doctor.
