# Legal Compliance Skill

Use this skill when a change affects TrustLedger legal, compliance, policy,
risk, privacy, cookie, content, marketplace, security disclosure, sanctions,
payments, arbitration, wallet, or user-obligation language.

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
- Check for compliance-sensitive claims such as "guaranteed", "insured",
  "risk-free", "legal advice", "investment advice", and "available everywhere".
- Keep recommendations concrete and separated from edits.

## Documentation Output

When legal edits are allowed, update committed docs and website references in
the same branch. When legal edits are not allowed, add only a summary of suggested
review areas to the task response or an ignored markdown log under `logs/`.
