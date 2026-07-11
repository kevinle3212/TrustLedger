---
trigger: always_on
description: Guidance precedence for Cascade in TrustLedger
---

1. User instructions in the active task.
2. Root `AGENTS.md` — authoritative engineering conventions.
3. `WINDSURF.md` and this `.windsurf/rules/` directory.
4. `CLAUDE.md` / `GEMINI.md` — the same rules restated for other assistants;
   useful precedent, not binding on Cascade.
5. General repository documentation (`docs/`, `README.md`).

All edits must comply with `docs/QUALITY-STANDARDS.md`: React Doctor stays at
100/100, and merges/deployments are blocked when React Doctor, type-check, lint,
tests, build, accessibility, performance, or security checks fail.

See `WINDSURF.md` for the full explanation of this precedence order.
