# CodeRabbit

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Review Policy](#review-policy)
- [Maintenance](#maintenance)
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

TrustLedger uses `.coderabbit.yaml` for automated pull-request review guidance.
The configuration is intentionally strict so review comments line up with the
same quality gates enforced by CI.

## Review Policy

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- CodeRabbit uses the assertive profile and may request changes.
- Generated, vendored, cache, build, and log directories are excluded from
  review.
- Solidity reviews prioritize reentrancy, access control, event coverage,
  fuzzing, and secret hygiene.
- TypeScript reviews prioritize strict typing, async safety, and secret hygiene.
- Workflow reviews prioritize pinned actions, least-privilege permissions, and
  safe secret access.
- Docker and Kubernetes reviews prioritize reproducible builds, runtime health
  checks, resource limits, security contexts, and no committed secrets.
- Documentation reviews should flag stale commands, undocumented environment
  variables, and examples that expose real credentials.

## Maintenance

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Update `.coderabbit.yaml` whenever new high-risk paths are added, especially
deployment manifests, workflows, package-manager files, generated artifacts, or
security-sensitive API routes. Keep this page in sync with those changes.

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
[Terms and Conditions](../TERMS_AND_CONDITIONS.md),
[Privacy Policy](../PRIVACY_POLICY.md), and
[Risk Disclosure](../RISK_DISCLOSURE.md). See [`LEGAL.md`](LEGAL.md) for the
full compliance and licensing overview.
