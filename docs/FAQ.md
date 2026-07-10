# FAQ

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Is TrustLedger Configured For Arbitrum Sepolia?](#is-trustledger-configured-for-arbitrum-sepolia)
- [Which Contract Reference Should I Use?](#which-contract-reference-should-i-use)
- [How Does A Freelancer Accept A Client Proposal?](#how-does-a-freelancer-accept-a-client-proposal)
- [How Do I Deploy?](#how-do-i-deploy)
- [Which Environment Variables Are Required?](#which-environment-variables-are-required)
- [Where Do I Get Sepolia ETH?](#where-do-i-get-sepolia-eth)
- [Where Are The GitHub Models Scripts Documented?](#where-are-the-github-models-scripts-documented)
- [Authors and Contributors](#authors-and-contributors)
- [Legal](#legal)

<!-- docs-toc:end -->

This is the developer-facing FAQ. The product-facing FAQ lives at the repository
root (`FAQ.md`); the two are intentionally separate documents.

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

This page answers common repository questions and links to canonical docs for
implementation details.

## Is TrustLedger Configured For Arbitrum Sepolia?

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

No source file currently configures Arbitrum Sepolia. Current config supports
local Hardhat, Ethereum Sepolia, Arbitrum One, Base, and Optimism. Read
[Deployment](DEPLOYMENT.md).

## Which Contract Reference Should I Use?

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Use [Smart Contracts](SMART-CONTRACTS.md). The older `CONTRACTS.md` page is kept
only for compatibility.

## How Does A Freelancer Accept A Client Proposal?

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The freelancer calls `acceptContractByFreelancer`. The client then funds with
`fundContractByClient`. This is separate from `acceptContract`, which is the
client funding step for freelancer-proposed escrows. Read
[Escrow Lifecycle](ESCROW-LIFECYCLE.md).

## How Do I Deploy?

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Use [Deployment](DEPLOYMENT.md). The source-supported automated workflow deploys
to Ethereum Sepolia, not Arbitrum Sepolia.

## Which Environment Variables Are Required?

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Read [Environment](ENVIRONMENT.md). Required variables depend on whether you are
deploying, running fork tests, using wallet connection, sending email, or
deploying to Vercel.

## Where Do I Get Sepolia ETH?

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Use [Sepolia Faucets](FAUCETS.md). Faucet limits and verification rules change
often, so prefer the live faucet UI over stale third-party quota claims.

## Where Are The GitHub Models Scripts Documented?

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Read [GitHub Models](GITHUB_MODELS.md) for workflow behavior and script-level
usage.

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
