---
name: dependency-audit
description: Review npm dependency freshness, vulnerabilities, devDependencies, and overrides for TrustLedger.
version: "1.0.0"
---

# Dependency Audit

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

Read `src/.agents/agents/dependency-auditor.md` for scope and output format.

Run root and `src/` `npm outdated --long`, `npm audit --json`, and
`npm audit --omit=dev --json`. Summarize results in
`logs/dependency-audit-YYYY-MM-DD.md`; do not commit `logs/`.
