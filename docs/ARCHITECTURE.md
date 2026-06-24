# Architecture

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Components](#components)
- [Contract Relationships](#contract-relationships)
- [Escrow Model](#escrow-model)
- [Arbitration Model](#arbitration-model)
- [Frontend Model](#frontend-model)
- [Network Support](#network-support)
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

This document explains how TrustLedger's contracts, frontend, scripts, and
workflows fit together. Read it before changing cross-component behavior or
deployment wiring.

## Components

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Component            | Path                                                 | Role                                                                                              |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Escrow contract      | `contracts/src/TrustLedger.sol`                      | Stores escrow terms, funds, status, warranties, ratings, and arbitration links.                   |
| Arbitration contract | `contracts/src/Arbitration.sol`                      | Opens disputes, selects jurors, runs commit-reveal voting, handles appeals, and executes rulings. |
| Juror registry       | `contracts/src/JurorRegistry.sol`                    | Tracks juror stake, eligibility, locks, cooldowns, and slashing.                                  |
| Reputation registry  | `contracts/src/ReputationRegistry.sol`               | Stores numeric ratings and recovery progress after low ratings.                                   |
| Frontend             | `src/`                                               | Next.js app for contract creation, wallet interaction, files, email flows, and notifications.     |
| Deployment scripts   | `contracts/script/Deploy.s.sol`, `scripts/deploy.ts` | Deploy and wire the contract set.                                                                 |
| CI/CD                | `.github/workflows/*.yml`                            | Build, lint, test, deploy, publish docs, and run security checks.                                 |

## Contract Relationships

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`TrustLedger` is the escrow authority. `Arbitration` can execute rulings on
disputed escrows. `JurorRegistry` accepts lock, unlock, and slash calls only
from `Arbitration`. `ReputationRegistry` accepts ratings only from
`TrustLedger`.

```text
Client / Freelancer
        |
        v
TrustLedger ---- opens dispute ----> Arbitration
     |                                  |
     | rates                            | locks, unlocks, slashes
     v                                  v
ReputationRegistry                 JurorRegistry
```

The deployment scripts precompute addresses so `JurorRegistry` can be
constructed with the future `Arbitration` address and `TrustLedger` can be
constructed with the same authority. The scripts then call
`TrustLedger.initReputationRegistry` once after deploying `ReputationRegistry`.

## Escrow Model

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

An escrow can start from either side:

- A freelancer proposes work with `proposeContract`, then the client funds with
  `acceptContract`.
- A client proposes work with `proposeContractByClient`, the freelancer accepts
  with `acceptContractByFreelancer`, then the client funds with
  `fundContractByClient`.

Both flows converge on `ACTIVE`. From there, the freelancer submits proof, the
client approves or disputes, and the contract either releases funds directly or
waits for an arbitration ruling. Read [Escrow Lifecycle](ESCROW-LIFECYCLE.md)
for the state machine.

## Arbitration Model

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Disputes use juror committees selected from `JurorRegistry`. When no VRF
coordinator is set, `Arbitration.openDispute` derives a seed from
`block.prevrandao`, `block.timestamp`, and the dispute ID, then selects jurors
immediately. The current source does not leave disputes open for public
self-selection in the normal non-VRF path.

Jurors commit a salted vote hash, reveal a completion percentage, and receive
rewards only when they are in the majority bucket. Appeals create a second
dispute with a larger committee and a bond. Read [Arbitration](ARBITRATION.md)
for details.

## Frontend Model

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The frontend is a standalone Next.js package under `src/`. It uses Reown AppKit
with wagmi and viem to connect wallets on Sepolia, Arbitrum One, Base, and
Optimism. It also includes:

- IPFS upload support through `NEXT_PUBLIC_PINATA_JWT`.
- AES-GCM client-side encryption helpers in `src/lib/encryption.ts`.
- Magic link signing and verification in `src/lib/magicLink.ts`.
- Resend email delivery in `src/services/email.ts`.
- Deadline reminder logic in `src/services/notifications.ts`.
- A Vercel cron endpoint at `/api/cron/deadline-reminders`.

Read [Frontend](FRONTEND.md) for routes, services, and environment requirements.
Read [Oracle Architecture](ORACLE.md) for display-rate data flow and
[Utilities](UTILITIES.md) for the reusable contract-template generator.

## Network Support

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Network          |   Chain ID | Source Support                                                     |
| ---------------- | ---------: | ------------------------------------------------------------------ |
| Local Hardhat    |    `31337` | Hardhat network and frontend default deployment slot.              |
| Ethereum Sepolia | `11155111` | Hardhat, Foundry, deploy workflow, frontend, and explorer helpers. |
| Arbitrum One     |    `42161` | Hardhat, Foundry, frontend, and explorer helpers.                  |
| Base             |     `8453` | Hardhat, Foundry, frontend, and explorer helpers.                  |
| Optimism         |       `10` | Hardhat, Foundry, frontend, and explorer helpers.                  |

> **TODO:** Add Arbitrum Sepolia config before documenting it as a supported
> deployment target.

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
