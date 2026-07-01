# Legal Compliance Skill

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today.
> See [`CREDITS.md`](../../../CREDITS.md).

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
- Keep recommendations concrete and separated from edits.

## Privacy & Cookie Feature Sync (mandatory)

Any change that adds, removes, or alters how personal data is collected, stored,
processed, exported, deleted, or shared — or that sets/reads/gates on cookies,
`localStorage`, analytics, or consent — MUST update the policy content in the
same branch so the docs never describe behavior the code no longer has.

- Update the live, rendered sources: `src/content/legal/PRIVACY_POLICY.md`
  (Information We Collect, Cookies and Tracking, Data Retention, Your Rights) and
  `src/content/legal/COOKIE_POLICY.md` (cookie inventory + consent behavior).
  Bump the `Last Updated` date and `Version` on the privacy policy.
- Keep the cookie inventory consistent with `lib/cookie-consent.ts` and the
  consent UI, and cross-check it against every cookie/`localStorage` key the code
  sets (`trustledger:*`, `wagmi.*`, `@appkit/*`, analytics, consent keys).
- Claim only functionality that exists; never describe rights the product cannot
  honor. Flag the draft mirrors (root `PRIVACY_POLICY.md`, root
  `COOKIE_POLICY.md`, `docs/PRIVACY_POLICY.md`) for owner review when they drift,
  but do not edit them without explicit per-file approval.

## Documentation Output

When legal edits are allowed, update committed docs and website references in
the same branch. When legal edits are not allowed, add only a summary of suggested
review areas to the task response or an ignored markdown log under `logs/`.
