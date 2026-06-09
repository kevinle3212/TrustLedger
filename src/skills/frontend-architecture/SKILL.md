---
name: frontend-architecture
description:
    Use when changing Next.js routes, React components, state management, wallet
    integration, or frontend API calls.
---

# Frontend Architecture

- Keep route-specific components colocated with their route.
- Keep shared primitives in `components/`.
- Keep wallet setup and addresses in `lib/wagmi.ts`.
- Keep server-only logic in `services/` or API routes.
- Run typecheck, frontend lint, targeted tests, and React Doctor.
