---
name: eslint-strict
description:
    Use after JavaScript, TypeScript, config, script, or tool changes. Covers
    root ESLint and frontend ESLint.
version: "1.0.0"
---

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
