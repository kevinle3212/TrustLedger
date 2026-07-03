# Codex Agent Notes

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../CREDITS.md).

Read root `AGENTS.md` first. This file only adds Codex-specific behavior.

## Shell

- Read `@/Users/kevinkhanhle/.codex/RTK.md` at session start.
- Prefix shell commands with `rtk` when available.
- Do not duplicate Claude-only behavior from `CLAUDE.md`.

## Repo Hygiene

- Treat uncommitted user changes as owned by the user.
- Keep generated diagnostics, agent run notes, audit output, and error logs in
  `logs/`; the directory is intentionally ignored by git.
- Format `logs/*.md` with `src/.agents/skills/log-markdown/SKILL.md`.
- Run `npm run logs:check` after writing logs; use `npm run logs:prune` when
  retention limits are exceeded.
- Keep temporary scratch files in project-local `tmp/` instead of system `/tmp`
  unless an external tool requires otherwise. Use `TRUSTLEDGER_TMP_DIR=./tmp`
  for commands that accept an explicit temp root. Run `npm run tmp:check` after
  creating scratch files and `npm run tmp:prune` when retention limits are
  exceeded.
- After heavy Docker test sessions, image builds, or pushes, run
  `docker system df -v` or `npm run docker:storage:check`. If Docker build cache
  is multiple GB and Dockerfiles are not actively being iterated, run
  `npm run docker:storage:prune`.
- Localhost browser checks are allowed for requested UI validation. Start the
  frontend from `src/` with `rtk npm run dev:frontend`; if sandboxed binding
  blocks the check, rerun that command with escalation using the user's
  repository-level pre-authorization for localhost browser validation.
- Prefer the Codex in-app Browser plugin for localhost checks. If `iab` cannot
  be acquired, do not stop the investigation: fall back to the installed
  Playwright package, request escalation for the local Chromium process when
  sandboxing blocks launch, and report the fallback explicitly.
- Keep working clones outside iCloud-synced locations such as `~/Desktop`,
  `~/Documents`, and `~/Library/Mobile Documents`. Preferred local roots are
  `~/Development`, `~/Projects`, `~/Code`, and `~/Workspace`.
- Keep external fetches and RPC transports bounded by explicit timeouts. New
  provider integrations should reuse `src/lib/fetchTimeout.ts` or an equivalent
  provider-native timeout so UI loading states cannot wait indefinitely.
- Prefer targeted checks before broad gates, and check for duplicate
  build/dev/doctor processes when commands appear stuck.
- Secret scanning: `npm run secrets:check` requires `gitleaks` and scans git
  history with redacted output. Use `npm run secrets:gitleaks:staged` for
  pre-commit reproduction. Avoid `gitleaks dir` as a default hook because it
  scans ignored local caches and secret-bearing `.env` files; use it only as an
  explicit manual filesystem investigation.
- For frontend specialist context, read `src/.agents/README.md` and the matching
  skill under `src/.agents/skills/` before editing.

## Required Routing

- Dependency and vulnerability reviews: use
  `src/.agents/agents/dependency-auditor.md` and write the summary log under
  `logs/`.
- If the user explicitly approves high-risk npm audit registry disclosure,
  request escalated `npm audit` execution and state that approval in the
  justification.
- SWC changes: use `src/.agents/skills/swc-config/SKILL.md`, then run
  `npm run swc:populate` and the relevant build.
- Quality standards: enforce `docs/QUALITY-STANDARDS.md`. Every change must pass
  TypeScript, ESLint, the test suites, and the production build. React Doctor
  must stay at 100/100, and Lighthouse must stay at 95+ in every category
  (Performance, Accessibility, Best Practices, SEO) before deployment — target
  100 where achievable and document any blocker. Block merges and deployments
  when React Doctor, type-check, lint, tests, build, Lighthouse, accessibility,
  performance, or security checks fail. Never introduce unused code, preserve
  accessibility and security standards, and investigate and resolve new warnings
  at their root cause instead of suppressing them. Validate compliance before
  completing tasks.
- React diagnostics: use `src/skills/react-doctor/SKILL.md` and keep the score
  from regressing.
- Legal and compliance-sensitive changes: use
  `src/.agents/skills/legal-compliance/SKILL.md`; do not edit root legal drafts
  without explicit approval for those files.
- Admin dashboard changes: use `.sixth/skills/admin-dashboard/SKILL.md`, keep
  admin mode read-only unless explicit audited actions are requested, and never
  commit plaintext admin credentials.
- Rust backend changes: use `.sixth/skills/rust-backend/SKILL.md`, then run
  `npm run rust:fmt`, `npm run rust:clippy`, and `npm run rust:test`.
- Context sync: after repository changes, use
  `src/.agents/skills/update-context/SKILL.md` so docs, comments, visible
  project surfaces, and agent instructions stay current without duplicated
  guidance. Remove or update stale references to moved or renamed code, assets,
  commands, environment variables, and docs.
- Configuration docs: when scripts, hooks, workflows, provider integrations, or
  external CLI assumptions change, update
  `docs/ENVIRONMENT.md#configuration-beyond-env` plus the nearest owner doc.
  Keep `package.json` command assumptions, such as `gh api` authentication,
  documented outside the script itself.
- UI copy follows root `AGENTS.md`: Title Case for labels/buttons/headings and
  sentence case for complete explanatory sentences, while preserving acronyms
  such as `HTML`, `FAQ`, `URL`, `ETH`, `USDC`, and `IPFS`.

## Clarify Before Acting <!-- clarify-before-acting -->

- Before replying or starting work, if the request is ambiguous or my intent is
  unclear, interview me with focused questions until it is unambiguous.
- Ask one round of concise, high-signal questions; state any assumptions you must
  make and confirm them before proceeding.
- Do not begin implementation while a meaningful interpretation is still open.
