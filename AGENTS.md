# AGENTS.md

Shared, tool-agnostic agent rules, layered to avoid contradictions: this file
holds precedence, invariants, and pointers. Per-role directories, commands, and
invariants live in [`AGENT-CONTEXT.md`](./AGENT-CONTEXT.md) — read the section
matching your role when your task touches its area. Codex sessions must also
read [`.codex/AGENTS.md`](./.codex/AGENTS.md) (tool routing, MCP mechanics,
`rtk` shell prefixing, sandbox behavior) before touching files.

## Precedence

1. Active user request.
2. Repository `AGENTS.md`.
3. `.codex/AGENTS.md` for Codex-specific behavior.
4. `CLAUDE.md` for Claude-specific behavior.
5. `.cursor/rules/*.mdc` for Cursor path-specific context.
6. General repository documentation.

## Invariants (Mandatory)

`docs/QUALITY-STANDARDS.md` is the canonical quality, performance,
accessibility, and deployment specification; enforce it and validate compliance
before completing tasks. Non-negotiables:

- Every change passes TypeScript (`npx tsc --noEmit`), ESLint, the test suites,
  and the production build (`next build`) before merge or deploy.
- React Doctor stays at 100/100 and Lighthouse at 95+ in every category before
  deploy (target 100; document any blocker). Failing gates block merges,
  releases, and deployments; never weaken a hard gate to ship faster.
- Investigate and resolve new warnings (build, lint, test, runtime, console) at
  the root cause; suppress only verified false positives with an inline
  justification.
- Remove code your change makes dead — unused functions, imports, files,
  dependencies (`npm run lint:knip`), duplicates — and update imports, CI
  config, tests, and docs for every move or rename in the same PR. Do not delete
  unrelated pre-existing dead code; surface it instead (`CLAUDE.md` §3).
- Add TSDoc to new code elements; document API routes and smart-contract
  surfaces; keep `controllers/` separation and `CREDITS.md` current; keep docs
  synchronized in the same PR.

## Commit Messages

`commitlint.config.js` (run by the Husky `commit-msg` hook) is the single source
of truth; never use `--no-verify`. Header `type(scope): subject` must be **72
characters or fewer** in total — the most common failure; count first and move
detail into the body. Type is one of
`build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test`; scope is
optional kebab-case from the config's `scope-enum`; subject is lower-case or
sentence-case with no trailing period and no mid-word capitals (`eslint`, not
`ESLint`). Body and footer lines wrap at 100 characters with a blank line before
each.

## Runner Discipline

- Prefer targeted checks (`npm run native:check`, focused Jest files,
  package-local typecheck) before broad gates. If a command hangs, look for
  duplicate build/dev/doctor processes and stale locks before relaunching, and
  leave no background servers or analyzers running.
- Before staging, run `bash tools/remove-duplicates.sh --fail-on-found .`; for
  security-sensitive work also `npm run secrets:check`. Keep the known-public
  WalletConnect registry-ID exception in `.gitleaks.toml` scoped to the exact
  value, rule, and file — never commit-SHA fingerprints.
- After heavy Docker builds or test runs, `npm run docker:storage:check`; prune
  multi-GB idle build cache with `npm run docker:storage:prune`.

## Orchestration

Act as the orchestrator: pick the most token- and cost-efficient path that does
not compromise quality or security. Plan with the cheapest capable model,
delegate implementation to cheaper agents, and reserve the top tier for planning
and the final QA pass. Tool-specific delegation policy lives in `CLAUDE.md` and
`.codex/AGENTS.md`. When spawning Claude Code coding sessions, tell them to load
gstack (`/cso`, `/review`, `/qa <url>`, `/autoplan` → implement → `/ship`).

## Routing

- Frontend: `src/app`, `src/components`, `src/contexts`, `src/lib`,
  `.cursor/rules/frontend.mdc`. Backend: `src/app/api`, `src/services`,
  `.cursor/rules/backend.mdc`. Contracts: `contracts`, `test`,
  `.cursor/rules/contracts.mdc`. Testing: `src/tests`, `test`, `contracts/test`,
  `.cursor/rules/testing.mdc`. Docs: root markdown, `docs/`, `src/README.md`,
  `.cursor/rules/docs.mdc`.
- Admin dashboard: `.sixth/skills/admin-dashboard/SKILL.md` plus
  `docs/ADMIN.md`. Rust backend: `.sixth/skills/rust-backend/SKILL.md`.
  Security: `.cursor/rules/security.mdc`, `SECURITY.md`, `docs/SECURITY.md`.
