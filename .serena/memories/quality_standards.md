# Quality Standards

Canonical spec: `docs/QUALITY-STANDARDS.md`. Enforce before completing any task
or approving any change.

## Hard Gates (block merge/deploy/release on failure)

- React Doctor = 100/100 (`npm run doctor` from `src/`). No exceptions; resolve
  regressions and warnings proactively.
- Type-check (`npx tsc --noEmit`), lint/format, tests (`forge`/Jest/Playwright),
  build (`forge build`, `next build`), accessibility, performance, security
  (Semgrep, `security.yml`).

## Invariants

- Remove dead code/imports/assets/duplication your change exposes; respect scope
  (`AGENTS.md` Code Hygiene — surface unrelated dead code, do not delete).
- TSDoc on new functions/classes/types/hooks/services/controllers/public APIs.
- Document every API route and smart-contract surface; keep docs in sync in the
  same PR.
- Maintain `controllers/` business-logic separation and `CREDITS.md`.
- Bound external fetches/RPC with explicit timeouts (`src/lib/fetchTimeout.ts`).

## Verify After Changes

React Doctor 100/100, build, type-check, lint, tests, a11y, mobile
responsiveness all pass; no memory spikes, freezes, regressions, warnings, or
doc gaps. Report failures and skips faithfully with evidence.
