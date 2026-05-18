# Contract Reference

Full public API for all four TrustLedger contracts. All contracts are deployed on Ethereum Sepolia. Addresses are written to `artifacts/deployed-addresses.json` after each deploy.

---

## TrustLedger.sol

The core escrow engine. Holds ETH or ERC-20 tokens between a client and a freelancer and enforces the contract lifecycle.

### Immutables

| Name          | Type           | Description                                                      |
| ------------- | -------------- | ---------------------------------------------------------------- |
| `ARBITRATION` | `IArbitration` | Arbitration contract that receives fee pools and issues rulings. |

### State

| Name                 | Type                    | Description                                     |
| -------------------- | ----------------------- | ----------------------------------------------- |
| `nextId`             | `uint256`               | Auto-incrementing escrow contract ID counter.   |
| `priceFeed`          | `AggregatorV3Interface` | Optional Chainlink ETH/USD feed; zero if unset. |
| `reputationRegistry` | `IReputationRegistry`   | Optional reputation registry; zero if unset.    |

### Constants

| Name                      | Value    | Description                                  |
| ------------------------- | -------- | -------------------------------------------- |
| `MIN_ACCEPTANCE_WINDOW`   | 48 hours | Minimum review period after work submission. |
| `MIN_BUFFER_FACTOR`       | 1100     | Minimum deadline multiplier (1.1×).          |
| `MAX_ARBITRATION_FEE_BPS` | 5000     | Maximum juror fee (50%).                     |
| `MIN_HOLD_BACK_BPS`       | 500      | Minimum warranty hold-back (5%).             |
| `MAX_HOLD_BACK_BPS`       | 1500     | Maximum warranty hold-back (15%).            |
| `BPS_DENOMINATOR`         | 10_000   | Basis-point denominator.                     |

---

### Functions

#### `createContract`

```solidity
function createContract(
    address freelancer,
    bytes32 contractHash,
    string calldata contractURI,
    uint256 estimatedDuration,
    uint256 bufferFactor,
    uint256 acceptanceWindow,
    uint16  arbitrationFeeBps,
    uint16  holdBackBps,
    uint64  warrantyPeriod,
    address token,
    uint256 tokenAmount
) external payable returns (uint256 id)
```

Creates an escrow contract and locks funds. For ETH: set `token = address(0)`, `tokenAmount = 0`, send ETH as `msg.value`. For ERC-20: set `token` to the token address, `tokenAmount` to the amount, `msg.value = 0` (pre-approve the contract first).

`projectDeadline = block.timestamp + (estimatedDuration × bufferFactor) / 1000`

Emits `ContractCreated`.

---

#### `acceptContract`

```solidity
function acceptContract(uint256 id, uint8 v, bytes32 r, bytes32 s) external
```

Freelancer accepts the contract by submitting an EIP-191 ECDSA signature over `keccak256(abi.encodePacked(id, freelancerAddress))`. The contract recovers the signer and reverts if it does not match `freelancer`. Transitions status to `ACTIVE`.

Emits `ContractAccepted`.

---

#### `rejectContract`

```solidity
function rejectContract(uint256 id) external
```

Freelancer rejects the contract. Funds are returned to the client. Status transitions to `CANCELLED`.

Emits `ContractRejected`.

---

#### `submitProofOfWork`

```solidity
function submitProofOfWork(
    uint256 id,
    bytes32 powHash,
    string calldata powURI
) external
```

Freelancer submits a `keccak256` hash of the deliverable and an IPFS URI. Sets `acceptanceDeadline = block.timestamp + acceptanceWindow`. Status transitions to `SUBMITTED`.

Emits `ProofSubmitted`.

---

#### `approveWork`

```solidity
function approveWork(uint256 id) external
```

Client approves submitted work. Releases `amount − holdBackAmount` to the freelancer. If `holdBackBps > 0`, sets `warrantyDeadline` and retains `holdBackAmount`. Status transitions to `APPROVED`.

Emits `WorkApproved` and `FundsReleased`.

---

#### `disputeWork`

```solidity
function disputeWork(uint256 id) external
```

Client opens a dispute. Forwards `amount × arbitrationFeeBps / 10_000` ETH (the fee pool) to `Arbitration.openDispute()`. Status transitions to `DISPUTED`.

Emits `WorkDisputed`.

---

#### `claimAfterDeadlineMiss`

```solidity
function claimAfterDeadlineMiss(uint256 id) external
```