- Legal, privacy, or cookie work: `src/.agents/skills/legal-compliance/SKILL.md`
  is mandatory — its "Privacy & Cookie Feature Sync" section governs
  `src/content/legal/*` updates. Root legal draft markdown is owner-controlled;
  never edit without explicit approval.
- Focused-work skills (all under `src/.agents/skills/`): typescript-strict,
  eslint-strict, react-doctor (keep 100/100), stylelint (`npm run lint:styles`),
  knip (`npm run lint:knip`), playwright-a11y, swc-config
  (`npm run swc:populate` before frontend builds), env-sync, kubernetes,
  update-context (run after repo changes), log-markdown. Dependency and
  vulnerability review: `src/.agents/agents/dependency-auditor.md`, summaries to
  `logs/`.
- Secret scanning: keep `.gitleaks.toml` strict; `npm run secrets:gitleaks` for
  history scans, `npm run secrets:gitleaks:staged` for hook reproduction;
  `.gitleaksignore` fingerprints only for historical findings that cannot be
  scoped in `.gitleaks.toml`.
- Run notes, audit output, and issue triage go in gitignored `logs/` (format per
  the log-markdown skill; `npm run logs:check` / `logs:prune`). Scratch files go
  in project-local `tmp/` (`TRUSTLEDGER_TMP_DIR=./tmp`; `npm run tmp:check` /
  `tmp:prune`).
- Localhost UI checks: start `rtk npm run dev:frontend` from `src/`; if
  sandboxed binding blocks it, rerun with escalation (pre-authorized for
  localhost validation). Prefer the in-app browser plugin; fall back to
  Playwright and document the fallback.
- Bound every external fetch and RPC transport with an explicit timeout — reuse
  `src/lib/fetchTimeout.ts` or a provider-native equivalent.
- Keep working clones outside iCloud-synced paths (`~/Desktop`, `~/Documents`,
  `~/Library/Mobile Documents`); prefer `~/Development` or similar.
- New scripts, workflows, provider integrations, or CLI dependencies: update
  `docs/ENVIRONMENT.md#configuration-beyond-env` and the owning docs in the same
  change; workflows must install any non-npm binary a package script invokes —
  local hook availability is not enough for hosted runners.

## UI Copy

- Title Case for non-sentence labels, buttons, badges, menu items, headings, and
  status chips (`Create Contract`, `Sepolia Faucet Guide`).
- Sentence case, with a grammar/punctuation/clarity pass, for full sentences,
  helper text, warnings, and error explanations.
- Preserve established acronyms and product terms exactly: `HTML`, `FAQ`, `URL`,
  `URI`, `ETH`, `USDC`, `IPFS`, `Solana Devnet`, `Ethereum Sepolia`.
- After changing visible localized copy, compare non-source message files
  against `src/messages/en.json` for English leftovers in the touched
  namespaces; translate them or document why the English term is intentional.

## Working Agreements

- Roadmap discipline: never mark roadmap, Oracle, Phase, or milestone items
  complete without objective implementation and validation evidence; keep any
  remaining scope documented instead of silently dropping it.
- Multi-task prompts: render a Markdown checkbox checklist (one line per
  distinct task, with a short verification step) before starting, and keep it
  updated as items complete.
- Learning hygiene: after a complex mistake that took substantial debugging, add
  one concise prevention note to the nearest skill or agent file (skip typos and
  routine lint fixes). Keep agent files compact — point to focused skills
  instead of duplicating long instructions.

## graphify

Knowledge graph at `graphify-out/`. For codebase questions run
`graphify query "<question>"` first; `graphify path "<A>" "<B>"` for
relationships, `graphify explain "<concept>"` for one concept;
`graphify-out/wiki/index.md` for broad navigation; read `GRAPH_REPORT.md` only
for architecture review. Dirty `graphify-out/` files are expected and never a
reason to skip. After modifying code, run `graphify update .`. When the user
types `/graphify`, use the installed graphify skill before anything else.

## MCP and Graph Tool Ownership

One split, all agents (tool-specific files may add mechanics but must not
redefine it):

- **Serena** — symbolic code navigation and focused repository inspection
  (symbols, references, precise edits).
- **Nexus** — project-local MCP code-graph queries (`scripts/nexus-mcp.js`) for
  tools that consume MCP context rather than shelling out.
- **Graphify** — the persistent knowledge graph and long-term memory layer
  (`graphify-out/`). Prefer it before rescanning unchanged parts of the
  repository; refresh with `graphify update .` after meaningful changes (skip
  for formatting, comments, lockfiles, and docs-only edits that do not change
  behavior — agent-instruction changes do count as meaningful).
- **Browser tooling** — in-app browser first for localhost UI validation;
  Playwright as fallback. Computer Use is for desktop UI tasks only.

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
