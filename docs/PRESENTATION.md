# Presentation Notes

<a id="top"></a>

<!-- docs-nav:start -->
[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)
<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->
- [Problem](#problem)
- [Implemented System](#implemented-system)
- [Current Deployment Story](#current-deployment-story)
- [Technical References](#technical-references)
- [Social Slide](#social-slide)
<!-- docs-toc:end -->

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

This document is a presentation-oriented overview of TrustLedger. Use it for
talks or demos, not as the canonical technical reference.

## Problem

<!-- docs-section-nav:start -->
[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)
<!-- docs-section-nav:end -->

Freelance work often requires one party to trust the other before payment or
delivery is complete. TrustLedger puts escrow, work submission, dispute
resolution, and reputation updates on-chain so participants can follow a
deterministic process.

## Implemented System

<!-- docs-section-nav:start -->
[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)
<!-- docs-section-nav:end -->

TrustLedger includes:

- Escrow proposals initiated by either the freelancer or client.
- Encrypted pre-deployment contract drafting with Markdown/HTML/plain-text
  terms, wallet allowlists, separate session keys, snapshot sharing, and
  optional plaintext-blind live rooms.
- Native-token and allowlisted ERC-20 escrow.
- Work submission, approval, warranty holdback, and deadline claims.
- Juror staking, committee selection, commit-reveal voting, appeals, rewards,
  and slashing.
- Participant ratings and recovery tracking.
- A Next.js frontend with wallet connection, email flows, notifications, i18n,
  and file upload support.

## Current Deployment Story

<!-- docs-section-nav:start -->
[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)
<!-- docs-section-nav:end -->

The source-supported automated deployment target is Ethereum Sepolia. Config
also includes Arbitrum One, Base, and Optimism. Arbitrum Sepolia is not
configured in source as of 2026-06-08.

## Technical References

<!-- docs-section-nav:start -->
[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)
<!-- docs-section-nav:end -->

- [Architecture](ARCHITECTURE.md)
- [Frontend](FRONTEND.md)
- [Smart Contracts](SMART-CONTRACTS.md)
- [Escrow Lifecycle](ESCROW-LIFECYCLE.md)
- [Arbitration](ARBITRATION.md)
- [Deployment](DEPLOYMENT.md)

## Social Slide

<!-- docs-section-nav:start -->
[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)
<!-- docs-section-nav:end -->

The one-slide social PDF lives at
[`assets/presentation/trustledger-one-slide.pdf`](https://github.com/kevinle3212/TrustLedger/blob/main/assets/presentation/trustledger-one-slide.pdf).
It follows this overview's positioning: TrustLedger is a serious freelance
escrow workflow with wallet-gated contracts, encrypted collaboration, on-chain
fund handling, and juror-backed dispute resolution.
