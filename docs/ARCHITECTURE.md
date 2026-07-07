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
- [Off-Chain Layer](#off-chain-layer)
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

- IPFS upload support through server-side `/api/ipfs/pin` with `PINATA_JWT`.
- AES-GCM client-side encryption helpers in `src/lib/encryption.ts`.
- Magic link signing and verification in `src/lib/magicLink.ts`.
- Resend email delivery in `src/services/email.ts`.
- Deadline reminder logic in `src/services/notifications.ts`.
- A Vercel cron endpoint at `/api/cron/deadline-reminders`.

Read [Frontend](FRONTEND.md) for routes, services, and environment requirements.
Read [Oracle Architecture](ORACLE.md) for display-rate data flow and
[Utilities](UTILITIES.md) for the reusable contract-template generator.

## Off-Chain Layer

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Alongside the on-chain contracts, the frontend has a supporting off-chain layer
that never becomes the source of truth for escrow custody:

- **Account sessions** — `src/services/offchainAccounts.ts` runs a
  challenge/response flow: the client requests a challenge, signs it with an
  EIP-712 signature, and exchanges it for a bearer token cached client-side in
  `sessionStorage`. Client helpers live in `src/lib/accountSession.ts` and
  `src/lib/authedFetch.ts`.
- **TOTP two-factor authentication** — `src/services/totp.ts` provides an opt-in
  step-up during account session creation. Secrets are encrypted at rest with
  AES-256-GCM (`TOTP_ENCRYPTION_KEY`); recovery codes are stored only as sha256
  hashes.
- **End-to-end encrypted messaging** — `src/services/messaging.ts`,
  `src/lib/messagingCrypto.ts`, and the pure primitives in `src/lib/crypto/e2e`
  use X25519 identities and per-conversation message keys. The private key is
  wrapped by a key-encryption key derived from a deterministic EIP-712 wallet
  signature, so it re-derives on any device. The server stores only public keys,
  wrapped private keys, and ciphertext — never plaintext or the key-encryption
  key.
- **AI moderation** — `src/services/moderation.ts` moderates outbound message
  plaintext in a transient server call (never persisted) before the client
  encrypts it, backing `POST /api/messages/moderate`. It is advisory only and
  fails open when AI is disabled or the call fails.
- **AI core** — the provider-agnostic layer at `src/core/ai` (`generateText`,
  `streamText`) backs moderation and other AI features, with Gemini as the
  primary provider and OpenRouter as fallback.
- **Off-chain database** — PostgreSQL on Neon via Prisma 7 (node-postgres
  adapter). Server-only client and repositories live in `src/lib/db/`. Four
  tables back the features above: `messaging_keys`, `conversations`, `messages`,
  and `totp_credentials`. Migration automation on Vercel is covered in
  [Deployment](DEPLOYMENT.md); this document does not duplicate that detail.

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
[Terms and Conditions](TERMS_AND_CONDITIONS.md),
[Privacy Policy](PRIVACY_POLICY.md), and [Risk Disclosure](RISK_DISCLOSURE.md).
See [`LEGAL.md`](LEGAL.md) for the full compliance and licensing overview.
