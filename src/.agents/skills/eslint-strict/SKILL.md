---
name: eslint-strict
description:
    Use after JavaScript, TypeScript, config, script, or tool changes. Covers
    root ESLint and frontend ESLint.
---

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
