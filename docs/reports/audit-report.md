# Repository Audit Report

<a id="top"></a>

<!-- docs-nav:start -->

[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Structure And Build System](#structure-and-build-system)
- [Linting And TypeScript](#linting-and-typescript)
- [Hooks And CI](#hooks-and-ci)
- [Assets](#assets)
- [SWC](#swc)
- [Build Performance](#build-performance)
- [Cache Health](#cache-health)
- [Oracle Phase 6 Item 3](#oracle-phase-6-item-3)
- [Monitoring Implementation](#monitoring-implementation)
- [Remaining Risks](#remaining-risks)

<!-- docs-toc:end -->

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../CREDITS.md).

Date: 2026-06-09

## Structure And Build System

<!-- docs-section-nav:start -->

[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

TrustLedger is a mixed Solidity, TypeScript, Next.js, Python, Docker, and docs
repository. Root tooling owns contracts, scripts, docs, Docker, and CI. `src/`
owns the frontend package and Next.js API routes. `contracts/` owns Foundry.

## Linting And TypeScript

<!-- docs-section-nav:start -->

[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- Root ESLint uses flat config with type-aware rules for `test/**/*.ts`,
  `scripts/**/*.ts`, and `hardhat.config.ts`.
- `eslint.scripts.config.mjs` handles `scripts/**/*.js` with strict core JS
  rules.
- Config files are linted by `npm run lint:config` with JS parsing so they do
  not hit `tsconfig.hardhat.json` parser-project errors.
- `tsconfig.hardhat.json` covers Hardhat config, tests, scripts, and shared
  types.
- `src/tsconfig.json` covers the Next app and shared frontend `src/types/`.

## Hooks And CI

<!-- docs-section-nav:start -->

[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- Pre-commit validates Prettier, root lint, frontend lint, and typecheck.
- Pre-push validates root/frontend lint, typecheck, frontend unit/E2E tests, and
  Foundry build/test.
- `lint-staged` is not installed. Hooks use deterministic repo-level commands
  instead of adding a new dependency.
- CI has separate frontend, TypeScript, Python, Hardhat, and Solidity jobs.

## Assets

<!-- docs-section-nav:start -->

[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Canonical target folders now exist under `assets/`: `images`, `icons`, `logos`,
`screenshots`, `diagrams`, `branding`, and `documentation`. Existing imports
were not migrated because current paths include docs theme assets and frontend
public assets with separate build semantics. No broken path migration was
introduced.

## SWC

<!-- docs-section-nav:start -->

[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`src/.swc/` exists as a cache/config artifact area for the Next/SWC toolchain.
No custom SWC plugins were added. The current project does not justify custom
SWC configuration beyond Next.js defaults.

## Build Performance

<!-- docs-section-nav:start -->

[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- Docker and CI use lockfile-based installs and separate frontend/root caches.
- `.dockerignore` and `.gitignore` should continue excluding build outputs,
  caches, `node_modules`, `.next`, coverage, artifacts, and contract caches.
- Next.js/SWC defaults are appropriate.
- TypeScript incremental metadata is enabled.
- Cron, oracle, and health routes bound remote reads and expose enough status
  for deployment smoke checks without leaking secrets.

## Cache Health

<!-- docs-section-nav:start -->

[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Observed cache families: npm, Next.js, TypeScript `.tsbuildinfo`, ESLint,
Prettier, Hardhat, Foundry, SWC, Serena, and generated site/docs output. No
cache corruption was proven. Use existing `cache:clear` scripts only when a
cache is demonstrably stale; avoid routine invalidation.

## Oracle Phase 6 Item 3

<!-- docs-section-nav:start -->

[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Implemented a server-side oracle service and API route for validated exchange
rates:

- `src/services/oracle.ts`
- `src/app/api/oracle/rates/route.ts`
- `src/tests/unit/oracle.test.ts`

The implementation includes source configurability, allowlisted symbols,
positive-price validation, short TTL caching, stale fallback marking, and JSON
error responses. It does not yet feed smart contracts; using oracle data
on-chain requires a separate audited design.

## Monitoring Implementation

<!-- docs-section-nav:start -->

[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Added `GET /api/health` through `src/services/health.ts` and
`src/app/api/health/route.ts`. It reports operational readiness for runtime,
Sepolia RPC configuration, notification secret presence, cron secret presence,
oracle source, and public app URL validity. It returns only presence/status
metadata, never secret values.

## Remaining Risks

<!-- docs-section-nav:start -->

[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- Phase 7 Item 3 has current sweep coverage for legal helpers, Solana helpers,
  and the interactive home preview; deeper future coverage gaps remain tracked
  in `docs/reports/coverage-gap-report.md`.
- Mainnet requires a third-party contract audit and a signed audit report.
- Production monitoring still needs an external alert sink such as Sentry,
  Datadog, Grafana Cloud, Better Stack, or an equivalent service.
- External provider failure handling needs deeper E2E coverage.
