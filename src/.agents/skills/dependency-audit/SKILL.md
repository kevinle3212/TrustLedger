---
name: dependency-audit
description:
    Review npm dependency freshness, vulnerabilities, devDependencies, and
    overrides for TrustLedger.
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
