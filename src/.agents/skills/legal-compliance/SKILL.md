---
name: legal-compliance
description:
    Use when TrustLedger product, frontend, API, wallet, arbitration, risk,
    privacy, security, or user-policy changes could require legal document
    review or updates.
---

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
