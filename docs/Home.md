# TrustLedger Documentation

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Start Here](#start-here)
- [Operations](#operations)
- [Tooling and Reference](#tooling-and-reference)
- [Meta](#meta)
- [Reports](#reports)
- [Compatibility Pages](#compatibility-pages)
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

This page is the documentation entry point for developers, reviewers, operators,
and frontend contributors working on TrustLedger.

## Start Here

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Document                                  | Use It For                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| [Architecture](ARCHITECTURE.md)           | System components, data flow, and network support.                      |
| [Smart Contracts](SMART-CONTRACTS.md)     | Contract-by-contract reference for Solidity APIs.                       |
| [Escrow Lifecycle](ESCROW-LIFECYCLE.md)   | Proposal, funding, work, approval, dispute, warranty, and rating flows. |
| [Arbitration](ARBITRATION.md)             | Juror selection, commit-reveal voting, appeals, rewards, and slashing.  |
| [Deployment](DEPLOYMENT.md)               | Local and Ethereum Sepolia deployment with current scripts.             |
| [Testing](TESTING.md)                     | Foundry, Hardhat, frontend, fork, lint, and CI test commands.           |
| [Environment](ENVIRONMENT.md)             | Required and optional environment variables.                            |
| [Sepolia Faucets](FAUCETS.md)             | Current Sepolia ETH faucet options, rate limits, and debugging tips.    |
| [CI/CD](CI-CD.md)                         | GitHub Actions workflow triggers, jobs, secrets, and gotchas.           |
| [Frontend](FRONTEND.md)                   | Next.js app structure, wallet config, API routes, and services.         |
| [Analytics](ANALYTICS.md)                 | Privacy-safe wallet metrics, visual generation, and native kernels.     |
| [Audit Readiness](AUDIT-READINESS.md)     | Auditor package, threat model, invariants, and remediation tracker.     |
| [GitHub Models](GITHUB_MODELS.md)         | AI helper scripts, prompt evaluation, and workflow notes.               |
| [TypeScript SDK](TYPESCRIPT-SDK.md)       | ABI, TypeChain, helper exports, and TypeScript usage.                   |
| [Security](SECURITY.md)                   | Access control, escrow risks, arbitration risks, and audit status.      |
| [GitHub Rulesets](GITHUB-RULESETS.md)     | Server-side rules for blocking sensitive files and secret pushes.       |
| [Legal And Compliance](LEGAL.md)          | Legal document inventory, review triggers, and jurisdiction caveats.    |
| [Contributing](CONTRIBUTING.md)           | Setup, style, linting, docs, and PR expectations.                       |
| [Core Layer](CORE.md)                     | Config, cache, errors, flags, events, and permission primitives.        |
| [Oracle](ORACLE.md)                       | Chainlink VRF integration, randomness requests, and fulfillment flow.   |
| [Solana](SOLANA.md)                       | Solana escrow program, USDC support, and Anchor client setup.           |
| [Wallets](WALLETS.md)                     | Supported wallets, connection patterns, and WalletConnect config.       |
| [Admin Dashboard](ADMIN.md)               | Admin API endpoints, role checks, and operational tools.                |
| [Quality Standards](QUALITY-STANDARDS.md) | React Doctor, TypeScript strictness, accessibility, and release gates.  |

## Operations

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Document                    | Use It For                                                          |
| --------------------------- | ------------------------------------------------------------------- |
| [Infrastructure](INFRA.md)  | Topology overview, containers, Kubernetes, and operational runbook. |
| [Docker](DOCKER.md)         | Image builds, compose stacks, and local dev/CI containers.          |
| [Kubernetes](KUBERNETES.md) | Manifests, Kustomize, HPA, secrets, and deployment procedures.      |

## Tooling and Reference

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Document                    | Use It For                                                          |
| --------------------------- | ------------------------------------------------------------------- |
| [Utilities](UTILITIES.md)   | Shared helper functions, formatting, and validation utilities.      |
| [Type Stubs](STUBS.md)      | Hand-written `.d.ts` stubs for untyped or partially typed packages. |
| [SWC and Artifacts](SWC.md) | SWC compiler config, generated artifacts, and build output.         |
| [CodeRabbit](CODERABBIT.md) | AI code-review config, review profiles, and suppression rules.      |

## Meta

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Document                                   | Use It For                                                         |
| ------------------------------------------ | ------------------------------------------------------------------ |
| [Agent and Task Context](AGENT-CONTEXT.md) | Role-scoped commands, invariants, and quality gates for AI agents. |
| [Credits](CREDITS.md)                      | Authors, contributors, and third-party acknowledgements.           |
| [Demo](DEMO.md)                            | Demo environment setup and walkthrough guide.                      |
| [Presentation](PRESENTATION.md)            | Slide deck and pitch materials.                                    |

## Reports

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Document                                                        | Use It For                                             |
| --------------------------------------------------------------- | ------------------------------------------------------ |
| [Audit Report](reports/audit-report.md)                         | Latest security audit findings and remediation status. |
| [Coverage Gap Report](reports/coverage-gap-report.md)           | Test coverage gaps by module.                          |
| [Dependency Health Report](reports/dependency-health-report.md) | Dependency freshness and vulnerability summary.        |

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
