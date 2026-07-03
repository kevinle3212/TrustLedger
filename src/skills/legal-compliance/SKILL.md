# Legal Compliance Skill

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../../CREDITS.md).

Use this shared frontend skill when a task touches legal, compliance, risk,
privacy, security disclosure, arbitration, wallet, payment, or user-policy
language.

This skill is mandatory for any user-visible or backend behavior change that
could affect consent, custody expectations, wallet access, dispute resolution,
privacy, cookies, sanctions, security disclosures, availability claims, support
paths, or user obligations.

## Checklist

- Read `.sixth/skills/legal-compliance/SKILL.md` for the canonical legal review
  checklist.
- Explicitly decide whether legal docs need owner review before release. If they
  do, document the affected files or website surfaces in the task summary or an
  ignored markdown note under `logs/`.
- Do not edit root legal draft markdown files unless the user explicitly allows
  those edits.
- Keep website copy, `docs/LEGAL.md`, `docs/SECURITY.md`, `README.md`, and
  `src/README.md` aligned with approved legal changes.
- Flag jurisdiction-specific coverage, privacy rights, taxes, sanctions,
  securities, employment classification, and consumer-protection issues for
  qualified counsel review.
- Privacy & cookie sync (mandatory): any change to how personal data is
  collected, stored, exported, deleted, or shared, or to cookies/`localStorage`/
  analytics/consent, must update `src/content/legal/PRIVACY_POLICY.md` (bump its
  `Last Updated`/`Version`) and `src/content/legal/COOKIE_POLICY.md` (cookie
  inventory + consent behavior) in the same branch. Keep the inventory
  consistent with `lib/cookie-consent.ts`; claim only functionality that exists.

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or
the desired outcome is unclear, interview the user with focused questions until
intent is unambiguous. State assumptions and confirm them before proceeding.
