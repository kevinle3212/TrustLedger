---
name: frontend-architecture
description: Use when changing Next.js routes, React component structure, wallet wiring, state boundaries, or API integration patterns in TrustLedger.
---

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
