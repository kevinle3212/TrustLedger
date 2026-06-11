# AGENTS.md

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

TrustLedger agent guidance is intentionally layered to avoid contradictions.

## Precedence

1. Active user request.
2. Repository `AGENTS.md`.
3. `.codex/AGENTS.md` for Codex-specific behavior.
4. `CLAUDE.md` for Claude-specific behavior.
5. `.cursor/rules/*.mdc` for Cursor path-specific context.
6. General repository documentation.

## Shell Commands

Codex sessions must read `@/Users/kevinkhanhle/.codex/RTK.md` and prefix shell
commands with `rtk` when available.

## Runner Discipline

- Prefer targeted checks first (`npm run native:check`,
  `npm run analytics:check`, focused Jest files, or package-local typecheck)
  before broad gates such as full lint, full quality, or full E2E.
- If a command hangs, inspect for duplicate build/dev/doctor processes and stale
  generated locks before launching another copy. Do not leave background servers
  or analyzers running.
- When moving, replacing, or removing code, remove stale imports, exports,
  tests, styles, route references, and docs in the same change. Run the nearest
  unused-code/type/lint check before staging so dead code is not carried
  forward.
- Run `bash tools/remove-duplicates.sh --fail-on-found .` before commit staging
  or commit hooks so duplicate-looking files are caught early without traversing
  deep generated trees.
- Run `npm run secrets:check` before staging security-sensitive work. It runs
  the custom sensitive-path guard plus `gitleaks git` with redacted output. If
  Gitleaks reports a known public WalletConnect/Reown wallet registry ID in
  `src/lib/walletIds.ts`, keep the exception in `.gitleaks.toml` scoped to the
  exact public value, rule, and file; do not use commit-SHA fingerprints for
  values that must survive shallow CI checkouts.
- After heavy Docker builds, Docker test runs, or image pushes, run
  `docker system df -v` or `npm run docker:storage:check` to inspect image,
  volume, and build-cache growth. If build cache is multiple GB and no active
  Dockerfile iteration depends on it, run `npm run docker:storage:prune`.

## Agent Learning Hygiene

- When an agent makes a complex mistake that takes substantial time, tool usage,
  or repeated debugging to repair, add one concise lesson to the nearest
  relevant skill or agent guidance file. Keep this conservative: do not record
  simple typos, one-command fixes, or obvious lint issues.
- Keep main agent files compact. Prefer pointing to focused skills or docs
  instead of duplicating long instructions, unless the target agent does not
  support reference-style guidance.

## Routing

- Frontend work: `src/app`, `src/components`, `src/contexts`, `src/lib`, and
  `.cursor/rules/frontend.mdc`.
- Backend work: `src/app/api`, `src/services`, and `.cursor/rules/backend.mdc`.
- Admin dashboard work: `src/app/[locale]/admin`, `src/app/api/admin`,
  `src/services/admin*`, `docs/ADMIN.md`, and
  `.sixth/skills/admin-dashboard/SKILL.md`.
- Rust backend work: `.cargo/`, `Cargo.toml`, `lib/`, `programs/`, `infra/`,
  `docs/ADMIN.md`, and `.sixth/skills/rust-backend/SKILL.md`.
- Contract work: `contracts`, `test`, and `.cursor/rules/contracts.mdc`.
- Security work: `SECURITY.md`, `docs/SECURITY.md`, workflows, API routes,
  contracts, and `.cursor/rules/security.mdc`.
- Legal or compliance-sensitive work: root legal draft markdown files,
  `docs/LEGAL.md`, the website legal center, `SECURITY.md`, and
  `.sixth/skills/legal-compliance/SKILL.md`.
- Testing work: `src/tests`, `test`, `contracts/test`, and
  `.cursor/rules/testing.mdc`.
- Documentation work: root markdown, `docs/`, `src/README.md`, and
  `.cursor/rules/docs.mdc`.
- Dependency and vulnerability review: use
  `src/.agents/agents/dependency-auditor.md`; write scan summaries and
  recommendations to `logs/`.
- Secret scanning work: install `gitleaks` when missing, keep `.gitleaks.toml`
  strict, prefer `npm run secrets:gitleaks` for history scans and
  `npm run secrets:gitleaks:staged` for hook reproduction, and use
  `.gitleaksignore` fingerprints only for historical findings that cannot be
  safely scoped in `.gitleaks.toml`.
