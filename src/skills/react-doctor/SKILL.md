---
name: react-doctor
description:
    Use when finishing a feature, fixing a bug, before committing React code, or
    when the user types `/doctor`, asks to scan, triage, or clean up React
    diagnostics. Covers lint, accessibility, bundle size, architecture. Includes
    a regression check and a full local-triage workflow that fetches the
    canonical playbook.
version: "1.1.0"
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

# React Doctor

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../../CREDITS.md).

Scans React codebases for security, performance, correctness, and architecture
issues. Outputs a 0-100 health score.

## After making React code changes

Run `npx react-doctor@latest --verbose --diff` and check the score did not
regress.

If the score dropped, fix the regressions before committing.

## For general cleanup or code improvement

Run `npx react-doctor@latest --verbose` (without `--diff`) to scan the full
codebase. Fix issues by severity - errors first, then warnings.

## /doctor - full local triage workflow

When the user types `/doctor`, says "run react doctor", or asks for a full
triage / cleanup pass (not just a regression check), fetch the canonical
local-triage playbook and follow every step in it:

```bash
curl --fail --silent --show-error \
  --header 'Cache-Control: no-cache' \
  https://www.react.doctor/prompts/react-doctor-agent.md
```

The playbook is the single source of truth - a scan → filter → triage → fix →
validate loop that edits the working tree directly (never commits, never opens
PRs). Updating the prompt at its source updates every agent on its next fetch -
no skill reinstall needed.

Pair it with the matching per-rule prompts at
`https://www.react.doctor/prompts/rules/<plugin>/<rule>.md` (fetched on demand
inside the playbook) so each fix uses the canonical, reviewer-tested recipe.

## Configuring or explaining rules

When the user wants to understand a rule, disagrees with one, or wants to
disable / tune which rules run (not fix code), use the `doctor-explain` skill
(alias `/doctor-config`). Start with
`npx react-doctor@latest rules explain <rule>`, then apply the narrowest control
via `npx react-doctor@latest rules disable|set|category|ignore-tag …`, which
edits your `doctor.config.*` (or `package.json#reactDoctor`).

## Command

```bash
npx react-doctor@latest --verbose --diff
```

| Flag        | Purpose                                       |
| ----------- | --------------------------------------------- |
| `.`         | Scan current directory                        |
| `--verbose` | Show affected files and line numbers per rule |
| `--diff`    | Only scan changed files vs base branch        |
| `--score`   | Output only the numeric score                 |
