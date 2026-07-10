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

Use this skill when a change affects TrustLedger legal, compliance, policy,
risk, privacy, cookie, content, marketplace, security disclosure, sanctions,
payments, arbitration, wallet, or user-obligation language.

This skill is mandatory whenever a product, API, contract, wallet, payment,
arbitration, data-retention, admin, security, marketing, or documentation change
could alter what users are told, what users consent to, how funds are handled, or
what risks TrustLedger discloses.

## Review Stance

Act like an experienced SaaS technology lawyer reviewing an Ethereum escrow
product, while remembering that repository changes are engineering assistance
and not legal advice. Escalate anything jurisdiction-specific, tax-specific,
employment-specific, securities-related, consumer-protection-related, sanctions
related, or privacy-rights-specific for qualified counsel review.

## Required Checks

- Identify which root legal draft files may need owner review.
- Do not edit root legal files unless the active user request explicitly allows
  those exact files to be edited.
- Check whether `docs/LEGAL.md`, `docs/SECURITY.md`, `README.md`, `src/README.md`,
  and the website legal center need reference updates.
- Check for product changes that affect user duties, fees, funds custody, wallet
  connections, arbitration, juror incentives, risk disclosures, support paths, or
  data retention.
- Check whether root legal files under `legal/` or root legal markdown files
  need owner review before release. If legal docs are intentionally not edited,
  record the reason in the task summary or an ignored markdown note under
  `logs/`.
- When adding or changing user-visible copy about payments, wallets, dispute
  resolution, admin access, privacy, cookies, security, generated content,
  sanctions, availability, or support, explicitly state whether legal docs need
  follow-up.
- Check for compliance-sensitive claims such as "guaranteed", "insured",
  "risk-free", "legal advice", "investment advice", and "available everywhere".
- For frontend copy, avoid legal absolutes and keep status labels clear when a
  legal document is still pending review.
- Keep recommendations concrete and separated from edits.

## Privacy & Cookie Feature Sync (mandatory)

Any change that adds, removes, or alters how personal data is collected, stored,
processed, exported, deleted, or shared — or that sets/reads/gates on cookies,
`localStorage`, analytics, or consent — MUST update the policy content in the
same branch so the docs never describe behavior the code no longer has.

Live, rendered source of truth (safe to edit; these drive the `/legal` route via
`helpers/legal-docs.ts` → `LEGAL_DOCUMENTS`):

- `src/content/legal/PRIVACY_POLICY.md` — update "Information We Collect", "How
  We Use Information", "Cookies and Tracking Technologies", "Data Retention",
  and "Your Rights and Choices" to match what the code now actually does. Bump
  the `Last Updated` date and the `Version`.
- `src/content/legal/COOKIE_POLICY.md` — update the cookie inventory (name,
  purpose, duration, category) and any consent-behavior description whenever a
  cookie/`localStorage` key or consent flow changes. Keep it consistent with
  `lib/cookie-consent.ts` and the consent UI (`CookieConsent`,
  `CookiePreferencesButton`).

Rules:

- Claim only functionality that exists. If you add a data export or deletion
  flow, describe it; if you remove one, delete the claim. Do not describe rights
  the product cannot honor.
- Cross-check the cookie inventory against every cookie/`localStorage` key the
  code sets (`trustledger:*`, `wagmi.*`, `@appkit/*`, analytics keys, consent
  keys) so the policy matches reality.
- Flag the draft mirrors (root `PRIVACY_POLICY.md`, root `COOKIE_POLICY.md`,
  `docs/PRIVACY_POLICY.md`) for owner review when they drift, but do not edit
  them without explicit per-file approval.
- Record any owner-review follow-up in the task summary or an ignored
  `logs/*.md` note.

## Documentation Output

When legal edits are allowed, update committed docs and website references in
the same branch. When legal edits are not allowed, add only a summary of
suggested review areas to the task response or an ignored markdown log under
`logs/`.
