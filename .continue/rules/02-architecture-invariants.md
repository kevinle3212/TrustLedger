---
name: TrustLedger Architecture Invariants
alwaysApply: true
---

# Architecture Invariants

- The chain is authoritative. Off-chain infrastructure may support, cache,
  index, draft, or enrich chain state, but it must not silently override it.
- Database support is optional. The app must build and run without
  `DATABASE_URL`; guard database work with `isDatabaseConfigured()` and preserve
  in-memory fallbacks where the project expects them.
- Prisma schema lives at `src/prisma/schema.prisma`; generated client lives at
  `src/lib/generated/prisma` and is gitignored. Hand-written migrations live in
  `src/prisma/migrations/000N_name/migration.sql`.
- Import database helpers from `@/lib/db`. Do not import Prisma directly from a
  Client Component or browser-reachable module.
- Keep AI code provider-agnostic and server-only at `src/core/ai`, imported as
  `@/core/ai`. Use adapter/config patterns and `generateText` or `streamText`;
  do not hardcode provider-specific calls at feature call sites.
- Sensitive route IP gating lives in `src/proxy.ts` using the Next.js 16 proxy
  model, not middleware. New sensitive segments belong in `SENSITIVE_SEGMENTS`.
  Blocked IPs get a branded 404 without leaking route existence.
- Branded error pages reuse `CowErrorScene` from
  `src/components/CowErrorScene.tsx`. Motion must be transform-only and frozen
  under `prefers-reduced-motion`.
- Wallet session restore uses standalone connectors in `src/lib/wagmi.ts` and
  `WalletSessionRestore` in `src/components/Providers.tsx`. Do not add
  `window.ethereum` or `eth_accounts` auto-connect probes.
- Keep restore logic client-only. Do not restore wallet sessions through SSR
  cookies or server reads.
- Keep App Router layout boundaries under `src/app/[locale]/`. Route-specific UI
  belongs beside the route; reusable UI belongs in `src/components`.
- Keep server-only work in API routes, services, controllers, repositories, or
  server components. Do not leak server-only env values to browser bundles.
- Keep reusable business logic out of React components when it belongs in
  `src/services`, `src/controllers`, `src/lib`, or repositories.
- Keep external fetches and RPC transports bounded by explicit timeouts. Reuse
  `src/lib/fetchTimeout.ts` or provider-native timeout support.
- Preserve the `controllers/` separation for business logic and keep
  `CREDITS.md` current when contributor or dependency acknowledgements change.
