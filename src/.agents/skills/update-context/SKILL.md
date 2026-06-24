---
name: update-context
description:
    Keep docs, comments, agent instructions, and visible project surfaces
    synchronized after code, config, workflow, deployment, or website changes.
---

# Update Context

Use this skill after a prompt causes repository changes, especially when the
change affects behavior, commands, dependencies, deployment, security,
configuration, tests, user-facing copy, or agent guidance.

## Workflow

1. Identify the changed surface: code path, config, workflow, docs, website,
   tests, environment variables, deployment files, or agent instructions.
2. Update the nearest authoritative documentation instead of duplicating long
   guidance. Prefer `docs/`, `README.md`, `src/README.md`, `.cursor/rules/`,
   `.copilot/instructions.md`, `.codex/AGENTS.md`, `CLAUDE.md`, or
   `.sixth/README.md` based on scope.
3. Remove or update stale references to moved or renamed code, assets, routes,
   commands, environment variables, legal docs, generated files, or workflows.
4. Update comments only when the surrounding code would otherwise be misleading
   or hard to operate safely. Remove stale comments instead of adding new ones.
5. Add or adjust tests and validation commands when behavior or tooling changes.
6. For user-facing copy, follow root `AGENTS.md`: use Title Case for
   non-sentence labels, buttons, badges, menu items, headings, and status chips;
   use sentence case plus grammar, punctuation, syntax, and clarity checks for
   full sentences; preserve acronyms such as `HTML`, `FAQ`, `URL`, `URI`, `ETH`,
   `USDC`, and `IPFS`.
7. If a complex agent mistake took substantial debugging to fix, add one concise
   prevention note to the nearest relevant skill or agent guidance file. Do not
   record simple typos or routine lint fixes.
8. Keep generated run notes under `logs/` as markdownlint-compliant Markdown.
   Run `npm run logs:check` after writing log files.
9. Keep temporary scratch output under project-local `tmp/` and document
   `TRUSTLEDGER_TMP_DIR` when scripts or tools need an explicit temporary root.
   Run `npm run tmp:check` after creating scratch files and `npm run tmp:prune`
   when retention limits are exceeded.

## Validation

Run the narrowest checks that prove the context stayed current:

```sh
npm run docs:build
npm run docs:links
```

For frontend, deployment, dependency, or contract changes, also run the matching
quality gate documented in the relevant skill or `AGENTS.md`.
