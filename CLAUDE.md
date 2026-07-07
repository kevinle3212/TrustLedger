# CLAUDE.md — TrustLedger

Project rules only. Personal preferences (communication style, simplicity,
surgical changes, git permission rules, gstack, RTK) live in the global
`~/.claude/CLAUDE.md` and are never repeated here — a rule stated twice drifts
into two rules.

## Orientation (read before exploring)

- Knowledge graph: run `graphify query "<question>"` first for any codebase
  question; `graphify path "<A>" "<B>"` for relationships;
  `graphify explain "<concept>"` for one concept. Read
  `graphify-out/GRAPH_REPORT.md` only for broad architecture review. After
  modifying code, run `graphify update .`.
- Broad navigation: `graphify-out/wiki/index.md` when it exists.
- UI copy, coding conventions, and review standards: root `AGENTS.md`.
- Canonical quality spec: `docs/QUALITY-STANDARDS.md`.

## Architecture Invariants

The chain is authoritative; everything below is supporting infrastructure.

- **Database (optional)** — PostgreSQL via Prisma 7 on Neon. Schema
  `src/prisma/schema.prisma`; server-only client + repositories `src/lib/db/`
  (import from `@/lib/db`, never from a Client Component). The app must build
  and run without `DATABASE_URL`: guard DB work with `isDatabaseConfigured()`
  and keep an in-memory fallback. Generated client (`src/lib/generated/prisma`)
  is gitignored; `npm run db:generate | db:migrate | db:migrate:dev | db:studio`
  (from `src/`). Migrations are hand-written SQL in
  `src/prisma/migrations/000N_name/migration.sql`.
- **AI core** — provider-agnostic at `src/core/ai` (import `@/core/ai`). Never
  hardcode a provider at call sites; add backends as adapters + config. Use
  `generateText` / `streamText`. Server-only.
- **Sensitive routes** — `src/proxy.ts` (Next.js 16 proxy, not middleware)
  IP-gates `/admin` and `/api/admin/*` via `SENSITIVE_ALLOWED_IPS`. New
  sensitive segments go in `SENSITIVE_SEGMENTS` there. Blocked IPs get a branded
  404 that never leaks the route.
- **Error pages** — all branded error surfaces reuse `CowErrorScene`
  (`src/components/CowErrorScene.tsx`). Transform-only animation, frozen under
  `prefers-reduced-motion`. Never add per-page scenes.
- **Wallet session restore** — standalone connectors in `src/lib/wagmi.ts` +
  `WalletSessionRestore` in `src/components/Providers.tsx`. Never add a
  `window.ethereum` `eth_accounts` auto-connect probe (Phantom hijacks the
  persisted session). Keep restore client-only — no SSR cookie reads.

## Quality Gates (blocking)

Run from `src/` after frontend changes, before any PR:

```bash
npx tsc --noEmit          # TypeScript
npm run lint:frontend     # ESLint + Prettier
npm run doctor            # React Doctor — must stay 100/100
```

- React Doctor below 100/100 blocks merge, release, and deploy. Fix new `error`
  findings; triage `warning` findings before merging.
- Lighthouse 95+ in every category before deploy; document any blocker.
- Resolve new warnings (build, lint, test, runtime, console) at the root cause.
  Suppress only verified false positives, with an inline justification
  (`# nosemgrep: <rule-id>` for Semgrep).
- No unused code; TSDoc on new code elements; document API routes and contract
  surfaces; keep `controllers/` separation and `CREDITS.md` current.

## Branching and Committing

- Never commit to `main`; branch as `feat/...`, `fix/...`, `chore/...`.
- commitlint (Husky `commit-msg`) rejects non-conforming messages:
    - Header `type(scope): subject`, **≤ 72 chars total** — the most common
      rejection; count before committing, push detail into the body.
    - Type: `build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test`.
    - Scope (optional, kebab-case):
      `agents|api|arbitration|ci|contracts|deps| docker|docs|frontend|k8s|logs|security|swc|tests|tooling|types|vercel`.
    - Subject lower-case or sentence-case (write `eslint`, not `ESLint`); no
      trailing period.
    - Body/footer lines ≤ 100 chars, blank line before each.
- Branch must be green before merge: `forge test`, Hardhat tests,
  `npm run lint`, `prettier --check .`, `forge fmt --check`, `forge lint`,
  `forge build`, `next build`. Prefer a PR so CI runs; keep `main` deployable.

## Skills and Agents (use, don't reinvent)

- Project skills: `src/.claude/skills/*` (dependency-audit, env-sync,
  eslint-strict, knip, kubernetes, legal-compliance, log-markdown,
  playwright-a11y, react-doctor, stylelint, swc-config, typescript-strict,
  update-context). Invoke the matching skill before hand-rolling a workflow.
- After repo changes: `src/.claude/skills/update-context/SKILL.md` keeps docs
  and agent instructions current. Product/copy/legal-adjacent changes:
  `src/.claude/skills/legal-compliance/SKILL.md`. Never edit root legal draft
  markdown without explicit approval.
- Review agents: `src/.agents/agents/*` (accessibility, dependency-auditor,
  documentation, frontend-architect, performance, security, ui). Dependency and
  vulnerability reviews use `dependency-auditor.md`.

## Docs Sync (per change)

Before opening a PR, update whatever the change touches: CI/CD → `README.md`
badges/sections; features/APIs → `README.md` + `docs/`; env vars →
`.env.example`; dependencies/tooling → setup steps, `SECURITY.md`, `NOTES.md`;
moved/renamed files → purge stale references everywhere (docs, comments, config,
tests, agent instructions).

## Logs, Scratch, and TODO

- Agent run notes and audit output go in `logs/` (gitignored), formatted per
  `src/.agents/skills/log-markdown/SKILL.md` for readable summaries.
- Scratch files go in project-local `tmp/` (`TRUSTLEDGER_TMP_DIR=./tmp`);
  `npm run tmp:check` after creating, `npm run tmp:prune` on retention limits.
- Localhost UI checks: `rtk npm run dev:frontend`; rerun with escalation if
  sandbox binding blocks it (pre-authorized for localhost validation).
- Completed `TODO.md` items: check off, move to `## Completed`, then verify no
  regressions (tests, warnings) and report issues.

## Dependabot / Code Scanning Triage

A triage request is the per-turn `gh` permission grant. Pull alerts/PRs with
`gh`, verify safety against latest code, resolve conflicts without breaking
features, explain anything needing manual steps, and verify post-merge with
tests. Report post-merge issues with clear resolution steps.
