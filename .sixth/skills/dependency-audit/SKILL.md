---
name: dependency-audit
description: Local TrustLedger dependency and vulnerability audit workflow.
version: "1.0.0"
---

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or the
desired outcome is unclear, interview the user with focused questions until intent
is unambiguous. State assumptions and confirm them before proceeding.

# Dependency Audit

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today.
> See [`CREDITS.md`](../../../CREDITS.md).

Use this skill for npm package freshness, vulnerabilities, devDependencies, and
overrides. Follow `src/.agents/agents/dependency-auditor.md` and write the
summary to `logs/dependency-audit-YYYY-MM-DD.md`.
