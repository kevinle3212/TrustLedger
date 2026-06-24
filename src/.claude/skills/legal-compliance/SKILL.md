# Legal Compliance Skill

Use this Claude-facing skill when TrustLedger product, frontend, API, wallet,
arbitration, risk, privacy, security, or user-policy changes could require legal
document updates.

This skill is mandatory whenever a change may affect user consent, funds custody
expectations, wallet access, dispute resolution, privacy, cookies, sanctions,
security disclosures, support paths, admin access, or user obligations.

## Workflow

- Read `.sixth/skills/legal-compliance/SKILL.md` for the shared checklist.
- Decide whether legal docs need owner review before release, and document the
  affected files or surfaces in the task summary or an ignored `logs/*.md` note
  when follow-up is needed.
- Do not edit root legal draft markdown files without explicit user approval for
  those files.
- Keep legal suggestions separate from committed edits when the drafts are under
  owner review.
- Update `docs/LEGAL.md`, `docs/SECURITY.md`, `README.md`, `src/README.md`, and
  the `/legal` route when approved legal changes affect public documentation.
- Use short, precise legal-review notes and avoid presenting engineering output
  as legal advice.
