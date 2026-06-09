---
name: knip
description:
    Use when adding dependencies, scripts, exports, files, or frontend/backend
    modules. Detects unused files, exports, dependencies, and binaries.
version: "1.0.0"
---

# Knip

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

Run from the repository root:

```bash
npm run lint:knip
```

Strict expectations:

- Follow `knip.json`.
- Prefer removing unused code over ignoring it.
- Add ignore entries only for real CLI-only or framework-discovered files.
- Keep root and `src/` workspace entry points explicit.
