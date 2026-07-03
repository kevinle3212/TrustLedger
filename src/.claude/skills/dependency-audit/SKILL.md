---
name: dependency-audit
description: Review npm dependency freshness, vulnerabilities, devDependencies, and overrides for TrustLedger.
---

## Tool Fallback <!-- tool-fallback -->

- If a preferred tool, command, or skill is unavailable, failing, or a worse fit
  for the task, use the best available alternative rather than stopping or
  forcing it. Note which tool you used and why. Never fall back to a prohibited
  tool (for example `mcp__claude-in-chrome__*` is banned — use `/browse`).

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or the
desired outcome is unclear, interview the user with focused questions until intent
is unambiguous. State assumptions and confirm them before proceeding.

# Dependency Audit

Read `src/.agents/agents/dependency-auditor.md` for scope and output format.

Run root and `src/` `npm outdated --long`, `npm audit --json`, and
`npm audit --omit=dev --json`. Summarize results in
`logs/dependency-audit-YYYY-MM-DD.md`; do not commit `logs/`.
