---
name: TrustLedger Quality Testing And Docs
alwaysApply: true
---

# Quality, Testing, And Documentation

- `docs/QUALITY-STANDARDS.md` is canonical. React Doctor must remain 100/100.
  Lighthouse must remain 95+ in Performance, Accessibility, Best Practices, and
  SEO before deployment, targeting 100 where realistic.
- Block merge, release, deployment, or production promotion when React Doctor,
  type-check, lint, tests, build, Lighthouse, accessibility, performance, or
  security checks fail.
- Investigate and resolve new warnings at the root cause. Suppress only verified
  false positives with inline justification, such as `# nosemgrep: <rule-id>`.
- Remove unused code, dead imports, stale references, obsolete files, duplicate
  implementations, unreachable branches, and dependencies made unused by the
  change.
- Add TSDoc to new functions, classes, interfaces, types, hooks, services,
  controllers, public APIs, API routes, and smart-contract surfaces.
- Use focused unit tests for utilities and services, React Testing Library for
  components, Playwright for user flows, Hardhat for TypeScript contract
  workflows, and Foundry for Solidity unit, fuzz, invariant, and fork coverage.
- New page-level Playwright tests should include accessibility assertions where
  practical. No permanent `.skip`, `xit`, or similar disabled tests without a
  linked tracking issue.
- Keep all interactive UI keyboard-accessible. Verify semantic landmarks,
  visible focus, programmatic labels, error relationships, WCAG AA contrast,
  non-color state cues, reduced motion, and no horizontal overflow.
- Keep docs accurate, concise, command-copyable, and synchronized with code in
  the same change. Update README, `src/README.md`, `docs/`, env examples,
  security docs, testing docs, CI docs, and agent guidance as ownership
  requires.
- Any new environment variable must be classified as secret, public browser
  config, or local-only tooling, then added to `.env.example`,
  `src/.env.local.example`, and `docs/ENVIRONMENT.md` as applicable.
- Every `docs/*.md` file must be wired into `mkdocs.yml` navigation. Use docs
  link/nav checks after docs changes.
- Root `CREDITS.md` and `AGENT-CONTEXT.md` have docs-site copies. Keep mirrored
  copies synchronized when those files change.
- Commit messages must satisfy `commitlint.config.js`: allowed type, optional
  allowed kebab-case scope, header at most 72 characters, no trailing period,
  and body/footer lines at most 100 characters.
- Before PR or ship readiness, run the nearest relevant commands first, then the
  full gates required by the touched area. Report any commands not run and why.
