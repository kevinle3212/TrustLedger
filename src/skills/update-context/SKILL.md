---
name: update-context
description:
    Keep docs, comments, agent instructions, and visible project surfaces
    synchronized after code, config, workflow, deployment, or website changes.
version: "1.0.0"
---

# Update Context

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

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
3. Update comments only when the surrounding code would otherwise be misleading
   or hard to operate safely. Remove stale comments instead of adding new ones.
4. Add or adjust tests and validation commands when behavior or tooling changes.
5. When visible copy changes, enforce root `AGENTS.md` UI copy rules: Title Case
   for labels, buttons, badges, menus, and headings; sentence case for complete
   explanatory sentences; preserve acronyms such as `HTML`, `FAQ`, `URL`, `ETH`,
   `USDC`, and `IPFS`.
6. If a complex agent mistake took substantial debugging to fix, add one concise
   prevention note to the nearest relevant skill or agent guidance file. Do not
   record simple typos or routine lint fixes.
7. Keep generated run notes under `logs/` as markdownlint-compliant Markdown.
   Run `npm run logs:check` after writing log files.

## Validation

Run the narrowest checks that prove the context stayed current:

```sh
npm run docs:build
npm run docs:links
```

For frontend, deployment, dependency, or contract changes, also run the matching
quality gate documented in the relevant skill or `AGENTS.md`.
