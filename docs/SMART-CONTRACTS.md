# Smart Contracts

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Contract Set](#contract-set)
- [Contract Dependencies](#contract-dependencies)
- [TrustLedger](#trustledger)
    - [Key State](#key-state)
    - [TrustLedger Key Functions](#trustledger-key-functions)
    - [Access Control](#access-control)
    - [Events](#events)
- [Arbitration](#arbitration)
    - [Key Constants](#key-constants)
    - [Arbitration Key Functions](#arbitration-key-functions)
- [JurorRegistry](#jurorregistry)
- [ReputationRegistry](#reputationregistry)
- [Interfaces](#interfaces)
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

This document is the canonical Solidity reference for TrustLedger. Read it when
changing contract behavior, writing tests, or integrating a client with the
on-chain API.

## Contract Set

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Contract             | Role                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| `TrustLedger`        | Main escrow contract for proposals, funding, lifecycle transitions, disputes, rulings, warranties, and ratings. |
| `Arbitration`        | Dispute manager for juror selection, commit-reveal voting, appeals, rewards, and ruling execution.              |
| `JurorRegistry`      | Juror staking, eligibility, locking, cooldown, reputation, and slashing registry.                               |
| `ReputationRegistry` | Rating registry for clients and freelancers with low-rating recovery tracking.                                  |
| `MockERC20`          | Test ERC-20 token.                                                                                              |
| `MockPriceFeed`      | Test price feed.                                                                                                |
| `MockVRFCoordinator` | Test VRF coordinator.                                                                                           |

## Contract Dependencies

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`contracts/lib/openzeppelin-contracts` is pinned as a git submodule and should
move only through an intentional dependency-review change.
`contracts/lib/forge-std` is vendored as regular tracked files, so it is
intentionally not listed as a submodule in `.gitmodules`.

Check that both contract vendors are clean and pinned before contract work:

```bash
npm run contracts:vendor:check
```

A scheduled Security workflow runs the remote freshness check. To intentionally
review and bump OpenZeppelin or forge-std locally, run:

```bash
npm run contracts:vendor:update
npm run foundry:test
```

Then inspect the vendor diff and commit the bump as a dependency-review change.

`contracts/foundry-sandbox` is a separate Foundry project for minimal
reproductions and fork-test debugging. Keep production regression tests in
`contracts/test/`; use the sandbox for isolated compiler, dependency, or fork
cases that need a smaller surface.

Run it from the repository root with:

```bash
node tools/foundry-sandbox.mjs test --root foundry-sandbox --offline
```

## TrustLedger

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`TrustLedger` inherits `ReentrancyGuard` and `Pausable`. It stores escrow terms
in `EscrowContract` and tracks each escrow through this status enum:

| Status      | Meaning                                                               |
| ----------- | --------------------------------------------------------------------- |
| `PENDING`   | Proposed but not funded.                                              |
| `ACTIVE`    | Funded and in progress.                                               |
| `SUBMITTED` | Freelancer submitted proof of work.                                   |
| `APPROVED`  | Client approved work and the holdback is in warranty.                 |
| `DISPUTED`  | Arbitration is active.                                                |
| `RESOLVED`  | Funds were fully released or a ruling executed.                       |
| `CANCELLED` | Proposal was cancelled, rejected, or reclaimed after a deadline miss. |

### Key State

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Item                 | Purpose                                                          |
| -------------------- | ---------------------------------------------------------------- |
| `ARBITRATION`        | Immutable arbitration authority allowed to execute rulings.      |
| `reputationRegistry` | Optional one-time rating registry target.                        |
| `pauser`             | Optional one-time pause authority and token allowlist authority. |
| `allowedTokens`      | ERC-20 allowlist for non-native escrows.                         |
| `ratingSubmitted`    | Prevents duplicate client and freelancer ratings per escrow.     |

### TrustLedger Key Functions

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Function                     | Caller                      | Purpose                                                                 |
| ---------------------------- | --------------------------- | ----------------------------------------------------------------------- |
| `proposeContract`            | Freelancer                  | Create a freelancer-proposed escrow.                                    |
| `cancelProposal`             | Freelancer                  | Cancel a freelancer proposal before funding.                            |
| `acceptContract`             | Client                      | Fund and activate a freelancer proposal.                                |
| `rejectContract`             | Client                      | Reject a freelancer proposal.                                           |
| `proposeContractByClient`    | Client                      | Create a client-proposed escrow.                                        |
| `withdrawClientProposal`     | Client                      | Withdraw a client proposal before freelancer acceptance.                |
| `acceptContractByFreelancer` | Freelancer                  | Accept a client proposal before funding.                                |
| `rejectContractByFreelancer` | Freelancer                  | Reject a client proposal.                                               |
| `fundContractByClient`       | Client                      | Fund and activate an accepted client proposal.                          |
| `submitProofOfWork`          | Freelancer                  | Move an active escrow to submitted.                                     |
| `approveWork`                | Client                      | Release the freelancer share and start the warranty holdback.           |
| `disputeWork`                | Client or freelancer        | Open an arbitration dispute.                                            |
| `claimAfterDeadlineMiss`     | Client                      | Cancel and refund when the freelancer misses the project deadline.      |
| `claimAfterAcceptanceWindow` | Freelancer                  | Claim payment if the client does not approve or dispute submitted work. |
| `claimWarrantyFunds`         | Freelancer                  | Claim the holdback after the warranty period.                           |
| `submitRating`               | Client or freelancer        | Submit a 1-100 rating for the counterparty.                             |
| `executeRuling`              | Arbitration                 | Apply the final completion percentage and release funds.                |
| `addAllowedToken`            | Pauser or pre-pauser caller | Permanently allow an ERC-20 token for escrow.                           |
| `getContract`                | Anyone                      | Read escrow details.                                                    |

### Access Control

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`TrustLedger` uses role-by-address checks instead of OpenZeppelin ownership.
Client-only, freelancer-only, and arbitration-only paths use custom errors.
`pause` and `unpause` require the configured `pauser`. Before `pauser` is
initialized, `addAllowedToken` is callable by anyone; after initialization it is
restricted to `pauser`.

### Events

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Important events include `ContractProposed`, `ContractProposedByClient`,
`ContractFundedByClient`, `ContractAccepted`, `ContractRejected`,
`ProofSubmitted`, `WorkApproved`, `WorkDisputed`, `FundsReleased`,
`ContractCancelled`, `WarrantyFundsClaimed`, `RulingExecuted`,
`RatingSubmitted`, `ContractAmended`, and `TokenAllowed`.

## Arbitration

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`Arbitration` controls disputes opened by `TrustLedger`. A dispute phase is one
of `COMMIT`, `REVEAL`, `FINALIZED`, `APPEALED`, `APPEAL_COMMIT`,
`APPEAL_REVEAL`, or `APPEAL_FINALIZED`.

### Key Constants

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Constant                     |      Value |
| ---------------------------- | ---------: |
| `COMMIT_DURATION`            | `72 hours` |
| `REVEAL_DURATION`            | `72 hours` |
| `APPEAL_WINDOW`              | `72 hours` |
| `MIN_JURORS`                 |        `3` |
| `BASE_MAX_JURORS`            |        `5` |
| `APPEAL_BOND_MULTIPLIER_BPS` |    `15000` |
| `SLASH_BPS`                  |     `1000` |

### Arbitration Key Functions

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Function          | Caller               | Purpose                                                           |
| ----------------- | -------------------- | ----------------------------------------------------------------- |
| `openDispute`     | `TrustLedger`        | Create a dispute and select a committee.                          |
| `commitVote`      | Juror                | Submit a salted vote hash.                                        |
| `advanceToReveal` | Anyone               | Move a dispute to reveal after enough commits or deadline expiry. |
| `revealVote`      | Juror                | Reveal a completion percentage and salt.                          |
| `finalizeDispute` | Anyone               | Compute the median ruling and slash minority jurors.              |
| `appeal`          | Client or freelancer | Create an appeal dispute with a bond and larger committee.        |
| `claimReward`     | Majority juror       | Claim an equal share of the fee pool.                             |
| `executeRuling`   | Anyone               | Execute a non-appealed ruling after the appeal window.            |

Read [Arbitration](ARBITRATION.md) for the full dispute flow.

## JurorRegistry

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`JurorRegistry` stores juror stake and eligibility. Only `Arbitration` can lock,
unlock, or slash jurors.

| Function             | Purpose                                               |
| -------------------- | ----------------------------------------------------- |
| `register`           | Register as a juror by staking at least `0.01 ether`. |
| `addStake`           | Increase stake.                                       |
| `unstake`            | Withdraw stake after the lock period when not locked. |
| `lockForDispute`     | Lock a juror for an active dispute.                   |
| `unlockFromDispute`  | Unlock a juror and start cooldown.                    |
| `slash`              | Slash stake and reduce reputation.                    |
| `isEligible`         | Return whether a juror can be selected.               |
| `eligibleJurorCount` | Count eligible jurors.                                |

Eligibility requires active status, at least `0.01 ether` stake, no active lock,
reputation at least `20`, and no active cooldown.

## ReputationRegistry

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`ReputationRegistry` stores ratings submitted through `TrustLedger`.

| Function         | Purpose                                             |
| ---------------- | --------------------------------------------------- |
| `rate`           | Record a 1-100 score for a participant.             |
| `averageRating`  | Return the participant average or `0` when unrated. |
| `recoveryStatus` | Return pending low ratings and recovery progress.   |

Scores below `30` create recovery debt. Scores of at least `70` while recovery
debt is pending advance recovery progress. Every three qualifying recovery
scores clear one pending recovery and add a synthetic `50` score.

## Interfaces

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The source includes interfaces under `contracts/src/interfaces/` for
cross-contract calls:

- `IArbitration`
- `IJurorRegistry`
- `IReputationRegistry`
- `ITrustLedger`
- `IERC20`
- `AggregatorV3Interface`
- `IVRFCoordinator`

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