Client reclaims funds if the freelancer misses the project deadline without submitting work. Status transitions to `CANCELLED`.

Emits `ContractCancelled`.

---

#### `claimAfterAcceptanceWindow`

```solidity
function claimAfterAcceptanceWindow(uint256 id) external
```

Freelancer auto-claims payment if the client does not respond within the acceptance window. Status transitions to `APPROVED`.

Emits `WorkApproved` and `FundsReleased`.

---

#### `claimWarrantyFunds`

```solidity
function claimWarrantyFunds(uint256 id) external
```

Freelancer claims the warranty hold-back after `warrantyDeadline` has passed.

Emits `WarrantyFundsClaimed`.

---

#### `cancelPending`

```solidity
function cancelPending(uint256 id) external
```

Client cancels a contract that is still `PENDING` (before the freelancer responds). Funds returned to client. Status transitions to `CANCELLED`.

Emits `ContractCancelled`.

---

#### `submitRating`

```solidity
function submitRating(uint256 id, uint8 score) external
```

Submits a rating (1-100) for the counterparty. Clients rate freelancers; freelancers rate clients. Each party may rate once per contract. No-ops silently if `ReputationRegistry` has not been configured. Only callable after status is `APPROVED` or `RESOLVED`.

Emits `RatingSubmitted`.

---

#### `executeRuling`

```solidity
function executeRuling(uint256 id, uint256 completionPct) external
```

Called only by `Arbitration`. Distributes escrow funds based on the juror-determined `completionPct` (0-100). Uses the proportional fee split formula. Status transitions to `RESOLVED`.

Emits `RulingExecuted` and `FundsReleased`.

---

#### `initPriceFeed`

```solidity
function initPriceFeed(address feed_) external
```

One-time setter. Wires in a Chainlink `AggregatorV3Interface`. Once set, cannot be changed.

---

#### `initReputationRegistry`

```solidity
function initReputationRegistry(address registry_) external
```

One-time setter. Wires in a `ReputationRegistry`. Once set, cannot be changed.

---

#### `getContract`

```solidity
function getContract(uint256 id) external view returns (EscrowContract memory)
```

Returns the full `EscrowContract` struct for a given escrow ID.

---

### Events

| Event                  | Parameters                             |
| ---------------------- | -------------------------------------- |
| `ContractCreated`      | `id`, `client`, `freelancer`, `amount` |
| `ContractAccepted`     | `id`                                   |
| `ContractRejected`     | `id`                                   |
| `ProofSubmitted`       | `id`, `powHash`, `powURI`              |
| `WorkApproved`         | `id`                                   |
| `WorkDisputed`         | `id`, `arbitrationId`                  |
| `FundsReleased`        | `id`, `to`, `amount`                   |
| `ContractCancelled`    | `id`                                   |
| `WarrantyFundsClaimed` | `id`, `freelancer`, `amount`           |
| `RulingExecuted`       | `id`, `completionPct`                  |
| `RatingSubmitted`      | `id`, `rater`, `score`                 |

### Errors

| Error                     | Trigger                                                              |
| ------------------------- | -------------------------------------------------------------------- |
| `Unauthorized`            | Caller is not the expected party for this action.                    |
| `InvalidStatus`           | Contract is not in the required state.                               |
| `DeadlineNotElapsed`      | Project deadline has not passed yet.                                 |
| `DeadlineElapsed`         | Project deadline has already passed.                                 |
| `WindowNotElapsed`        | Acceptance or warranty window has not expired.                       |
| `WindowElapsed`           | Acceptance window has already closed.                                |
| `InvalidBufferFactor`     | Buffer factor is below the minimum of 1.1×.                          |
| `InvalidAcceptanceWindow` | Acceptance window is below 48 hours.                                 |
| `InvalidArbitrationFee`   | Fee is zero or exceeds 50%.                                          |
| `InvalidHoldBack`         | Hold-back is outside the allowed range.                              |
| `InvalidWarrantyPeriod`   | Hold-back and warranty period must both be set or both be zero.      |
| `InsufficientFunds`       | No ETH sent for ETH escrow, or no token amount for ERC-20 escrow.    |
| `ZeroAddress`             | Freelancer address is the zero address.                              |
| `SelfContract`            | Client cannot hire themselves.                                       |
| `EthTransferFailed`       | Low-level ETH transfer returned false.                               |
| `TokenTransferFailed`     | ERC-20 transfer returned false.                                      |
| `InvalidTokenParams`      | Mismatch between token field and funding (e.g. ETH sent with token). |
| `InvalidSignature`        | ECDSA recovery does not match the freelancer's address.              |
| `RatingOutOfRange`        | Score is outside 1-100.                                              |
| `RatingAlreadySubmitted`  | This party has already rated for this contract.                      |
| `ContractNotFinished`     | Contract has not reached `APPROVED` or `RESOLVED`.                   |
| `AlreadySet`              | One-time setter was already called.                                  |

