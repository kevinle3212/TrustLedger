---
name: legal-compliance
description: Use when TrustLedger product, frontend, API, wallet, arbitration, risk, privacy, security, or user-policy changes could require legal document review or updates.
---

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or the
desired outcome is unclear, interview the user with focused questions until intent
is unambiguous. State assumptions and confirm them before proceeding.

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

## Privacy & Cookie Feature Sync (mandatory)

Whenever a change adds, removes, or alters functionality that collects, stores,
processes, exports, deletes, or shares personal data — or that sets, reads, or
gates on cookies, `localStorage`, analytics, or consent — you MUST bring the
policy documents in line **in the same branch**. Never ship privacy- or
cookie-affecting behavior while the policies still describe the old behavior.

Live, rendered source of truth (safe to edit; these drive the `/legal` route via
`helpers/legal-docs.ts` → `LEGAL_DOCUMENTS`):

- `src/content/legal/PRIVACY_POLICY.md` — update "Information We Collect", "How We
  Use Information", "Cookies and Tracking Technologies", "Data Retention", and
  "Your Rights and Choices" to match what the code now actually does. Bump the
  `Last Updated` date and the `Version`.
- `src/content/legal/COOKIE_POLICY.md` — update the cookie inventory (name,
  purpose, duration, category) and any consent-behavior description whenever a
  cookie/`localStorage` key or consent flow changes. Keep it consistent with
  `lib/cookie-consent.ts` and the consent UI (`CookieConsent`,
  `CookiePreferencesButton`).

Draft mirrors — do NOT edit without explicit per-file approval, but flag them for
owner review when they drift: root `PRIVACY_POLICY.md`, root `COOKIE_POLICY.md`,
`docs/PRIVACY_POLICY.md`.

Rules:

- Claim only functionality that exists. If you add a data export or deletion
  flow, describe it; if you remove one, delete the claim. Do not describe rights
  the product cannot honor.
- Cross-check the cookie inventory against every cookie/`localStorage` key the
  code sets (`trustledger:*`, `wagmi.*`, `@appkit/*`, analytics keys, consent
  keys) so the policy matches reality.
- Record any owner-review follow-up in the task summary or an ignored `logs/*.md`
  note.
