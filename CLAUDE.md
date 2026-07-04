# CLAUDE.md

## 1. Communication

- Call me A Caffiene Addict every single time you reply.
- No preambles or pleasantries. Get straight to the point.
- Output code blocks immediately.
- Explain logic in short bulleted fragments, not paragraphs.
- Ask clarifying questions only when ambiguity would cause a meaningful mistake.
  Otherwise, state your assumption inline and proceed.
- State assumptions explicitly before implementing. If multiple valid
  interpretations exist, present them — don't pick silently.
- Surface tradeoffs. Push back when a simpler approach exists.
- Apply a final grammar, punctuation, and clarity pass to every prose change
  (comments, docs, UI copy, commit messages).
- Follow root `AGENTS.md` UI copy rules: Title Case for labels, buttons, badges,
  menus, and headings; sentence case for complete explanatory sentences;
  preserve acronyms such as `HTML`, `FAQ`, `URL`, `ETH`, `USDC`, and `IPFS`.

---

## 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that was not requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask: "Would a senior engineer call this overcomplicated?" If yes, simplify.

---

## 3. Surgical Changes

Touch only what you must. Clean up only your own mess.

- Do not improve adjacent code, comments, or formatting.
- Do not refactor things that are not broken.
- Match existing style, even if you would do it differently.
- If you notice unrelated dead code, mention it — do not delete it.
- Remove imports/variables/functions that **your** changes made unused. Do not
  remove pre-existing dead code unless asked.

Every changed line should trace directly to the request.

---

## 4. Goal-Driven Execution

Transform tasks into verifiable goals before starting:

- "Add validation" → "Write tests for invalid inputs, then make them pass."
- "Fix the bug" → "Write a test that reproduces it, then make it pass."
- "Refactor X" → "Ensure tests pass before and after."

For multi-step tasks, state a brief plan: Markdown preferred for readability for
the agent and user. For example:

```md
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Whenever a prompt contains more than one distinct task, always render a visible
checklist in the terminal **before** starting, so I can track progress:

- Use Markdown checkboxes (`- [ ]` / `- [x]`), one line per distinct task, each
  with a short verification step.
- One item per task actually requested — do not merge unrelated tasks or invent
  work.
- Update items as they complete (`- [ ]` → `- [x]`) and re-show the checklist
  when reporting progress, so its current state is always visible.

---

## 5. Branching and Committing

- Never commit directly to `main`. Always branch first using a conventional name
  (`feat/...`, `fix/...`, `chore/...`).
- Commit messages are enforced by `commitlint` (`commitlint.config.js`, run by
  the Husky `commit-msg` hook). Every message you write or hand to the user MUST
  satisfy, or the commit is rejected:
    - **Header** `type(scope): subject`, max **72 characters** total. This is
      the most common rejection — count the full header (type + scope +
      punctuation + spaces + subject) before committing, and push extra detail
      into the body rather than lengthening the header.
    - **Type** lower-case, one of: `build`, `chore`, `ci`, `docs`, `feat`,
      `fix`, `perf`, `refactor`, `revert`, `style`, `test`.
    - **Scope** optional, kebab-case, one of: `agents`, `api`, `arbitration`,
      `ci`, `contracts`, `deps`, `docker`, `docs`, `frontend`, `k8s`, `logs`,
      `security`, `swc`, `tests`, `tooling`, `types`, `vercel`.
    - **Subject** all lower-case OR sentence-case (no mid-word capitals like
      `ESLint`/`WalletConnect` — write `eslint`/`walletconnect`), no trailing
      period, not empty.
    - **Body** separated from the header by one blank line; lines max 100 chars.
    - **Footer** (e.g. `Co-Authored-By:`) preceded by one blank line; lines max
      100 chars.
- Before merging into `main`, the branch must be green:
    - Tests: `forge test`, Hardhat tests, any others.
    - Lint/format: `npm run lint`, `prettier --check .`, `forge fmt --check`,
      `forge lint`.
    - Builds: `forge build`, `next build`, any other build step.
- Prefer a pull request so CI runs; confirm required checks pass before merging.
  Keep `main` deployable at all times.
- Never run `git` or `gh` commands autonomously. Only run them when the user
  explicitly grants permission for that specific command in that turn.
- When a change is ready, give the user every command needed to ship it,
  copy-paste ready and in order:

    ```bash
    # 1. Branch + commit
    git checkout -b feat/my-change
    git add -A && git commit -m "feat: my change"

    # 2. Push + open PR
    git push -u origin feat/my-change
    gh pr create --fill --base main

    # 3. Merge after checks pass
    gh pr merge --squash --delete-branch

    # 4. Sync local main
    git checkout main && git pull origin main
    ```

    Adjust branch name, commit message, and merge strategy to the actual change.

---

## 6. Token-Efficient Development

- Batch related work; complete a logical unit before reporting.
- Reuse existing architecture and patterns before adding new abstractions.
- Only explain the non-obvious: hidden constraints, subtle invariants, or
  decisions that will confuse a future reader without context.
- Reference existing instructions rather than restating them inline.
- Prefer targeted checks before full-project gates. If a build, dev server, or
  analyzer hangs, check for duplicate processes or stale generated locks before
  starting another copy.

---

## 6.1 Orchestrator Role

You are the orchestrator. Use the most token/usage friendly approach while not
compromising quality/security/best practices. Delegate the building to Sonnet 5
and Opus 4.8, and never spawn another Fable 5 agent. You plan with a cheaper
model, you delegate to cheaper models, and you do the QA at the end.

- Plan and QA yourself (the expensive model); hand implementation to Sonnet 5
  first, escalating to Opus 4.8 only when the task genuinely needs it.
- Never spawn a Fable 5 subagent.
- Batch delegated work into self-contained units so each agent starts with
  enough context, and reserve your own turns for planning and the final QA gate.

---

## 7. Quality Pipeline

Run before opening any PR on frontend code (from `src/`):

```bash
npx tsc --noEmit          # TypeScript
npm run lint:frontend     # ESLint + Prettier
npm run doctor            # React Doctor (score + verbose findings)
```

- **React Doctor** — run after any React/component changes. Score must not
  regress. Fix all new `error`-level findings; triage `warning`-level before
  merging.
- **React Scan** — active automatically in `NODE_ENV=development` via
  `ReactScanMonitor` in the root layout. Use when investigating performance
  regressions.
- **Semgrep** — runs in CI (`security.yml`) on every PR. For false positives,
  add `# nosemgrep: <rule-id>` with a justification comment.