---

## Arbitration.sol

Manages the commit-reveal juror voting process and fee pool distribution.

### Immutables

| Name             | Type             | Description                                                     |
| ---------------- | ---------------- | --------------------------------------------------------------- |
| `TRUST_LEDGER`   | `ITrustLedger`   | TrustLedger contract; the only caller allowed to open disputes. |
| `JUROR_REGISTRY` | `IJurorRegistry` | JurorRegistry that tracks eligibility and handles slashing.     |

### Constants

| Name                         | Value    | Description                                         |
| ---------------------------- | -------- | --------------------------------------------------- |
| `COMMIT_DURATION`            | 72 hours | Length of the commit phase.                         |
| `REVEAL_DURATION`            | 72 hours | Length of the reveal phase.                         |
| `APPEAL_WINDOW`              | 72 hours | Time window to file an appeal.                      |
| `MIN_JURORS`                 | 3        | Minimum commits to advance to reveal.               |
| `BASE_MAX_JURORS`            | 5        | Maximum jurors for first-instance disputes.         |
| `APPEAL_BOND_MULTIPLIER_BPS` | 15_000   | Appeal bond = 1.5× fee pool.                        |
| `MAJORITY_THRESHOLD`         | 20       | Max pct-point deviation from median to be majority. |
| `SLASH_BPS`                  | 1000     | Slash rate for minority/no-reveal (10%).            |
| `BPS_DENOMINATOR`            | 10_000   | Basis-point denominator.                            |

---

### Functions

#### `openDispute`

```solidity
function openDispute(
    uint256 contractId,
    address client,
    address freelancer,
    uint256 contractAmount,
    uint256 feePool
) external payable onlyTrustLedger returns (uint256 disputeId)
```

Opens a new dispute. Called only by TrustLedger with the fee pool ETH as `msg.value`. Requests VRF randomness if a coordinator is configured.

Emits `DisputeOpened`.

---

#### `commitVote`

```solidity
function commitVote(uint256 disputeId, bytes32 commitment) external
```

Submits a hashed vote. `commitment = keccak256(abi.encodePacked(disputeId, msg.sender, completionPct, salt))`. In VRF mode, only pre-selected jurors may commit. In legacy mode, any eligible juror may self-select up to `maxJurors`.

Emits `VoteCommitted`.

---

#### `revealVote`

```solidity
function revealVote(uint256 disputeId, uint256 completionPct, bytes32 salt) external
```

Reveals a committed vote. Re-derives the commitment hash and reverts if it does not match the stored value.

Emits `VoteRevealed`.

---

#### `advanceToReveal`

```solidity
function advanceToReveal(uint256 disputeId) external
```

Advances the dispute from `COMMIT` to `REVEAL` phase. Callable by anyone. Requires either the commit deadline to have passed or at least `MIN_JURORS` committed.

---

#### `finalizeDispute`

```solidity
function finalizeDispute(uint256 disputeId) external
```

Finalizes the dispute after the reveal window closes. Computes the median ruling, classifies majority and minority jurors, slashes minorities and non-revealers, and opens the appeal window.

Emits `DisputeFinalized`.

---

#### `appeal`

```solidity
function appeal(uint256 disputeId) external payable
```

Files an appeal within the appeal window. Requires a bond of `feePool × 1.5`. Creates a new appeal dispute with double the juror panel. Original jurors are blocked from the appeal panel.

Emits `Appealed` and `AppealDisputeOpened`.

---

#### `claimReward`

```solidity
function claimReward(uint256 disputeId) external
```

Majority juror claims an equal share of the fee pool. Callable after the appeal window has closed.

Emits `RewardClaimed`.

---

#### `executeRuling`

```solidity
function executeRuling(uint256 disputeId) external
```

Calls `TrustLedger.executeRuling()` with the finalized ruling. Callable by anyone after finalization and the appeal window closing.

---

#### `initVrfCoordinator`

```solidity
function initVrfCoordinator(address vrf_) external
```

One-time setter. Wires in a Chainlink VRF v2 coordinator. Once set, new disputes will request randomness for juror selection.

