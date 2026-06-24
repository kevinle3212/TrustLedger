# Audit Readiness

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Scope](#scope)
- [Deployment Assumptions](#deployment-assumptions)
- [Threat Model](#threat-model)
- [Trust Boundaries](#trust-boundaries)
- [Invariants](#invariants)
- [Validation Evidence](#validation-evidence)
- [Known Risks](#known-risks)
- [Remediation Tracker](#remediation-tracker)
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

## Scope

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The audit package covers the Solidity escrow, arbitration, juror registry,
reputation registry, deployment scripts, oracle assumptions, test suites, and
frontend/API boundaries that submit or display contract state.

## Deployment Assumptions

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- Sepolia remains the active public test network until an external audit report
  is complete.
- Mainnet deployments require reviewed constructor parameters, verified source
  code, deployed dependency addresses, and documented owner/admin authority.
- Private keys, RPC credentials, API keys, session secrets, and wallet seed
  phrases must only live in deployment secrets.

## Threat Model

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Review escrow custody, unauthorized withdrawals, reentrancy, replayed
signatures, oracle staleness, juror manipulation, commit-reveal leakage,
minority-vote slashing correctness, deadline edge cases, and frontend/API misuse
that could misrepresent on-chain state.

## Trust Boundaries

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- Smart contracts enforce escrow, dispute, payout, rating, and juror behavior.
- API routes may aggregate public state, but must not custody funds or secrets.
- Off-chain account services store preferences and encrypted envelopes only.
- AI providers receive minimized contract metadata only, never raw encrypted
  documents, private keys, seed phrases, session keys, or unrelated wallet
  history.

## Invariants

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- Escrowed value cannot be released except through approved, deadline, dispute,
  cancellation, or warranty paths.
- Only eligible roles can perform role-specific contract actions.
- Commit-reveal votes cannot be revealed without the original salt and
  completion percentage.
- Hold-back accounting never exceeds the escrow amount.
- Reputation updates are tied to finalized or completed contract outcomes.

## Validation Evidence

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Before sending this package to an auditor, attach current outputs from:

- `npm run hardhat:test`
- `npm run foundry:test`
- `npm run lint:sol`
- `npm run contracts:vendor:check`
- `npm run security`
- `npm run quality`

## Known Risks

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- The final external audit report is not yet present.
- Mainnet readiness depends on provider secrets, monitoring, and deployment
  controls outside this repository.
- Hardhat 3.x migration is complete, but external auditor engagement and a
  signed final report remain launch-blocking work outside this repository.
- Maintainers still need to provide the selected independent auditor, signed
  engagement or audit scope, scope-freeze date, final report, severity list,
  accepted/rejected finding decisions, remediation owners, and final validation
  evidence before the Phase 9 audit item can be closed.

## Remediation Tracker

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Finding                      | Severity | Owner               | Status | Notes                                                            |
| ---------------------------- | -------- | ------------------- | ------ | ---------------------------------------------------------------- |
| External audit engagement    | High     | Project Maintainers | Open   | Engage an independent auditor before mainnet.                    |
| Final audit report           | High     | Project Maintainers | Open   | Add signed report to `docs/reports/` once received.              |
| Mainnet deployment checklist | High     | Project Maintainers | Open   | Validate secrets, RPCs, monitoring, and addresses before launch. |

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
