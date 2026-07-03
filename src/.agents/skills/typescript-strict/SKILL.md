---
name: typescript-strict
description:
    Use after TypeScript, API route, service, script, test, or shared type
    changes. Runs the strict root and frontend TypeScript checks.
---

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or the
desired outcome is unclear, interview the user with focused questions until intent
is unambiguous. State assumptions and confirm them before proceeding.

# TypeScript Strict

Run from the repository root:

```bash
npm run typecheck
```

Strict expectations:

- No implicit `any`.
- No unchecked indexed access assumptions.
- No unused locals or parameters.
- Keep frontend and Hardhat TypeScript configs passing.
