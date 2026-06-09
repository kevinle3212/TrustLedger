---
name: frontend-architecture
description: Use when changing Next.js routes, React component structure, wallet wiring, state boundaries, or API integration patterns in TrustLedger.
---

# Frontend Architecture

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

## Checklist

- Preserve App Router layout boundaries under `app/[locale]/`.
- Keep server-only work in API routes or `services/`.
- Keep reusable UI in `components/`; keep route-specific UI beside the route.
- Keep role state in `contexts/RoleContext.tsx`.
- Keep wallet and contract address logic isolated in `lib/wagmi.ts`.
- Add or update unit tests for changed helpers and route behavior.