- Agentic run logs, Impeccable notes, audit results, errors, and issue triage
  notes belong in `logs/`. The directory is intentionally ignored by git. Format
  every `logs/*.md` file with `src/.agents/skills/log-markdown/SKILL.md` so
  ignored logs still comply with markdownlint. Run `npm run logs:check` after
  writing logs and `npm run logs:prune` when retention limits are exceeded.
- Temporary scratch files belong in project-local `tmp/`, not system `/tmp`,
  unless an external tool requires otherwise. `tmp/` is ignored by git; set
  `TRUSTLEDGER_TMP_DIR=./tmp` when a script needs an explicit temporary root.
  Run `npm run tmp:check` after creating scratch files and `npm run tmp:prune`
  when retention limits are exceeded.
- Docker work should include a storage check after heavy Docker test sessions,
  image builds, and pushes. Run `docker system df -v` or
  `npm run docker:storage:check`; when build cache has grown by multiple GB and
  Dockerfile layers are not under active iteration, run
  `npm run docker:storage:prune`.
- Localhost browser checks are permitted when UI validation is requested. Start
  the frontend from `src/` with `rtk npm run dev:frontend`; if sandboxed server
  binding blocks the check, rerun the same command with escalation and state
  that the user pre-authorized localhost browser validation for this repository.
- Prefer the Codex in-app Browser plugin for localhost UI checks. If `iab`
  cannot be acquired, fall back to the installed Playwright package, request
  escalation for Chromium when sandboxing blocks launch, and document that
  fallback in the run notes or final report.
- Keep working clones outside iCloud-synced locations such as `~/Desktop`,
  `~/Documents`, and `~/Library/Mobile Documents`; prefer `~/Development`,
  `~/Projects`, `~/Code`, or `~/Workspace` so file watchers, Next.js, Turbopack,
  TypeScript, and `node_modules` operations are not competing with cloud sync.
- Keep external fetches and RPC transports bounded by explicit timeouts. New
  provider integrations should reuse `src/lib/fetchTimeout.ts` or an equivalent
  provider-native timeout so UI loading states cannot wait indefinitely.
- SWC cache/policy work: use `src/.agents/skills/swc-config/SKILL.md`, keep
  generated native binaries ignored, and run `npm run swc:populate` before
  frontend builds or push-time checks.
- After code, config, workflow, deployment, documentation, website, or agent
  guidance changes, use `src/.agents/skills/update-context/SKILL.md` to update
  the nearest authoritative docs/comments, remove or update stale references to
  moved or renamed code/assets/commands, and run the relevant validation.
- When adding or changing scripts, workflows, deployment steps, provider
  integrations, CLI dependencies, or external service requirements, update
  `docs/ENVIRONMENT.md#configuration-beyond-env` and the nearest owning docs in
  the same change. For example, if a `package.json` script calls `gh api`, the
  docs must state the required GitHub CLI authentication and permissions.
- When a workflow invokes a package script that shells out to a non-npm binary,
  install or set up that binary in the workflow before the package script runs.
  Local availability from hooks is not enough for GitHub-hosted runners.

## UI Copy

- Use Title Case for non-sentence UI labels, buttons, badges, menu items,
  headings, and short status chips, for example `Create Contract`,
  `Sepolia Faucet Guide`, and `Show Walkthrough`.
- Use sentence case with a grammar, punctuation, syntax, and clarity pass for
  full sentences, paragraphs, helper text, warnings, and error explanations.
- Preserve established acronyms and product terms exactly: `HTML`, `FAQ`, `URL`,
  `URI`, `ETH`, `USDC`, `IPFS`, `Solana Devnet`, and `Ethereum Sepolia`.
- After changing visible localized copy, compare non-source message files
  against `src/messages/en.json` for exact English leftovers in the touched
  namespaces and either translate them or document why the English product term
  is intentional.

## Roadmap Discipline

Do not mark roadmap, Oracle, Phase, milestone, or planning items complete unless
objective implementation and validation evidence exists. When a roadmap item is
closed, keep any remaining future scope documented in reports or follow-up tasks
instead of silently dropping it.
