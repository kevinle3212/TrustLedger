---
name: react-doctor
description: Keep TrustLedger frontend React Doctor and maintainability checks green.
version: "1.0.0"
---

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or the
desired outcome is unclear, interview the user with focused questions until intent
is unambiguous. State assumptions and confirm them before proceeding.

# React Doctor

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today.
> See [`CREDITS.md`](../../../CREDITS.md).

Use this skill for React Doctor warnings, frontend maintainability, and UI
regression checks.

## Commands

Run from the repository root:

```sh
npm run doctor
npm run lint:frontend
npm run test:e2e
```

For the full frontend gate:

```sh
cd src && npm run quality:all
```

React Doctor must remain `100 / 100`. If a warning requires a code change, keep
the change local to the affected component or hook and rerun the full frontend
gate.
