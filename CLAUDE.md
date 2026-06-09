# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with
project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial
tasks, use judgment.

---

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

---

## 5. Branching and Committing

- Never commit directly to `main`. Always branch first using a conventional name
  (`feat/...`, `fix/...`, `chore/...`).
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

Final pass on every doc change: correct capitalization, grammar, punctuation,
clarity. Short unambiguous sentences, consistent terminology, backtick-wrap all
code/paths/identifiers.

## 8.1 Agent Logs

- Write agent run notes, audit output, Impeccable findings, dependency scan
  summaries, errors, and issue triage notes to `logs/`.
- Format `logs/*.md` with `src/.agents/skills/log-markdown/SKILL.md` and keep
  the result markdownlint-compliant.
- `logs/` is ignored by git. Keep committed docs free of transient run output.
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

**These guidelines are working if:** diffs have fewer unnecessary changes, there
are fewer rewrites due to overcomplication, and clarifying questions come before
implementation rather than after mistakes.
