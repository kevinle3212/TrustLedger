---
name: dependency-audit
description: Review npm dependency freshness, vulnerabilities, devDependencies, and overrides for TrustLedger.
---

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or the
desired outcome is unclear, interview the user with focused questions until intent
is unambiguous. State assumptions and confirm them before proceeding.

# Dependency Audit

Read `src/.agents/agents/dependency-auditor.md` for scope and output format.

Run root and `src/` `npm outdated --long`, `npm audit --json`, and
`npm audit --omit=dev --json`. Summarize results in
`logs/dependency-audit-YYYY-MM-DD.md`; do not commit `logs/`.