- **Pre-commit hook** (`.husky/_/pre-commit`) — runs React Doctor `--staged`
  then the full lint suite. Fix all blocking issues before committing.

---

## 7.1 Quality Standards (Mandatory)

`docs/QUALITY-STANDARDS.md` is the canonical documentation, quality,
performance, accessibility, and deployment specification. Enforce it and
validate compliance before completing any task or approving any change.

- Every change must pass TypeScript (`npx tsc --noEmit`), ESLint, the test
  suites, and the production build (`next build`) before merge or deploy.
- React Doctor must stay at 100/100. No PR, merge, release, deployment, or
  production promotion may proceed below 100/100. Proactively identify and
  resolve anything blocking the score; treat warnings and regressions as
  high-priority.
- Maintain Lighthouse scores of 95+ in every category (Performance,
  Accessibility, Best Practices, SEO) before deployment; target 100 where
  realistically achievable and document any remaining blocker.
- Block deployment/merge when React Doctor, type-check, lint, tests, build,
  Lighthouse, accessibility, performance, or security checks fail.
- Do not introduce unused code, and preserve accessibility and security
  standards on every change.
- Investigate and resolve new warnings (build, lint, test, runtime, console,
  tooling) at their root cause instead of suppressing them; suppress only a
  verified false positive, with an inline justification.
- Add TSDoc to new code elements; document API routes and smart-contract
  surfaces; keep `controllers/` separation and `CREDITS.md` current.

See `docs/QUALITY-STANDARDS.md` for the full specification and the
post-modification verification checklist.

## 8. Documentation

Use `src/.claude/skills/update-context/SKILL.md` after repository changes so
docs, comments, visible project surfaces, and agent instructions stay current.
Use `src/.claude/skills/legal-compliance/SKILL.md` when product behavior, copy,
docs, wallet flows, arbitration, risk, privacy, or security disclosure changes
could require legal document review. Do not edit root legal draft markdown files
without explicit approval for those files.

Add a brief doc comment above any new code element (feature, function,
component, env var) when warranted: what it does, key params/returns, and an
example if relevant.

Keep docs in sync with every committed change. Before opening a PR, check
whether the change touches:

- **CI/CD** → update `README.md` badges and CI/contribution sections.
- **Features/APIs** → update `README.md`, `docs/`, usage examples.
- **Env vars** → update `.env.example` and any prose documenting config.
- **Dependencies/tooling** → update install/setup steps, `SECURITY.md`,
  `NOTES.md`.
- **Scripts/commands** → update the documented command reference so it is
  copy-paste correct.
- **Moved or renamed files/assets/routes** → remove or update stale references
  in docs, comments, config, website copy, tests, and agent instructions.

Final pass on every doc change: correct capitalization, grammar, punctuation,
clarity. Short unambiguous sentences, consistent terminology, backtick-wrap all
code/paths/identifiers.

## 8.1 Agent Logs

- Write agent run notes, audit output, Impeccable findings, dependency scan
  summaries, errors, and issue triage notes to `logs/`.
- Format `logs/*.md` with `src/.agents/skills/log-markdown/SKILL.md` and keep
  the result markdownlint-compliant.
