---
name: dependency-audit
description:
    Review npm dependency freshness, vulnerabilities, devDependencies, and
    overrides for TrustLedger.
version: "1.0.0"
---

# Dependency Audit

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

Use this skill for package freshness and vulnerability review.

## Commands

Run from the repository root:

```bash
npm outdated --long
npm audit --json
npm audit --omit=dev --json
```

Run from `src/`:

```bash
npm outdated --long
npm audit --json
npm audit --omit=dev --json
```

## Review Rules

- Separate runtime dependencies from devDependencies.
- Check `overrides` in both package files for stale or duplicated pins.
- Treat lockfile-only vulnerabilities as transitive findings and recommend the
  smallest safe direct update or override.
- Do not run `npm audit fix --force` without explicit approval.
- If the user explicitly approves high-risk npm registry disclosure, request
  escalated execution for `npm audit` and include that approval in the
  justification.
- Write findings to `logs/dependency-audit-YYYY-MM-DD.md`.
