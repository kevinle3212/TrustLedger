# Project Instructions

## System Instructions

- No preambles or pleasantries. Get straight to the point (e.g. drop "Sure, I
  can help", "Let me check", "Hope you're having a great day").
- Output code blocks immediately.
- Explain logic in short bulleted fragments, not long paragraphs.
- Whenever editing any text — comments, docs, UI copy, commit messages, or any
  prose — apply a final pass for correct grammar, punctuation, syntax, and
  clarity if it has not already been done.

## Branching and Committing

- Never commit directly to `main`. Always branch first using a conventional name
  (`feat/...`, `fix/...`, `chore/...`).
- Before merging into `main`, the branch must be green:
    - Tests: `forge test`, Hardhat tests, any others.
    - Lint/format: `npm run lint`, `prettier --check .`, `forge fmt --check`,
      `forge lint`.
    - Builds: `forge build`, `next build`, any other build step.
- Prefer a pull request so CI runs; confirm required checks pass before merging.
  Keep `main` deployable at all times. If a change can't be made green without
  breaking things, don't force it — explain the problem and options.
- I run git/`gh` myself. When a change is ready, give me every command I need to
  ship it, copy-paste ready and in order, e.g.:

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

## Directory or File Deletion

- Don't delete heavy directories/files yourself (timeout risk). Give the user
  the delete command plus any rebuild step, e.g.:
    - `rm -rf node_modules` then `npm install` to restore.
    - `rm -rf dist` for build artifacts.

## Documentation

- Add a brief doc comment above any new code element (feature, function,
  component, env var) when warranted: what it does, key params/returns, and an
  example if relevant.
- Keep project docs in sync with every committed change; update them in the same
  branch so docs never drift. Before opening a PR, check whether the change
  touches:
    - CI/CD: workflows, jobs, or required checks → update `README.md` badges and
      CI/contribution sections.
    - Features/components/functions: behavior, public APIs, props, returns →
      update `README.md`, `docs/`, usage examples.
    - Env vars: added/renamed/removed/changed → update `.env.example` (and other
      `*.example` templates) and any prose documenting config.
    - Dependencies/tooling: deps, scripts, version requirements → update
      install/setup steps, `SECURITY.md`, `NOTES.md`.
    - Scripts/commands: new or changed npm/Foundry/dev commands → update the
      documented command reference so it's copy-paste correct.
- Final pass on every doc change: correct capitalization, grammar, punctuation,
  syntax, clarity. Short unambiguous sentences, consistent terminology, and
  backtick-wrap code/paths/identifiers.

## Dependabot Alerts, Code Scanning, Vulnerabilities, and PRs

- Pull each with the `gh` CLI (already authenticated).
- Ensure each is safe to merge against the latest codebase; resolve any
  conflicts without breaking existing features.
- If something needs manual intervention or can't auto-merge, explain the issue
  and the exact steps to resolve it.
- After merging, verify changes applied and no new issues/vulnerabilities were
  introduced (run tests, check for errors/warnings). Report any post-merge issue
  with a clear explanation and resolution steps.

## Token-Efficient Development

- Batch related work; complete a logical unit before reporting.
- Reuse existing architecture and patterns — check what's already there before
  adding new abstractions.
- Only explain the non-obvious: hidden constraints, subtle invariants, or
  decisions that will confuse a future reader without context.
- Reference existing instructions rather than restating them inline.

## Checking off TODO.md

- When a TODO item is completed, check it off (`- [ ]` → `- [x]`) promptly so
  the file stays accurate.
- Add a brief note next to any item needing clarification.
- After checking off, verify the code change is implemented and introduced no
  new bugs (run tests, check for errors/warnings). Report any issue with a clear
  explanation and resolution steps.
