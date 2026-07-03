---
name: legal-compliance
description:
    Use when TrustLedger product, frontend, API, wallet, arbitration, risk,
    privacy, security, or user-policy changes could require legal document
    review or updates.
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

# Legal Compliance Skill

Use this Codex-facing frontend skill when React pages, API routes, docs, wallet
flows, dispute UX, risk copy, or compliance-sensitive product behavior could
change legal obligations.

This skill is mandatory when a code or copy change may affect user consent,
funds custody expectations, wallet access, dispute resolution, privacy, cookies,
sanctions, security disclosures, support paths, admin access, or user
obligations.

## Workflow

- Read `.sixth/skills/legal-compliance/SKILL.md` for the shared checklist.
- Decide whether legal docs need owner review before release, and document the
  affected files or surfaces in the task summary or an ignored `logs/*.md` note
  when follow-up is needed.
- Treat root legal draft markdown files as owner-controlled unless the active
  user request explicitly authorizes edits.
- Mirror approved legal or compliance changes into `docs/LEGAL.md`,
  `docs/SECURITY.md`, `README.md`, `src/README.md`, and the `/legal` route when
  those surfaces are affected.
- For frontend copy, avoid legal absolutes and keep status labels clear when a
  legal document is still pending review.
- Record transient review notes in ignored `logs/` markdown when a long legal
  issue list is useful.
- Privacy & cookie sync (mandatory): any change to how personal data is
  collected, stored, exported, deleted, or shared, or to cookies/`localStorage`/
  analytics/consent, must update `src/content/legal/PRIVACY_POLICY.md` (bump its
  `Last Updated`/`Version`) and `src/content/legal/COOKIE_POLICY.md` (cookie
  inventory + consent behavior) in the same branch. Keep the inventory
  consistent with `lib/cookie-consent.ts`; claim only functionality that exists.
