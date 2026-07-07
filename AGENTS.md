# AGENTS.md

> **Kevin K. Le** ([LinkedIn](https://linkedin.com/in/lekevin1)) — Founder,
> Founding Engineer, and Current Lead Engineer; Software Engineer at the Oregon
> Blockchain Group, University of Oregon.
>
> **Kellen Snider** — Founding Engineer; Software Engineer at the Oregon
> Blockchain Group, University of Oregon. His vision, ideas, and dedication
> during TrustLedger's Ethereum development were invaluable to the codebase we
> build on today.
>
> See [`CREDITS.md`](./CREDITS.md).

Before beginning any task, read [`AGENT-CONTEXT.md`](./AGENT-CONTEXT.md) and
locate the section matching your role (Principal and Staff Engineer, Solutions
Architect, DevOps Engineer, Security Engineer, QA Lead, UX Engineer, or
Technical Writer). That section lists the directories, commands, and invariants
that govern your work. Violating any invariant there is a regression.

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

## Orchestration

- Act as the orchestrator. Choose the most token- and cost-efficient path that
  does not compromise quality, security, or best practices.
- Plan with the cheapest capable model, delegate the building to cheaper
  models/agents, and reserve the most expensive model for planning and the final
  QA pass — do not use the top tier for routine implementation.
- When your tool exposes model tiers by name, see the tool-specific file
  (`CLAUDE.md`, `.codex/AGENTS.md`) for the exact delegation policy.

## Commit Messages

Every commit message is validated by `commitlint` (`commitlint.config.js`, run
by the Husky `commit-msg` hook). That file is the single source of truth; the
rules below mirror it. A message that violates any rule is rejected, so verify
before committing — do not use `--no-verify`.

- **Header length is the most common failure.** The header
  (`type(scope): subject`) must be **72 characters or fewer**, counting the
  type, scope, punctuation, spaces, and subject together. Count it before
  committing; if it is too long, move detail into the body, not a longer header.
- **Type** (required, lower-case): one of `build`, `chore`, `ci`, `docs`,
  `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`.
- **Scope** (optional, kebab-case) must be one of the `scope-enum` values:
  `agents`, `api`, `arbitration`, `ci`, `contracts`, `deps`, `docker`, `docs`,
  `frontend`, `k8s`, `logs`, `security`, `swc`, `tests`, `tooling`, `types`,
  `vercel`. An out-of-list scope (for example `trustledger` or `juror-registry`)
  is rejected — drop the scope or pick the closest allowed value.
- **Subject** (required): lower-case or sentence-case, no trailing period, no
  mid-word capitals (`eslint`, not `ESLint`).
- **Body** (optional): separate from the header with one blank line; wrap each
  line at **100 characters**.
- **Footer** (optional, e.g. `Co-Authored-By:`): precede with one blank line;
  wrap each line at **100 characters**.

```bash
# Header > 72 chars must move detail into a body
git commit -m "fix(frontend): wallet session persistence, navbar, and warning" \
  -m "Init AppKit on mount, move desktop nav to xl, and disable webstorage." \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Agent Learning Hygiene

- When an agent makes a complex mistake that takes substantial time, tool usage,
  or repeated debugging to repair, add one concise lesson to the nearest
  relevant skill or agent guidance file. Keep this conservative: do not record
  simple typos, one-command fixes, or obvious lint issues.
- Keep main agent files compact. Prefer pointing to focused skills or docs
  instead of duplicating long instructions, unless the target agent does not
  support reference-style guidance.

## Quality Standards (Mandatory)

`docs/QUALITY-STANDARDS.md` is the canonical documentation, quality,
performance, accessibility, and deployment specification. All agents must
enforce it and validate compliance before completing tasks or approving changes.
Non-negotiables:

- Every change must pass TypeScript (`npx tsc --noEmit`), ESLint, the test
  suites, and the production build (`next build`) before it can merge or deploy.
- React Doctor must stay at 100/100. No PR, merge, release, deployment, or
  production promotion may proceed below 100/100. Treat failures, warnings,
  regressions, and recommendations as high priority.
- Maintain Lighthouse scores of **95+** in every category (Performance,
  Accessibility, Best Practices, SEO) before deployment, and target **100**
  where realistically achievable; document any blocker preventing a perfect
  score.
- Block deployments and merges when React Doctor, type-check, lint, tests,
  build, Lighthouse, accessibility, performance, or security checks fail.
- Preserve accessibility and security standards on every change; never weaken a
  hard gate to ship faster.
- Investigate and resolve new warnings (build, lint, test, runtime, console,
  tooling) at their root cause instead of suppressing them; suppress only a
  verified false positive, with an inline justification.
- Remove unused code, dead files, stale imports, obsolete assets, duplicate
  logic, and unreachable code introduced or exposed by your change.
- Add TSDoc to new functions, classes, types, hooks, services, controllers, and
  public APIs; document API routes, smart-contract surfaces, and keep docs in
  sync within the same PR.
- Maintain the `controllers/` directory for business-logic separation and the
  `CREDITS.md` acknowledgements file.

See `docs/QUALITY-STANDARDS.md` for the full eleven-point specification and
verification checklist.

## Code Hygiene (Mandatory)

These rules are mandatory when refactoring, migrating, or moving/renaming files:

- Remove unused code that your change makes dead — functions, variables,
  components, types, and branches that are no longer reachable.
- Remove dead imports and unreachable code introduced or exposed by the change.
- Remove obsolete files after a migration, and remove unused dependencies once
  their last consumer is gone (verify with `npm run lint:knip`).
- Do not leave duplicate implementations. Prefer consolidation over
  fragmentation: extract one shared implementation rather than copy-pasting.
- Fix every lint, type, and build warning your change produces before opening a
  PR — do not defer them.
- Validate all moved/renamed files: update imports, path aliases, CI/CD config,
  tests, and docs so nothing references the old location.
- Keep documentation synchronized with code changes in the same PR.

Scope discipline still applies: do not delete pre-existing dead code unrelated
to your change — surface it instead (see `CLAUDE.md` §3).

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
- Privacy or cookie work: any change to how personal data is collected, stored,
  exported, deleted, or shared, or to cookies/`localStorage`/analytics/consent,
  must update the live policy sources `src/content/legal/PRIVACY_POLICY.md`
  (bump `Last Updated`/`Version`) and `src/content/legal/COOKIE_POLICY.md`
  (cookie inventory + consent behavior) in the same branch, kept consistent with
  `lib/cookie-consent.ts`. See `.sixth/skills/legal-compliance/SKILL.md`
  ("Privacy & Cookie Feature Sync"). Claim only functionality that exists.
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
  ignored logs stay readable. Run `npm run logs:check` after writing logs and
  `npm run logs:prune` when retention limits are exceeded.
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

## Task Checklists

Whenever a prompt contains more than one distinct task, break it into a visible
checklist rendered in the terminal before starting work, so the user can track
progress. Requirements:

- Render the checklist as Markdown checkboxes (`- [ ]` / `- [x]`) in your reply,
  one line per task, each with a short verification step.
- Derive one item per distinct task in the prompt; do not merge unrelated tasks
  into one line or invent work that was not requested.
- Update the checklist as items complete (`- [ ]` → `- [x]`) and surface it
  again when you report progress, so the current state is always visible.
- A single-task prompt does not need a checklist; a brief plan still applies per
  the goal-driven execution rules.

## Coding Tasks

When spawning Claude Code sessions for coding work, tell the session to use
gstack skills. Examples:

- **Security audit**: `Load gstack. Run /cso`
- **Code review**: `Load gstack. Run /review`
- **QA test a URL**: `Load gstack. Run /qa https://...`
- **Build a feature end-to-end**:
  `Load gstack. Run /autoplan, implement the plan, then run /ship`
- **Plan before building**:
  `Load gstack. Run /office-hours then /autoplan. Save the plan, don't implement.`

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community
structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or
instructions before doing anything else.

Rules:

- For codebase questions, first run `graphify query "<question>"` when
  graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for
  relationships and `graphify explain "<concept>"` for focused concepts. These
  return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw
  grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates;
  dirty graph files are not a reason to skip graphify. Only skip graphify if the
  task is about stale or incorrect graph output, or the user explicitly says not
  to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of
  raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when
  query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current
  (AST-only, no API cost).

## Tool Fallback <!-- tool-fallback -->

- When a preferred tool, command, skill, script, or agent is unavailable,
  failing, or a worse fit for the task, use the best available alternative
  instead of stopping or forcing the preferred one.
- Pick the option that most reliably accomplishes the goal; state which tool you
  used and why you substituted, so the choice stays auditable.
- This never overrides an explicit prohibition or a hard requirement (for
  example, never use `mcp__claude-in-chrome__*` — use `/browse`; never bypass
  the commit/PR quality gates). Fall back only among permitted tools.

## Clarify Before Acting <!-- clarify-before-acting -->

- Before replying or starting work, if the request is ambiguous or my intent is
  unclear, interview me with focused questions until it is unambiguous.
- Ask one round of concise, high-signal questions; state any assumptions you
  must make and confirm them before proceeding.
- Do not begin implementation while a meaningful interpretation is still open.
