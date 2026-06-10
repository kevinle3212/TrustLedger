# TrustLedger Documentation

<a id="top"></a>

<!-- docs-nav:start -->
[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)
<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->
- [Start Here](#start-here)
- [Compatibility Pages](#compatibility-pages)
<!-- docs-toc:end -->

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

This page is the documentation entry point for developers, reviewers, operators,
and frontend contributors working on TrustLedger.

## Start Here

<!-- docs-section-nav:start -->
[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)
<!-- docs-section-nav:end -->

| Document                                | Use It For                                                              |
| --------------------------------------- | ----------------------------------------------------------------------- |
| [Architecture](ARCHITECTURE.md)         | System components, data flow, and network support.                      |
| [Smart Contracts](SMART-CONTRACTS.md)   | Contract-by-contract reference for Solidity APIs.                       |
| [Escrow Lifecycle](ESCROW-LIFECYCLE.md) | Proposal, funding, work, approval, dispute, warranty, and rating flows. |
| [Arbitration](ARBITRATION.md)           | Juror selection, commit-reveal voting, appeals, rewards, and slashing.  |
| [Deployment](DEPLOYMENT.md)             | Local and Ethereum Sepolia deployment with current scripts.             |
| [Testing](TESTING.md)                   | Foundry, Hardhat, frontend, fork, lint, and CI test commands.           |
| [Environment](ENVIRONMENT.md)           | Required and optional environment variables.                            |
| [Sepolia Faucets](FAUCETS.md)           | Current Sepolia ETH faucet options, rate limits, and debugging tips.    |
| [CI/CD](CI-CD.md)                       | GitHub Actions workflow triggers, jobs, secrets, and gotchas.           |
| [Frontend](FRONTEND.md)                 | Next.js app structure, wallet config, API routes, and services.         |
| [Analytics](ANALYTICS.md)               | Privacy-safe wallet metrics, visual generation, and native kernels.     |
| [Audit Readiness](AUDIT-READINESS.md)   | Auditor package, threat model, invariants, and remediation tracker.     |
| [GitHub Models](GITHUB_MODELS.md)       | AI helper scripts, prompt evaluation, and workflow notes.               |
| [TypeScript SDK](TYPESCRIPT-SDK.md)     | ABI, TypeChain, helper exports, and TypeScript usage.                   |
| [Security](SECURITY.md)                 | Access control, escrow risks, arbitration risks, and audit status.      |
| [GitHub Rulesets](GITHUB-RULESETS.md)   | Server-side rules for blocking sensitive files and secret pushes.       |
| [Legal And Compliance](LEGAL.md)        | Legal document inventory, review triggers, and jurisdiction caveats.    |
| [Contributing](CONTRIBUTING.md)         | Setup, style, linting, docs, and PR expectations.                       |

## Compatibility Pages

<!-- docs-section-nav:start -->
[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)
<!-- docs-section-nav:end -->

Some legacy docs are kept because MkDocs, the generated wiki home, or external
links may still reference them. When a topic has a canonical page, the legacy
page links to the canonical version instead of duplicating stale details.

| Legacy Page                        | Canonical Page                        |
| ---------------------------------- | ------------------------------------- |
| [Contract Reference](CONTRACTS.md) | [Smart Contracts](SMART-CONTRACTS.md) |
| [FAQ](FAQ.md)                      | Topic-specific docs above             |
| [Miscellaneous](MISCELLANEOUS.md)  | Topic-specific docs above             |