---

#### `fulfillRandomWords`

```solidity
function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external
```

VRF coordinator callback. Uses random values to pre-select jurors from the eligible pool. Only callable by the registered VRF coordinator address.

---

#### `getDispute`

```solidity
function getDispute(uint256 disputeId) external view returns (Dispute memory)
```

Returns the full `Dispute` struct.

---

#### `getJurors`

```solidity
function getJurors(uint256 disputeId) external view returns (address[] memory)
```

Returns the list of jurors who committed to the dispute.

---

#### `isMajority`

```solidity
function isMajority(uint256 disputeId, address juror) external view returns (bool)
```

Returns whether the juror voted in the majority for the given dispute.

---

### Events

| Event                 | Parameters                                        |
| --------------------- | ------------------------------------------------- |
| `DisputeOpened`       | `disputeId`, `contractId`, `client`, `freelancer` |
| `VoteCommitted`       | `disputeId`, `juror`                              |
| `VoteRevealed`        | `disputeId`, `juror`, `completionPct`             |
| `DisputeFinalized`    | `disputeId`, `ruling`                             |
| `Appealed`            | `disputeId`, `appealer`, `bond`                   |
| `AppealDisputeOpened` | `appealDisputeId`, `originalDisputeId`            |
| `RewardClaimed`       | `disputeId`, `juror`, `amount`                    |

### Errors

| Error                    | Trigger                                                     |
| ------------------------ | ----------------------------------------------------------- |
| `OnlyTrustLedger`        | Caller is not the TrustLedger contract.                     |
| `NotInCommitPhase`       | Operation requires the `COMMIT` or `APPEAL_COMMIT` phase.   |
| `NotInRevealPhase`       | Operation requires the `REVEAL` or `APPEAL_REVEAL` phase.   |
| `PhaseNotEnded`          | Trying to advance before the phase deadline has elapsed.    |
| `PhaseEnded`             | Trying to commit or reveal after the deadline.              |
| `NotAJuror`              | Caller has not committed to this dispute.                   |
| `AlreadyCommitted`       | Juror is attempting to commit a second time.                |
| `AlreadyRevealed`        | Juror is attempting to reveal a second time.                |
| `InvalidCommitment`      | Revealed values do not match the stored commitment hash.    |
| `JurorSlotsFilled`       | All juror slots are already filled.                         |
| `NotEligible`            | Caller does not meet juror eligibility requirements.        |
| `DisputeNotFinalized`    | Dispute has not yet been finalized.                         |
| `AppealWindowElapsed`    | The 72-hour appeal window has already closed.               |
| `AppealWindowNotElapsed` | The appeal window is still open.                            |
| `AlreadyAppealed`        | This dispute already has a pending appeal.                  |
| `InsufficientAppealBond` | Sent ETH is less than the required 1.5× bond.               |
| `NotParty`               | Only the client or freelancer may file an appeal.           |
| `RewardAlreadyClaimed`   | Juror has already claimed their reward.                     |
| `NotMajority`            | Juror voted in the minority and is not eligible for reward. |
| `ExcludedJuror`          | Party addresses and original jurors cannot vote in appeals. |

---

## JurorRegistry.sol

Tracks staked jurors, their eligibility, and reputation. Only `Arbitration` may call the lock/unlock/slash functions.

### Constants

| Name                | Value    | Description                                   |
| ------------------- | -------- | --------------------------------------------- |
| `MIN_STAKE`         | 0.01 ETH | Minimum stake to register and stay active.    |
| `STAKE_LOCK_PERIOD` | 7 days   | Lock period after staking before eligibility. |
| `SLASH_BPS`         | 1000     | Slash rate (10%).                             |
| `BPS_DENOMINATOR`   | 10_000   | Basis-point denominator.                      |

### State

| Name          | Type      | Description                                                                              |
| ------------- | --------- | ---------------------------------------------------------------------------------------- |
| `arbitration` | `address` | Address of the Arbitration contract; the only caller allowed to lock, unlock, and slash. |

---

### Functions

#### `register`

```solidity
function register() external payable
```

Registers the sender as a juror by staking ETH. Requires `msg.value >= MIN_STAKE`. Sets `stakeUnlockTime = block.timestamp + 7 days`. Eligibility activates after the lock period elapses.

Emits `Registered`.

---

#### `addStake`

```solidity
function addStake() external payable
```

Adds more stake to an existing registration. Resets the 7-day lock period.

Emits `StakeAdded`.

