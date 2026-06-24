---
name: stylelint
description:
    Use when changing `src/app/**/*.css` or `src/app/**/*.scss`, Tailwind helper
    CSS, dark mode, animation utilities, or responsive SCSS.
---

# Stylelint

Run from the repository root:

```bash
npm run lint:styles
```

Strict expectations:

- Follow `.stylelintrc.json`.
- Keep Tailwind-specific at-rules limited to the configured allowlist.
- Avoid `transition: all`.
- Keep nesting depth at or below 3.
- Use kebab-case custom properties.
- Do not introduce ID selectors.