- `logs/` is ignored by git. Keep committed docs free of transient run output.
- Keep temporary scratch files in project-local `tmp/` instead of system `/tmp`
  unless an external tool requires otherwise. Use `TRUSTLEDGER_TMP_DIR=./tmp`
  when a command accepts an explicit temporary root. Run `npm run tmp:check`
  after creating scratch files and `npm run tmp:prune` when retention limits are
  exceeded.
- Localhost browser checks are allowed when UI validation is requested. Start
  the frontend with `rtk npm run dev:frontend`; if sandboxed binding blocks the
  check, rerun the same command with escalation and cite the user's
  pre-authorization for localhost browser validation.
- Dependency and vulnerability reviews should use
  `src/.agents/agents/dependency-auditor.md`.

---

## 9. Directory or File Deletion

Do not delete heavy directories or files yourself (timeout risk). Give the user
the delete command plus any rebuild step:

- `rm -rf node_modules` then `npm install`
- `rm -rf dist` for build artifacts

---

## 10. Dependabot Alerts, Code Scanning, and PRs

- Pull each with the `gh` CLI (already authenticated).
- Verify each is safe to merge against the latest codebase; resolve conflicts
  without breaking existing features.
- If something needs manual intervention, explain the issue and the exact steps
  to resolve it.
- After merging, verify no new issues were introduced (run tests, check for
  errors/warnings). Report any post-merge issue with a clear explanation and
  resolution steps.

---

## 11. TODO.md

- When a TODO item is completed, mark it (`- [ ]` → `- [x]`) and move it to the
  `## Completed` section at the bottom of `TODO.md`.
- Add a brief note next to any item needing clarification.
- After checking off, verify the implementation introduced no new bugs (run
  tests, check for errors/warnings). Report any issue clearly.

---

## 12. gstack

- Use the `/browse` skill from gstack for **all** web browsing.
- **Never** use the `mcp__claude-in-chrome__*` tools.
- Setup is per-machine: clone `https://github.com/garrytan/gstack.git` into
  `~/.claude/skills/gstack` and run `./setup` (requires `bun`).
- Available skills: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`,
  `/plan-design-review`, `/design-consultation`, `/design-shotgun`,
  `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`,
  `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`,
  `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/setup-gbrain`,
  `/retro`, `/investigate`, `/document-release`, `/document-generate`, `/codex`,
  `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`,
  `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`.

---

## 13. Data, AI, and Proxy Surfaces

Keep these conventions when touching the layers added in the Phase 4 / off-chain
work. The chain stays authoritative; these are supporting infrastructure.

- **Off-chain database** — PostgreSQL via Prisma 7 (node-postgres adapter),
  hosted on Neon. Schema: `src/prisma/schema.prisma`; config:
  `src/prisma.config.ts`; server-only client + repositories: `src/lib/db/`
  (import from `@/lib/db`). The generated client (`src/lib/generated/prisma`) is
  gitignored and produced by `prisma generate` (runs on install/build). Manage
  with `npm run db:generate | db:migrate | db:migrate:dev | db:studio`. Never
  import `@/lib/db` from a Client Component. Rationale in NOTES.md.
- **AI infrastructure** — provider-agnostic core at `src/core/ai` (import from
  `@/core/ai`). Never hardcode a provider in call sites; add backends as
  adapters + config. Use `generateText` / `streamText`. Server-only.
- **Sensitive-route protection** — `src/proxy.ts` (Next.js 16's proxy, not a
  `middleware.ts`) IP-gates `/admin` and `/api/admin/*` via
  `SENSITIVE_ALLOWED_IPS` (falls back to `ADMIN_ALLOWED_IPS`); blocked IPs get a
  branded 404 that never leaks the route. Add new sensitive segments to
  `SENSITIVE_SEGMENTS` there.
- **Error pages** — every branded error surface (404/401/403/5xx and the route
  error boundary) shares one animated scene, `CowErrorScene`
  (`src/components/CowErrorScene.tsx`): a cow walks in, falls into a hole, then
  the status message renders. Transform-only (no layout shift), frozen under
  `prefers-reduced-motion`. Reuse it; do not add per-page scenes.
- **Wallet session restore** — all wallet types persist across reload/navigation
  via standalone `injected()` + `coinbaseWallet()` connectors in
  `src/lib/wagmi.ts` plus `WalletSessionRestore` in
  `src/components/Providers.tsx`. It runs two client-only paths: an injected
  `eth_accounts` probe, and a wagmi `reconnect()` retry fired when AppKit grows
  the connector set (so Coinbase/Base SDK and WalletConnect sessions restore
  after their lazily-loaded connectors register). Keep restore client-only (no
  SSR cookie reads) so static rendering is preserved.

---

**These guidelines are working if:** diffs have fewer unnecessary changes, there
are fewer rewrites due to overcomplication, and clarifying questions come before
implementation rather than after mistakes.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community
structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when
  graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for
  relationships and `graphify explain "<concept>"` for focused concepts. These
  return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw
  grep output.
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
