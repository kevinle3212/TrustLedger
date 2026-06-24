---
name: typescript-strict
description:
    Use after TypeScript, API route, service, script, test, or shared type
    changes. Runs the strict root and frontend TypeScript checks.
---

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
