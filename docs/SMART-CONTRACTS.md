# Smart Contracts

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

This document is the canonical Solidity reference for TrustLedger. Read it when
changing contract behavior, writing tests, or integrating a client with the
on-chain API.

## Contract Set

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

`contracts/lib/openzeppelin-contracts` is pinned as a git submodule and should
move only through an intentional dependency-review change.
`contracts/lib/forge-std` is vendored as regular tracked files, so it is
intentionally not listed as a submodule in `.gitmodules`.

`contracts/foundry-sandbox` is a separate Foundry project for minimal
reproductions and fork-test debugging. Keep production regression tests in
`contracts/test/`; use the sandbox for isolated compiler, dependency, or fork
cases that need a smaller surface.

Run it from the repository root with:

```bash
node tools/foundry-sandbox.mjs test --root foundry-sandbox --offline
```

## TrustLedger

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

| Item                 | Purpose                                                          |
| -------------------- | ---------------------------------------------------------------- |
| `ARBITRATION`        | Immutable arbitration authority allowed to execute rulings.      |
| `reputationRegistry` | Optional one-time rating registry target.                        |
| `pauser`             | Optional one-time pause authority and token allowlist authority. |
| `allowedTokens`      | ERC-20 allowlist for non-native escrows.                         |
| `ratingSubmitted`    | Prevents duplicate client and freelancer ratings per escrow.     |

### Key Functions

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

`TrustLedger` uses role-by-address checks instead of OpenZeppelin ownership.
Client-only, freelancer-only, and arbitration-only paths use custom errors.
`pause` and `unpause` require the configured `pauser`. Before `pauser` is
initialized, `addAllowedToken` is callable by anyone; after initialization it is
restricted to `pauser`.

### Events

Important events include `ContractProposed`, `ContractProposedByClient`,
`ContractFundedByClient`, `ContractAccepted`, `ContractRejected`,
`ProofSubmitted`, `WorkApproved`, `WorkDisputed`, `FundsReleased`,
`ContractCancelled`, `WarrantyFundsClaimed`, `RulingExecuted`,
`RatingSubmitted`, `ContractAmended`, and `TokenAllowed`.

## Arbitration

`Arbitration` controls disputes opened by `TrustLedger`. A dispute phase is one
of `COMMIT`, `REVEAL`, `FINALIZED`, `APPEALED`, `APPEAL_COMMIT`,
`APPEAL_REVEAL`, or `APPEAL_FINALIZED`.

### Key Constants

| Constant                     |      Value |
| ---------------------------- | ---------: |
| `COMMIT_DURATION`            | `72 hours` |
| `REVEAL_DURATION`            | `72 hours` |
| `APPEAL_WINDOW`              | `72 hours` |
| `MIN_JURORS`                 |        `3` |
| `BASE_MAX_JURORS`            |        `5` |
| `APPEAL_BOND_MULTIPLIER_BPS` |    `15000` |
| `SLASH_BPS`                  |     `1000` |

### Key Functions

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

The source includes interfaces under `contracts/src/interfaces/` for
cross-contract calls:

- `IArbitration`
- `IJurorRegistry`
- `IReputationRegistry`
