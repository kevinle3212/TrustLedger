# Repository Audit Report

Date: 2026-06-09

## Structure And Build System

TrustLedger is a mixed Solidity, TypeScript, Next.js, Python, Docker, and docs
repository. Root tooling owns contracts, scripts, docs, Docker, and CI. `src/`
owns the frontend package and Next.js API routes. `contracts/` owns Foundry.

## Linting And TypeScript

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

- Pre-commit validates Prettier, root lint, frontend lint, and typecheck.
- Pre-push validates root/frontend lint, typecheck, frontend unit/E2E tests, and
  Foundry build/test.
- `lint-staged` is not installed. Hooks use deterministic repo-level commands
  instead of adding a new dependency.
- CI has separate frontend, TypeScript, Python, Hardhat, and Solidity jobs.

## Assets

Canonical target folders now exist under `assets/`: `images`, `icons`, `logos`,
`screenshots`, `diagrams`, `branding`, and `documentation`. Existing imports
were not migrated because current paths include docs theme assets and frontend
public assets with separate build semantics. No broken path migration was
introduced.

## SWC

`src/.swc/` exists as a cache/config artifact area for the Next/SWC toolchain.
No custom SWC plugins were added. The current project does not justify custom
SWC configuration beyond Next.js defaults.

## Build Performance

- Docker and CI use lockfile-based installs and separate frontend/root caches.
- `.dockerignore` and `.gitignore` should continue excluding build outputs,
  caches, `node_modules`, `.next`, coverage, artifacts, and contract caches.
- Next.js/SWC defaults are appropriate.
- TypeScript incremental metadata is enabled.
- Cron, oracle, and health routes bound remote reads and expose enough status
  for deployment smoke checks without leaking secrets.

## Cache Health

Observed cache families: npm, Next.js, TypeScript `.tsbuildinfo`, ESLint,
Prettier, Hardhat, Foundry, SWC, Serena, and generated site/docs output. No
cache corruption was proven. Use existing `cache:clear` scripts only when a
cache is demonstrably stale; avoid routine invalidation.

## Oracle Phase 6 Item 3

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

Added `GET /api/health` through `src/services/health.ts` and
`src/app/api/health/route.ts`. It reports operational readiness for runtime,
Sepolia RPC configuration, notification secret presence, cron secret presence,
oracle source, and public app URL validity. It returns only presence/status
metadata, never secret values.

## Remaining Risks

- Comprehensive Phase 7 coverage is not complete.
- Mainnet requires a third-party contract audit and a signed audit report.
- Production monitoring still needs an external alert sink such as Sentry,
  Datadog, Grafana Cloud, Better Stack, or an equivalent service.
- External provider failure handling needs deeper E2E coverage.
