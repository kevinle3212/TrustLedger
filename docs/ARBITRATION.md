# Arbitration

This document explains the arbitration system in `Arbitration.sol` and
`JurorRegistry.sol`. Read it before changing dispute resolution, juror
incentives, or appeal behavior.

## Dispute Phases

| Phase              | Meaning                                                            |
| ------------------ | ------------------------------------------------------------------ |
| `COMMIT`           | Jurors submit salted vote hashes.                                  |
| `REVEAL`           | Jurors reveal completion percentages and salts.                    |
| `FINALIZED`        | The original dispute has a ruling and can be appealed or executed. |
| `APPEALED`         | The original dispute is waiting on an appeal dispute.              |
| `APPEAL_COMMIT`    | Appeal jurors submit salted vote hashes.                           |
| `APPEAL_REVEAL`    | Appeal jurors reveal votes.                                        |
| `APPEAL_FINALIZED` | The appeal has a final ruling.                                     |

## Opening A Dispute

Only `TrustLedger` can call `openDispute`. It passes the escrow ID, client
address, freelancer address, and juror fee pool. The dispute stores the original
parties and chooses a committee.

When `vrfCoordinator` is configured, the contract requests randomness. When it
is not configured, the contract derives a seed from `block.prevrandao`,
`block.timestamp`, and the dispute ID, then selects jurors immediately.

> **TODO:** Treat the non-VRF path as pseudo-random committee selection. It is
> useful for tests and testnet demos, but it is not equivalent to an external
> randomness oracle.

## Juror Selection

The selector iterates over `JurorRegistry.getJurorList()` with a partial
shuffle. It excludes:

- The client.
- The freelancer.
- Duplicate jurors already chosen for the dispute.
- Original-dispute jurors when selecting an appeal committee.
- Jurors that `JurorRegistry.isEligible` rejects.

The selected jurors are marked as committed slots internally and locked in
`JurorRegistry`. Eligibility requires active status, minimum stake, no active
dispute lock, sufficient reputation, and no active cooldown.

## Commit-Reveal Voting

Jurors first call `commitVote` with:

```solidity
keccak256(abi.encodePacked(disputeId, juror, completionPct, salt))
```

They later call `revealVote` with the completion percentage and salt.
`completionPct` must be from `0` to `100`. Revealed votes are finalized with a
median ruling.

Anyone can call `advanceToReveal` after the commit deadline or after the minimum
juror threshold has committed. Anyone can call `finalizeDispute` after the
reveal deadline.

## Ruling Execution

The final completion percentage is passed back into `TrustLedger.executeRuling`.
Edge cases are direct:

- `0` sends the remaining escrow value to the client.
- `100` sends the remaining escrow value to the freelancer.

Partial completion uses the formula in `TrustLedger._executeRulingPayout`. For
native-token escrows, the freelancer also bears a proportional share of the
juror fee pool. For ERC-20 escrows, the juror fee pool is paid separately in
ETH, so the ERC-20 payout calculation uses the escrowed ERC-20 amount.

## Appeals

After an original dispute is finalized, the client or freelancer can appeal
during `APPEAL_WINDOW`, which is `72 hours`. The caller must post a bond of at
least `15000` basis points of the fee pool, or 1.5 times the fee pool.

An appeal creates a new dispute with a larger committee and excludes the
original committee. If the appeal changes the ruling, the bond is returned to
the appealer. The appeal then executes the final ruling against the original
escrow.

## Rewards And Slashing

Majority jurors claim an equal share of the fee pool with `claimReward`. Jurors
in the minority are slashed during finalization. Severe minority outliers can
receive a larger slash. Slashed amounts accumulate in the arbitration contract's
slashed pool.

## Timing Constants

| Constant             |                  Value |
| -------------------- | ---------------------: |
| `COMMIT_DURATION`    |             `72 hours` |
| `REVEAL_DURATION`    |             `72 hours` |
| `APPEAL_WINDOW`      |             `72 hours` |
| `MIN_JURORS`         |                    `3` |
| `BASE_MAX_JURORS`    |                    `5` |
| `MAJORITY_THRESHOLD` | `20` percentage points |
| `SLASH_BPS`          |                 `1000` |
| `SEVERE_SLASH_BPS`   |                 `2000` |
