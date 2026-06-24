---
name: dependency-audit
description: Review npm dependency freshness, vulnerabilities, devDependencies, and overrides for TrustLedger.
version: "1.0.0"
---

# Dependency Audit

Read `src/.agents/agents/dependency-auditor.md` for scope and output format.

Run root and `src/` `npm outdated --long`, `npm audit --json`, and
`npm audit --omit=dev --json`. Summarize results in
`logs/dependency-audit-YYYY-MM-DD.md`; do not commit `logs/`.