---

#### `unstake`

```solidity
function unstake(uint256 amount) external
```

Withdraws `amount` of ETH. Requires the lock period to have elapsed and no active disputes. Deactivates the juror if remaining stake falls below `MIN_STAKE`.

Emits `Unstaked`.

---

#### `lockForDispute`

```solidity
function lockForDispute(address juror) external
```

Increments the juror's `activeDisputes` counter. Called only by `Arbitration` when the juror commits a vote.

---

#### `unlockFromDispute`

```solidity
function unlockFromDispute(address juror) external
```

Decrements `activeDisputes` and increments `disputesParticipated`. Called only by `Arbitration` at finalization.

---

#### `slash`

```solidity
function slash(address juror, uint256 amount) external
```

Deducts `amount` from the juror's stake (capped at current stake). Increments `minorityVotes`. Reduces `reputation` by 10 (flooring at 0). Deactivates the juror if stake falls below `MIN_STAKE`. Called only by `Arbitration`.

Emits `Slashed` and `ReputationUpdated`.

---

#### `isEligible`

```solidity
function isEligible(address juror) external view returns (bool)
```

Returns `true` if the juror is `active`, `stake >= MIN_STAKE`, and the lock period has elapsed.

---

#### `getJuror`

```solidity
function getJuror(address juror) external view returns (JurorInfo memory)
```

Returns the full `JurorInfo` struct for the given address.

---

#### `getJurorList`

```solidity
function getJurorList() external view returns (address[] memory)
```

Returns all addresses that have ever called `register()`.

---

#### `eligibleJurorCount`

```solidity
function eligibleJurorCount() external view returns (uint256 count)
```

Counts currently eligible jurors by iterating the full registry.

---

### `JurorInfo` struct

```solidity
struct JurorInfo {
    address addr;
    uint256 stake;
    uint256 stakeUnlockTime;
    uint256 reputation;          // starts at 100; decreases by 10 per minority vote
    uint256 disputesParticipated;
    uint256 minorityVotes;
    bool    active;
    uint256 activeDisputes;
}
```

---

### Events

| Event               | Parameters                |
| ------------------- | ------------------------- |
| `Registered`        | `juror`, `stake`          |
| `StakeAdded`        | `juror`, `added`, `total` |
| `Unstaked`          | `juror`, `amount`         |
| `Slashed`           | `juror`, `amount`         |
| `ReputationUpdated` | `juror`, `reputation`     |

### Errors

| Error               | Trigger                                                    |
| ------------------- | ---------------------------------------------------------- |
| `AlreadyRegistered` | `register()` called by an already-active juror.            |
| `NotRegistered`     | `addStake` or `unstake` called by an unregistered address. |
| `StakeBelowMinimum` | ETH sent is less than `MIN_STAKE`.                         |
| `StakeLocked`       | Trying to unstake before the lock period has elapsed.      |
| `HasActiveDisputes` | Trying to unstake while locked in an active dispute.       |
| `InsufficientStake` | Trying to withdraw more than the current stake balance.    |
| `OnlyArbitration`   | Caller is not the Arbitration contract.                    |
| `ZeroAddress`       | Constructor called with the zero address.                  |
| `EthTransferFailed` | Low-level ETH transfer to the juror failed.                |

---

## ReputationRegistry.sol

Accumulates on-chain ratings for TrustLedger participants. Only `TrustLedger` may write; anyone may read.

### Immutables

| Name           | Type      | Description                                |
| -------------- | --------- | ------------------------------------------ |
| `TRUST_LEDGER` | `address` | The only address allowed to call `rate()`. |

---

### Functions

#### `rate`

```solidity
function rate(address user, uint8 score) external
```

Records a rating. `score` must be in `[1, 100]`. Callable only by `TRUST_LEDGER`.

Emits `Rated`.

---

#### `averageRating`

```solidity
function averageRating(address user)
    external view returns (uint256 numerator, uint256 denominator)
```

Returns the cumulative score sum and rating count. Compute the average as `numerator / denominator` (verify `denominator > 0` before dividing).

---

### Events

| Event   | Parameters      |
| ------- | --------------- |
| `Rated` | `user`, `score` |

### Errors

| Error             | Trigger                                   |
| ----------------- | ----------------------------------------- |
| `OnlyTrustLedger` | Caller is not the `TRUST_LEDGER` address. |
| `InvalidScore`    | Score is 0 or greater than 100.           |
| `ZeroAddress`     | Constructor called with the zero address. |
