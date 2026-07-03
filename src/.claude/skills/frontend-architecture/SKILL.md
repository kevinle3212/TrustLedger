---
name: frontend-architecture
description: Use when changing Next.js routes, React component structure, wallet wiring, state boundaries, or API integration patterns in TrustLedger.
---

## Tool Fallback <!-- tool-fallback -->

- If a preferred tool, command, or skill is unavailable, failing, or a worse fit
  for the task, use the best available alternative rather than stopping or
  forcing it. Note which tool you used and why. Never fall back to a prohibited
  tool (for example `mcp__claude-in-chrome__*` is banned — use `/browse`).

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or the
desired outcome is unclear, interview the user with focused questions until intent
is unambiguous. State assumptions and confirm them before proceeding.

# Frontend Architecture

## Checklist

- Preserve App Router layout boundaries under `app/[locale]/`.
- Keep server-only work in API routes or `services/`.
- Keep reusable UI in `components/`; keep route-specific UI beside the route.
- Keep role state in `contexts/RoleContext.tsx`.
- Keep wallet and contract address logic isolated in `lib/wagmi.ts`.
- Add or update unit tests for changed helpers and route behavior.
