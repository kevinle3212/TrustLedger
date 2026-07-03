---
name: eslint-strict
description:
    Use after JavaScript, TypeScript, config, script, or tool changes. Covers
    root ESLint and frontend ESLint.
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

# ESLint Strict

Run from the repository root:

```bash
npm run lint:ts
npm run lint:config
cd src && npm run lint:frontend:ts
```

Strict expectations:

- Keep `parserOptions.project` coverage aligned with linted files.
- Tooling `.mjs` files belong in the non-type-aware root override.
- Do not silence unsafe TypeScript rules in product code.
