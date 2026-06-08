# Presentation Notes

This document is a presentation-oriented overview of TrustLedger. Use it for
talks or demos, not as the canonical technical reference.

## Problem

Freelance work often requires one party to trust the other before payment or
delivery is complete. TrustLedger puts escrow, work submission, dispute
resolution, and reputation updates on-chain so participants can follow a
deterministic process.

## Implemented System

TrustLedger includes:

- Escrow proposals initiated by either the freelancer or client.
- Native-token and allowlisted ERC-20 escrow.
- Work submission, approval, warranty holdback, and deadline claims.
- Juror staking, committee selection, commit-reveal voting, appeals, rewards,
  and slashing.
- Participant ratings and recovery tracking.
- A Next.js frontend with wallet connection, email flows, notifications, i18n,
  and file upload support.

## Current Deployment Story

The source-supported automated deployment target is Ethereum Sepolia. Config
also includes Arbitrum One, Base, and Optimism. Arbitrum Sepolia is not
configured in source as of 2026-06-08.

## Technical References

- [Architecture](ARCHITECTURE.md)
- [Smart Contracts](SMART-CONTRACTS.md)
- [Escrow Lifecycle](ESCROW-LIFECYCLE.md)
- [Arbitration](ARBITRATION.md)
- [Deployment](DEPLOYMENT.md)
