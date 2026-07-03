---
name: nextjs-react
description:
    Use when changing Next.js App Router pages, layouts, metadata, client
    components, or React hooks.
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

# Next.js And React

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../../CREDITS.md).

- Keep server components server-side unless hooks or browser APIs are required.
- Use explicit return types.
- Do not fetch display data in effects when an API route or server component can
  own the read.
- Keep hydration-safe state for wallet, theme, and localStorage reads.
- Run React Doctor after component changes.
