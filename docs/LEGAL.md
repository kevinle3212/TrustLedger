# Legal And Compliance

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Public Surfaces](#public-surfaces)
- [Draft Legal Document Inventory](#draft-legal-document-inventory)
- [Agent Review Rule](#agent-review-rule)
- [Translation Workflow](#translation-workflow)
- [Jurisdiction Note](#jurisdiction-note)
- [Authors and Contributors](#authors-and-contributors)
- [Legal](#legal)

<!-- docs-toc:end -->

> **Kevin K. Le** ([LinkedIn](https://linkedin.com/in/lekevin1)) — Founder,
> Founding Engineer, and Current Lead Engineer; Software Engineer at the Oregon
> Blockchain Group, University of Oregon.
>
> **Kellen Snider** — Founding Engineer; Software Engineer at the Oregon
> Blockchain Group, University of Oregon. His vision, ideas, and dedication
> during TrustLedger's Ethereum development were invaluable to the codebase we
> build on today.
>
> See [`CREDITS.md`](CREDITS.md).

TrustLedger legal documents are owner-controlled drafts until they are approved
for publication. This page tracks the committed legal and compliance surfaces so
engineering, documentation, and website changes stay synchronized.

## Public Surfaces

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Surface            | Purpose                                                               |
| ------------------ | --------------------------------------------------------------------- |
| `SECURITY.md`      | Responsible disclosure, supported security scope, and reporting path. |
| `docs/SECURITY.md` | Developer-facing security model, CI checks, and operational notes.    |
| `/[locale]/legal`  | Website legal center and publication index.                           |

## Draft Legal Document Inventory

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The following root markdown files may require review when product behavior,
payments, wallet flows, arbitration, privacy, content handling, or compliance
posture changes:

| Draft                      | Review Focus                                                               |
| -------------------------- | -------------------------------------------------------------------------- |
| `TERMS_AND_CONDITIONS.md`  | User duties, wallet actions, escrow scope, and dispute handling.           |
| `PRIVACY_POLICY.md`        | Data categories, retention, logs, analytics, and user rights.              |
| `COOKIE_POLICY.md`         | Browser storage, cookies, consent, and analytics.                          |
| `ACCEPTABLE_USE_POLICY.md` | Prohibited conduct, abuse, sanctions-sensitive activity, and enforcement.  |
| `CONTENT_POLICY.md`        | Contract links, deliverables, evidence, and platform-visible content.      |
| `DMCA_POLICY.md`           | Takedown notices, counter-notices, and repeat-infringer handling.          |
| `TRADEMARK_POLICY.md`      | Brand use, impersonation, confusing marks, and reporting.                  |
| `RISK_DISCLOSURE.md`       | Smart contract, wallet, blockchain, market, arbitration, and uptime risks. |
| `DISCLAIMER.md`            | Advice disclaimers, warranty limits, and outcome disclaimers.              |
| `COMMUNITY_GUIDELINES.md`  | Professional conduct, juror behavior, and dispute evidence quality.        |

## Agent Review Rule

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Use `.sixth/skills/legal-compliance/SKILL.md` for any legal or
compliance-sensitive change. Do not edit root legal draft files unless the
active user request explicitly authorizes edits to those files.

## Translation Workflow

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The frontend helper `src/helpers/legal-docs.ts` lists legal documents, supported
locales, source files, and translation status. It also exposes a constrained
machine-translation prompt that tells reviewers to preserve headings, numbering,
defined terms, links, and Markdown structure. Machine-assisted translations
should remain marked as needing review until a qualified reviewer approves them.

Reviewed translated legal bodies can be published by adding
`src/content/legal/<locale>/<SOURCE_FILE>.md`. The route falls back to the
English source file when a reviewed locale file is absent, so untranslated legal
obligations are not silently presented as approved localized legal text.

## Jurisdiction Note

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

A single SaaS policy set can provide a global baseline, but it cannot reliably
account for every territory, state, province, nation, regulator, and local
consumer or privacy law without jurisdiction-specific legal review. Use local
counsel for launch markets, sanctions exposure, tax treatment, employment
classification, securities risk, and consumer-protection obligations.

## Authors and Contributors

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **Kevin K. Le** — Founder, Founding Engineer, and Current Lead Engineer
  ([LinkedIn](https://www.linkedin.com/in/lekevin1))
- **Kellen Snider** — Founding Engineer
  ([LinkedIn](https://www.linkedin.com/in/kellen-snider-683396256/))

See [`CREDITS.md`](CREDITS.md) for the complete acknowledgement list.

## Legal

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

This document is part of TrustLedger, an open-source decentralized escrow and
arbitration protocol. Use of this software and documentation is subject to the
[Terms and Conditions](TERMS_AND_CONDITIONS.md),
[Privacy Policy](PRIVACY_POLICY.md), and [Risk Disclosure](RISK_DISCLOSURE.md).
See [`LEGAL.md`](LEGAL.md) for the full compliance and licensing overview.
