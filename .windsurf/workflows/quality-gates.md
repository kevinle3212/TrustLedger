---
description: Run TrustLedger's blocking quality gates (tsc, lint, React Doctor)
---

1. Change into `src/`.
2. Run `npx tsc --noEmit` and fix any type errors before continuing.
3. Run `npm run lint:frontend` and fix any ESLint/Prettier findings.
4. Run `npm run doctor` — React Doctor must report 100/100. Fix new `error`
   findings; triage `warning` findings before merging.
5. Report which of the three gates failed, if any, with the actual command
   output — don't summarize a failure as a pass.

See `CLAUDE.md` → Quality Gates and `docs/QUALITY-STANDARDS.md` for what each
gate covers and why it's blocking.
