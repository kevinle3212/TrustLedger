---
name: react-doctor
description: Keep TrustLedger frontend React Doctor and maintainability checks green.
version: "1.0.0"
---

# React Doctor

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
