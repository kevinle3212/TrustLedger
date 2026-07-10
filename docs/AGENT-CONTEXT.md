# Agent and Task Context

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Principal and Staff Engineer](#principal-and-staff-engineer)
- [Solutions Architect](#solutions-architect)
- [DevOps Engineer](#devops-engineer)
- [Security Engineer](#security-engineer)
- [QA Lead](#qa-lead)
- [UX Engineer](#ux-engineer)
- [Technical Writer](#technical-writer)

<!-- docs-toc:end -->

This file maps each contributor role to the directories it owns, the commands it
runs, and the invariants it must preserve. Read the section matching your task
type **before making any change**. Violating any invariant listed here is a
regression.

Referenced by `AGENTS.md`, `CLAUDE.md`, and `CREDITS.md`. Also served by the
MkDocs site at `docs/AGENT-CONTEXT.md`.

---

## Principal and Staff Engineer

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

**Scope:** Cross-cutting design — smart-contract interfaces, API contracts,
data-flow decisions, performance budgets, and system-wide refactors.

**Directories:** `contracts/src/`, `src/app/`, `src/services/`,
`src/components/`, `src/lib/`, `src/contexts/`

**Commands before opening a PR:**

```bash
# Full quality gate: secrets, lint, types, tests, build, doctor, docs
npm run quality:all

# Foundry unit and invariant suite (10 000 fuzz runs per test)
npm run foundry:test

# Hardhat / Mocha integration suite
npm run hardhat:test

# Strict TypeScript check (no emit)
npx tsc --noEmit
```

**Invariants:**

- Never commit directly to `main`. Branch → PR → CI green → squash merge.
- TypeScript is configured at maximum strictness (`@tsconfig/strictest`). All
  new code must type-check cleanly with zero `any` assertions.
- Smart-contract changes require a matching Foundry test. No untested storage
  mutations.
- Solidity is compiled with `deny = "warnings"` in `foundry.toml` — every
  compiler warning is a hard build error.
- `via_ir = true` and `optimizer_runs = 200` in the default Foundry profile must
  not be changed without an explicit performance justification.
- React Doctor must stay at 100/100. No merge may proceed below that score.
- Every change must pass TypeScript, ESLint, the test suites, and the production
  build before merge or deployment.
- Lighthouse must stay at 95+ in every category (Performance, Accessibility,
  Best Practices, SEO) before deployment; target 100 where achievable and
  document any blocker.
- Never introduce unused code; preserve accessibility and security standards;
  investigate and resolve new warnings at their root cause instead of
  suppressing them.

---

## Solutions Architect

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

**Scope:** System boundaries, integration design, network topology, and
scalability decisions.

**Directories:** `docs/`, `docker/`, `k8s/`, `infra/`, `.github/workflows/`

**Commands:**

```bash
# MkDocs strict build — zero warnings required
npm run docs:build

# Verify every docs/*.md is wired into the mkdocs.yml nav
npm run docs:nav:check

# Internal cross-reference checker
npm run docs:links

# Prettier + kubectl kustomize validation
npm run lint:k8s
```

**Invariants:**

- `docs/ARCHITECTURE.md` must be updated whenever a contract interface, API
  route, or data-flow boundary changes.
- Every file in `docs/` must appear in the `mkdocs.yml` nav. Use
  `npm run docs:nav:check` to verify.
- `k8s/` manifests must pass `kubectl kustomize k8s` with no errors.
- Any new environment variable must be added to `.env.example` and
  `docs/ENVIRONMENT.md` in the same PR.

---

## DevOps Engineer

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

**Scope:** CI/CD pipelines, Docker images, Kubernetes manifests, Vercel
deployments, secret rotation, and environment management.

**Directories:** `.github/workflows/`, `docker/`, `k8s/`, `tools/`

**Commands:**

```bash
# Gitleaks + sensitive-path scan
npm run secrets:check

# Sync .env defaults to .env.example (no real secrets)
npm run env:sync

# Push local env to Vercel project settings
npm run env:sync:vercel

# docker compose build (storage check before and after)
npm run docker:build

# Contract + frontend container tests
npm run docker:test

# Kubernetes manifest validation
npm run lint:k8s

# Generate base64-encoded Kubernetes Secret manifest
npm run k8s:secret:generate
```

**Invariants:**

- Never commit a real secret. `npm run secrets:check` (gitleaks +
  `check-sensitive-files.mjs`) must pass on every branch before push.
- All workflow files in `.github/workflows/` must use pinned SHA refs for
  third-party actions (supply-chain protection).
- Docker builds run `npm run docker:storage:check` before and after to prevent
  volume bloat.
- Vercel production deployments require the `deploy.yml` workflow to succeed; do
  not run `vercel --prod` manually unless CI is broken.
- `tools/setup.sh` is the canonical environment bootstrap. Keep it current
  whenever a new tool or version joins the stack.

---

## Security Engineer

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

**Scope:** Smart-contract auditing, dependency vulnerability management, CSRF
defence, input validation, and secret hygiene.

**Directories:** `contracts/src/`, `src/security/`,
`.github/workflows/security.yml`

**Commands:**

```bash
# GitHub code-scanning + Dependabot alert summary
npm run security

# Gitleaks + sensitive-path scan
npm run secrets:check

# Root and frontend dependency audits
npm audit
cd src && npm audit

# Foundry suite including invariant and fuzz tests
npm run foundry:test

# Gas regression check
forge test --gas-report
```

**External tools (run separately before any contract PR):**

```bash
# Slither static analysis
slither contracts/src/ \
  --solc-remaps "@openzeppelin/=contracts/lib/openzeppelin-contracts/"

# Semgrep (also runs in CI via security.yml)
semgrep --config=auto contracts/src/
```

**Invariants:**

- Slither and Semgrep must be clean before any contract PR. Add
  `# nosemgrep: <rule-id>` with a justification comment for confirmed false
  positives.
- `solhint --max-warnings 0` is enforced by CI — zero warnings, zero exceptions.
- `forge lint` runs at all severity levels (`high`, `med`, `low`, `info`, `gas`)
  with `exclude_lints = []`; nothing is silently suppressed.
- Contracts use OpenZeppelin audited base classes for access control, reentrancy
  protection, and pausability. Do not roll custom implementations of those
  primitives.
- The CSRF layer lives in `src/security/`. Changes there must be reviewed
  against `docs/SECURITY.md` before merge.
- Chainlink VRF consumer code must not be altered without re-running the full
  randomness invariant suite.

---

## QA Lead

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

**Scope:** Test coverage, end-to-end scenarios, regression detection, and
quality-gate ownership.

**Directories:** `contracts/test/`, `src/tests/`, `src/playwright.config.ts`

**Commands:**

```bash
# Full suite: Foundry + Hardhat + frontend unit
npm run test

# Jest unit tests only
npm run test:unit

# Playwright E2E suite (headless Chromium)
npm run test:e2e

# Playwright interactive mode
npm run test:e2e:ui

# Jest coverage report
npm run test:coverage

# Locale-message and no-visible-JSX-literal checks
npm run i18n:scan

# React Doctor health check — must be 100/100
npm run doctor

# Foundry gas report (flag unexpected spikes)
npm run foundry:gas
```

**Invariants:**

- React Doctor score must not regress below 100/100. Any PR that drops the score
  is blocked.
- All Playwright tests must pass headless before merge. Use
  `@axe-core/playwright` assertions for every new page-level test.
- Foundry fuzz runs 10 000 iterations per test (`runs = 10000`, `seed = "0x1"`
  in `foundry.toml`). Do not reduce the run count.
- No test may carry a permanent `.skip` or `xit` without a linked tracking
  issue.
- `npm run i18n:scan` must pass — no visible JSX string literals outside locale
  message files.

---

## UX Engineer

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

**Scope:** UI components, design tokens, accessibility, internationalisation,
responsive layout, dark mode, and high-contrast mode.

**Directories:** `src/components/`, `src/app/`, `src/styles/`, `src/hooks/`,
`src/providers/`, `messages/`

**Commands:**

```bash
# React Doctor — must be 100/100
npm run doctor

# Stylelint for CSS/SCSS
npm run lint:styles

# Locale-message completeness check
npm run i18n:scan

# Playwright + axe-core accessibility assertions
npm run test:e2e

# ESLint + Prettier
npm run lint:frontend
```

**Invariants:**

- All user-visible copy must live in `messages/` locale files. No hardcoded
  English strings in JSX.
- Every new interactive component must have a keyboard-accessible path. WCAG 2.1
  AA compliance is required.
- Dark mode and high-contrast mode are both supported. Test both after any
  colour or background change.
- Tailwind CSS v4 tokens are the single source of truth for spacing, colour, and
  typography. Do not add inline styles for values that exist as design tokens.
- React Scan is active in `NODE_ENV=development` via `ReactScanMonitor` in the
  root layout. Use it to catch unnecessary re-renders before opening a PR.
- Follow the copy rules in `AGENTS.md`: Title Case for labels, buttons, badges,
  menus, and headings; sentence case for complete explanatory sentences;
  preserve acronyms (`HTML`, `FAQ`, `URL`, `ETH`, `USDC`, `IPFS`).

---

## Technical Writer

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

**Scope:** `docs/`, `README.md`, `CREDITS.md`, `AGENT-CONTEXT.md`, code
comments, inline TSDoc, and UI copy.

**Directories:** `docs/`, `README.md`, `CREDITS.md`, `AGENT-CONTEXT.md`,
`AGENTS.md`

**Commands:**

```bash
# MkDocs strict build — zero warnings required
npm run docs:build

# Ensure every docs/*.md is in the mkdocs.yml nav
npm run docs:nav:check

# Internal cross-reference checker
npm run docs:links

# External URL checker (slow — run before release)
npm run docs:links:external

# markdownlint-cli2 across all docs (80-char prose limit)
npm run lint:md

# Lint Cursor rule files
npm run lint:cursor
```

**Invariants:**

- `python -m mkdocs build --strict` must pass with zero warnings. The only
  permitted non-strict output is the vendor INFO about the `LICENSE` link in
  `CREDITS.md`.
- All cross-references between docs pages must use paths relative to `docs/`
  (e.g., `ARCHITECTURE.md`, not `../docs/ARCHITECTURE.md`).
- `CREDITS.md` lives at the repo root **and** at `docs/CREDITS.md`.
  `AGENT-CONTEXT.md` lives at the repo root **and** at `docs/AGENT-CONTEXT.md`.
  Edit both root files and copy to `docs/` before committing.
- The `mkdocs.yml` nav must list every file in `docs/`. Use
  `npm run docs:nav:check` to validate.
- Apply a grammar, punctuation, and clarity pass to every prose change. Short,
  unambiguous sentences; consistent terminology; backtick-wrap all code paths
  and identifiers.
- The `docs/reports/` sub-directory contains auto-generated reports. Do not
  hand-edit those files.
- Prose lines must be ≤80 characters (MD013). Code blocks and tables are exempt.
