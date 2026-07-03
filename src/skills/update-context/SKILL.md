---
name: update-context
description:
    Keep docs, comments, agent instructions, and visible project surfaces
    synchronized after code, config, workflow, deployment, or website changes.
version: "1.0.0"
---

## Tool Fallback <!-- tool-fallback -->

- If a preferred tool, command, or skill is unavailable, failing, or a worse fit
  for the task, use the best available alternative rather than stopping or
  forcing it. Note which tool you used and why. Never fall back to a prohibited
  tool (for example `mcp__claude-in-chrome__*` is banned — use `/browse`).

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or
the desired outcome is unclear, interview the user with focused questions until
intent is unambiguous. State assumptions and confirm them before proceeding.

# Update Context

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../../CREDITS.md).

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
