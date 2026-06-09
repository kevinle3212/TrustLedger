---
name: playwright-a11y
description:
    Use after frontend UI changes, navigation changes, form changes, or
    accessibility-sensitive work. Runs Playwright routes with axe-core WCAG A/AA
    checks.
version: "1.0.0"
---

# Playwright Accessibility

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

Run from `src/`:

```bash
npm run test:e2e -- accessibility.spec.ts
```

Strict expectations:

- No WCAG A/AA axe violations.
- Do not disable axe rules to make the suite pass.
- Fix semantic markup, labels, focus order, contrast, landmarks, or copy
  instead.
- Keep wallet-dependent flows out of this public-route sweep unless mocked.
