# Contract Reference

Full public API for all five TrustLedger contracts. All contracts are deployed
on Ethereum Sepolia. Addresses are written to
`artifacts/deployed-addresses.json` after each deploy (Hardhat
`scripts/deploy.ts` includes `ReputationRegistry` and calls
`initReputationRegistry`).

---

## TrustLedger.sol

The core escrow engine. Holds ETH or ERC-20 tokens between a client and a
freelancer and enforces the contract lifecycle.

### Immutables

| Name          | Type           | Description                                                      |
| ------------- | -------------- | ---------------------------------------------------------------- |
| `ARBITRATION` | `IArbitration` | Arbitration contract that receives fee pools and issues rulings. |

### State

| Name                 | Type                    | Description                                                                   |
| -------------------- | ----------------------- | ----------------------------------------------------------------------------- |
| `nextId`             | `uint256`               | Auto-incrementing escrow contract ID counter.                                 |
| `priceFeed`          | `AggregatorV3Interface` | Optional Chainlink ETH/USD feed; zero if unset.                               |
| `reputationRegistry` | `IReputationRegistry`   | Optional reputation registry; zero if unset.                                  |
| `pauser`             | `address`               | Optional address authorized to pause/unpause `createContract`; zero if unset. |

### Constants

| Name                          | Value    | Description                                                                 |
| ----------------------------- | -------- | --------------------------------------------------------------------------- |
| `MIN_ACCEPTANCE_WINDOW`       | 48 hours | Minimum review period after work submission.                                |
| `MIN_BUFFER_FACTOR`           | 1100     | Minimum deadline multiplier (1.1×).                                         |
| `MAX_ARBITRATION_FEE_BPS`     | 5000     | Maximum juror fee (50%).                                                    |
| `MIN_HOLD_BACK_BPS`           | 500      | Minimum warranty hold-back (5%).                                            |
| `MAX_HOLD_BACK_BPS`           | 1500     | Maximum warranty hold-back (15%).                                           |
| `BPS_DENOMINATOR`             | 10_000   | Basis-point denominator.                                                    |
| `FRIVOLOUS_DISPUTE_THRESHOLD` | 80       | Ruling ≥ this value auto-penalizes the client's reputation (score = 1).     |
| `POOR_WORK_THRESHOLD`         | 20       | Ruling ≤ this value auto-penalizes the freelancer's reputation (score = 1). |

---

### Data Structures

#### `Status` enum

The escrow lifecycle state, stored on-chain as a `uint8`. See
[Architecture](ARCHITECTURE.md) for the full state machine.

| Value | Name        | Meaning                                                                                         |
| ----- | ----------- | ----------------------------------------------------------------------------------------------- |
| 0     | `PENDING`   | Contract created; freelancer has not responded yet.                                             |
| 1     | `ACTIVE`    | Freelancer accepted; project deadline is counting down.                                         |
| 2     | `SUBMITTED` | Freelancer submitted proof-of-work; acceptance window running.                                  |
| 3     | `APPROVED`  | Client approved, or the acceptance window elapsed (auto-release).                               |
| 4     | `DISPUTED`  | Client opened a dispute; awaiting arbitration.                                                  |
| 5     | `RESOLVED`  | Arbitration finalized and the ruling was executed.                                              |
| 6     | `CANCELLED` | Freelancer rejected, client cancelled while pending, or client reclaimed after a deadline miss. |

#### `EscrowContract` struct

Returned by `getContract(id)`. One per freelance agreement. Fields are ordered
to minimise EVM storage slots.

```solidity
struct EscrowContract {
    address client;             // who hired the freelancer and deposited the funds
    uint16  arbitrationFeeBps;  // juror fee, in basis points
    uint16  holdBackBps;        // warranty hold-back (0, or 500-1500)
    Status  status;             // current lifecycle state (see enum above)
    address freelancer;         // who does the work and receives payment
    uint64  warrantyDeadline;   // set on approval: approval time + warrantyPeriod
    uint64  projectDeadline;    // unix timestamp the project is due
    uint64  acceptanceWindow;   // client review window after submission (>= 48h)
    uint64  acceptanceDeadline; // set on submission: submission time + acceptanceWindow
    uint64  warrantyPeriod;     // how long the hold-back stays locked
    uint256 amount;             // ETH (wei) or token units held in escrow
    uint256 holdBackAmount;     // actual amount withheld (holdBackBps x amount)
    uint256 arbitrationId;      // dispute ID in Arbitration (set on dispute)
    bytes32 contractHash;       // keccak256 of the off-chain agreement document
    string  contractURI;        // IPFS link to the full document
    bytes32 proofOfWorkHash;    // keccak256 of the deliverable (set on submission)
    string  proofOfWorkURI;     // IPFS link to the deliverable
    address token;              // ERC-20 token; address(0) = native ETH escrow
    uint256 usdValueAtCreation; // ETH/USD at creation (8 decimals); 0 if unset/ERC-20
    uint256 previousContractId; // amendment predecessor; type(uint256).max = original
}
```

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

Creates an escrow contract and locks funds. For ETH: set `token = address(0)`,
`tokenAmount = 0`, send ETH as `msg.value`. For ERC-20: set `token` to the token
address, `tokenAmount` to the amount, `msg.value = 0` (pre-approve the contract
first).

`projectDeadline = block.timestamp + (estimatedDuration × bufferFactor) / 1000`

Reverts with `EnforcedPause` when the contract is paused. Call `unpause()`
first.

`contractHash` must be the `keccak256` of the document bytes (not the URI
string) and must be non-zero - the contract enforces
`contractHash != bytes32(0)`. Computing the hash off-chain before uploading to
IPFS ensures on-chain tamper detection covers file content, not just the
pointer. `contractURI` must be a non-empty IPFS URI (e.g. `ipfs://<CID>`); both
are required - passing a zero hash or empty URI reverts with `EmptyHash` or
`EmptyURI`.

Emits `ContractCreated`.

---

#### `acceptContract`

```solidity
function acceptContract(uint256 id, uint8 v, bytes32 r, bytes32 s) external
```

Freelancer accepts the contract by submitting an EIP-191 ECDSA signature over
`keccak256(abi.encodePacked(id, freelancerAddress))`. The contract recovers the
signer and reverts if it does not match `freelancer`. Transitions status to
`ACTIVE`.

Emits `ContractAccepted`.

---

#### `rejectContract`

```solidity
function rejectContract(uint256 id) external
```

Freelancer rejects the contract. Funds are returned to the client. Status
transitions to `CANCELLED`.

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

Freelancer submits a `keccak256` hash of the deliverable and an IPFS URI. Both
are enforced: `powHash` must be non-zero and `powURI` must be non-empty -
passing either as zero/empty reverts with `EmptyHash` or `EmptyURI`. The hash
must be computed from the actual file bytes before upload; this lets the client
(and any future auditor) independently verify the delivered file matches what
was committed on-chain. Sets
`acceptanceDeadline = block.timestamp + acceptanceWindow`. Status transitions to
`SUBMITTED`.

Emits `ProofSubmitted`.

---

#### `approveWork`

```solidity
function approveWork(uint256 id) external
```

Client approves submitted work. Releases `amount − holdBackAmount` to the
freelancer. If `holdBackBps > 0`, sets `warrantyDeadline` and retains
`holdBackAmount`. Status transitions to `APPROVED`.

Emits `WorkApproved` and `FundsReleased`.

---

#### `disputeWork`

```solidity
function disputeWork(uint256 id) external
```

Client opens a dispute. Forwards `amount × arbitrationFeeBps / 10_000` ETH (the
fee pool) to `Arbitration.openDispute()`. Status transitions to `DISPUTED`.

Emits `WorkDisputed`.

---

#### `claimAfterDeadlineMiss`

```solidity
function claimAfterDeadlineMiss(uint256 id) external
```

Client reclaims funds if the freelancer misses the project deadline without
submitting work. Status transitions to `CANCELLED`.

Emits `ContractCancelled`.

---

#### `claimAfterAcceptanceWindow`

```solidity
function claimAfterAcceptanceWindow(uint256 id) external
```

Freelancer auto-claims payment if the client does not respond within the
acceptance window. Status transitions to `APPROVED`.

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

Client cancels a contract that is still `PENDING` (before the freelancer
responds). Funds returned to client. Status transitions to `CANCELLED`.

Emits `ContractCancelled`.

---

#### `linkAmendment`

```solidity
function linkAmendment(uint256 newId, uint256 previousId) external
```

Links a `PENDING` replacement contract to its `CANCELLED` predecessor,
establishing an on-chain amendment version history. The caller must be the
client on both contracts. `previousId` must be `CANCELLED`; `newId` must be
`PENDING` and not already linked.

Amendment flow:

1. `cancelPending(oldId)` - invalidates the existing contract, returns funds.
2. `createContract(...)` - creates the replacement with updated terms and a new
   `contractHash`.
3. `linkAmendment(newId, oldId)` - records the on-chain link; the
   `previousContractId` field on the new contract becomes `oldId`.

Each cancelled contract produces a new contract ID with a distinct hash, so the
full renegotiation history is permanently visible on-chain.

Emits `ContractAmended`.

---

#### `submitRating`

```solidity
function submitRating(uint256 id, uint8 score) external
```

Submits a rating (1-100) for the counterparty. Clients rate freelancers;
freelancers rate clients. Each party may rate once per contract. No-ops silently
if `ReputationRegistry` has not been configured. Only callable after status is
`APPROVED` or `RESOLVED`.

Emits `RatingSubmitted`.

---

#### `executeRuling`

```solidity
function executeRuling(uint256 id, uint256 completionPct) external
```

Called only by `Arbitration`. Distributes escrow funds based on the
juror-determined `completionPct` (0-100). Uses the proportional fee split
formula. Status transitions to `RESOLVED`.

**Automatic reputation penalties** (requires `ReputationRegistry` to be
configured):

- `completionPct >= 80`: the client is auto-rated with score 1 (dispute was
  frivolous). Sets `_clientRated[id]` so the client cannot also call
  `submitRating`.
- `completionPct <= 20`: the freelancer is auto-rated with score 1 (work was
  clearly deficient). Sets `_freelancerRated[id]` similarly.
- `20 < completionPct < 80`: no automatic penalty; either party may still call
  `submitRating`.

Emits `RulingExecuted` and `FundsReleased`.

---

#### `initPriceFeed`

```solidity
function initPriceFeed(address feed_) external
```

One-time setter. Wires in a Chainlink `AggregatorV3Interface`. Once set, cannot
be changed.

---

#### `initReputationRegistry`

```solidity
function initReputationRegistry(address registry_) external
```

One-time setter. Wires in a `ReputationRegistry`. Once set, cannot be changed.

---

#### `initPauser`

```solidity
function initPauser(address pauser_) external
```

One-time setter. Designates the address authorized to call `pause()` and
`unpause()`. Once set, cannot be changed. If never called, pause functionality
is permanently unavailable.

---

#### `pause`

```solidity
function pause() external
```

Pauses `createContract`, blocking new escrows from being opened. All in-flight
lifecycle functions (`acceptContract`, `submitProofOfWork`, `approveWork`,
`disputeWork`, claim functions) remain active so that funds already in escrow
can always exit. Reverts with `NotPauser` if the caller is not `pauser`.

Emits `Paused` (OpenZeppelin standard event).

---

#### `unpause`

```solidity
function unpause() external
```

Restores `createContract` to normal operation. Reverts with `NotPauser` if the
caller is not `pauser`.

Emits `Unpaused` (OpenZeppelin standard event).

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
| `ContractAmended`      | `newId`, `previousId`                  |

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
| `NotPauser`               | Caller is not the designated pauser address.                         |
| `EmptyHash`               | `contractHash` or `proofOfWorkHash` is `bytes32(0)`.                 |
| `EmptyURI`                | `contractURI` or `proofOfWorkURI` is an empty string.                |
| `InvalidPreviousContract` | `previousId` is not `CANCELLED`, or caller is not its client.        |

---

## Arbitration.sol

Manages the commit-reveal juror voting process and fee pool distribution.

### Immutables

| Name             | Type             | Description                                                     |
| ---------------- | ---------------- | --------------------------------------------------------------- |
| `TRUST_LEDGER`   | `ITrustLedger`   | TrustLedger contract; the only caller allowed to open disputes. |
| `JUROR_REGISTRY` | `IJurorRegistry` | JurorRegistry that tracks eligibility and handles slashing.     |

### Constants

| Name                         | Value    | Description                                                                  |
| ---------------------------- | -------- | ---------------------------------------------------------------------------- |
| `COMMIT_DURATION`            | 72 hours | Length of the commit phase.                                                  |
| `REVEAL_DURATION`            | 72 hours | Length of the reveal phase.                                                  |
| `APPEAL_WINDOW`              | 72 hours | Time window to file an appeal.                                               |
| `MIN_JURORS`                 | 3        | Minimum commits to advance to reveal.                                        |
| `BASE_MAX_JURORS`            | 5        | Maximum jurors for first-instance disputes.                                  |
| `APPEAL_BOND_MULTIPLIER_BPS` | 15_000   | Appeal bond = 1.5× fee pool.                                                 |
| `MAJORITY_THRESHOLD`         | 20       | Max pct-point deviation from median to be in the majority.                   |
| `SLASH_BPS`                  | 1000     | Standard slash rate for minority/no-reveal votes (10%).                      |
| `BPS_DENOMINATOR`            | 10_000   | Basis-point denominator.                                                     |
| `SEVERE_MINORITY_THRESHOLD`  | 30       | Deviation above this triggers the severe slash rate instead of the standard. |
| `SEVERE_SLASH_BPS`           | 2000     | Severe slash rate for extreme outlier votes (20%).                           |

---

### Data Structures

#### `Phase` enum

Tracks which step of the voting process a dispute is in. `COMMIT`/`REVEAL` apply
to first-instance disputes; the `APPEAL_*` variants apply to re-tried disputes
after an appeal.

| Value | Name               | Meaning                                                         |
| ----- | ------------------ | --------------------------------------------------------------- |
| 0     | `COMMIT`           | Jurors submit hidden vote commitments.                          |
| 1     | `REVEAL`           | Jurors reveal their actual votes.                               |
| 2     | `FINALIZED`        | Median computed; appeal window open.                            |
| 3     | `APPEALED`         | An appeal was filed; the dispute is frozen pending the outcome. |
| 4     | `APPEAL_COMMIT`    | Appeal dispute: commit phase.                                   |
| 5     | `APPEAL_REVEAL`    | Appeal dispute: reveal phase.                                   |
| 6     | `APPEAL_FINALIZED` | Appeal dispute finalized; the ruling is binding.                |

#### `Dispute` struct

Returned by `getDispute(disputeId)`. Both first-instance and appeal disputes
share the same store, distinguished by `parentDisputeId`.

```solidity
struct Dispute {
    uint256 contractId;      // TrustLedger escrow ID this dispute belongs to
    address client;          // copied from TrustLedger for convenience
    Phase   phase;           // current voting phase (see enum above)
    bool    finalized;       // true after finalizeDispute() succeeds
    bool    appealed;        // true after appeal() is filed
    bool    vrfFulfilled;    // true once VRF randomness arrived and jurors were pre-selected
    uint64  phaseDeadline;   // unix timestamp when the current phase expires
    address freelancer;      // copied from TrustLedger for convenience
    uint256 contractAmount;  // total escrow value (reference only; not held here)
    uint256 feePool;         // ETH held by this contract as the juror reward pool
    uint256 ruling;          // finalized completionPct (0-100); type(uint256).max = unset
    address appealer;        // who filed the appeal (client or freelancer)
    uint256 appealBond;      // ETH the appealer paid as bond
    uint256 appealDisputeId; // disputeId of the follow-up appeal dispute (max = none)
    uint256 parentDisputeId; // disputeId of the original dispute (max = this is original)
    uint256 maxJurors;       // max juror slots; doubles with each appeal
    uint256 jurorCount;      // how many jurors have committed so far
}
```

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

Opens a new dispute. Called only by TrustLedger with the fee pool ETH as
`msg.value`. Requests VRF randomness if a coordinator is configured.

Emits `DisputeOpened`.

---

#### `commitVote`

```solidity
function commitVote(uint256 disputeId, bytes32 commitment) external
```

Submits a hashed vote.
`commitment = keccak256(abi.encodePacked(disputeId, msg.sender, completionPct, salt))`.
In VRF mode, only pre-selected jurors may commit. In legacy mode, any eligible
juror may self-select up to `maxJurors`.

Emits `VoteCommitted`.

---

#### `revealVote`

```solidity
function revealVote(uint256 disputeId, uint256 completionPct, bytes32 salt) external
```

Reveals a committed vote. Re-derives the commitment hash and reverts if it does
not match the stored value.

Emits `VoteRevealed`.

---

#### `advanceToReveal`

```solidity
function advanceToReveal(uint256 disputeId) external
```

Advances the dispute from `COMMIT` to `REVEAL` phase. Callable by anyone.
Requires either the commit deadline to have passed or at least `MIN_JURORS`
committed.

---

#### `finalizeDispute`

```solidity
function finalizeDispute(uint256 disputeId) external
```

Finalizes the dispute after the reveal window closes. Computes the median
ruling, classifies majority and minority jurors, slashes minorities and
non-revealers, and opens the appeal window.

**Tiered slashing** is applied based on how far a minority vote deviates from
the median:

- Deviation ≤ 30 pct-points: standard slash (10% of stake).
- Deviation > 30 pct-points: severe slash (20% of stake). Extreme outliers -
  characteristic of bribed or colluding jurors - are penalized more heavily.

Non-reveal jurors always receive the standard slash (10%).

Emits `DisputeFinalized`.

---

#### `appeal`

```solidity
function appeal(uint256 disputeId) external payable
```

Files an appeal within the appeal window. Requires a bond of `feePool × 1.5`.
Creates a new appeal dispute with double the juror panel. Original jurors are
blocked from the appeal panel.

Emits `Appealed` and `AppealDisputeOpened`.

---

#### `claimReward`

```solidity
function claimReward(uint256 disputeId) external
```

Majority juror claims an equal share of the fee pool. Callable after the appeal
window has closed.

Emits `RewardClaimed`.

---

#### `executeRuling`

```solidity
function executeRuling(uint256 disputeId) external
```

Calls `TrustLedger.executeRuling()` with the finalized ruling. Callable by
anyone after finalization and the appeal window closing.

---

#### `initVrfCoordinator`

```solidity
function initVrfCoordinator(address vrf_) external
```

One-time setter. Wires in a Chainlink VRF v2 coordinator. Once set, new disputes
will request randomness for juror selection.

---

#### `fulfillRandomWords`

```solidity
function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external
```

VRF coordinator callback. Uses random values to pre-select jurors from the
eligible pool. Only callable by the registered VRF coordinator address.

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

Tracks staked jurors, their eligibility, and reputation. Only `Arbitration` may
call the lock/unlock/slash functions.

### Constants

| Name                | Value    | Description                                                                                          |
| ------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `MIN_STAKE`         | 0.01 ETH | Minimum stake to register and stay active.                                                           |
| `STAKE_LOCK_PERIOD` | 7 days   | Lock period after staking before eligibility activates.                                              |
| `SLASH_BPS`         | 1000     | Slash rate applied by Arbitration (10%).                                                             |
| `BPS_DENOMINATOR`   | 10_000   | Basis-point denominator.                                                                             |
| `MIN_REPUTATION`    | 20       | Minimum reputation score required to remain eligible. Jurors below this are excluded from selection. |
| `JUROR_COOLDOWN`    | 7 days   | Mandatory rest period after dispute participation before a juror is re-eligible.                     |

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

Registers the sender as a juror by staking ETH. Requires
`msg.value >= MIN_STAKE`. Sets `stakeUnlockTime = block.timestamp + 7 days`.
Eligibility activates after the lock period elapses.

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

Withdraws `amount` of ETH. Requires the lock period to have elapsed and no
active disputes. Deactivates the juror if remaining stake falls below
`MIN_STAKE`.

Emits `Unstaked`.

---

#### `lockForDispute`

```solidity
function lockForDispute(address juror) external
```

Increments the juror's `activeDisputes` counter. Called only by `Arbitration`
when the juror commits a vote.

---

#### `unlockFromDispute`

```solidity
function unlockFromDispute(address juror) external
```

Decrements `activeDisputes`, increments `disputesParticipated`, and sets
`_jurorCooldown[juror] = block.timestamp + JUROR_COOLDOWN`. The juror will not
pass `isEligible()` until the 7-day cooldown expires. Called only by
`Arbitration` at finalization.

---

#### `slash`

```solidity
function slash(address juror, uint256 amount) external
```

Deducts `amount` from the juror's stake (capped at current stake). Increments
`minorityVotes`. Reduces `reputation` by 10 (flooring at 0). Deactivates the
juror if stake falls below `MIN_STAKE`. Called only by `Arbitration`.

Emits `Slashed` and `ReputationUpdated`.

---

#### `isEligible`

```solidity
function isEligible(address juror) external view returns (bool)
```

Returns `true` if all four conditions hold:

- `active == true`
- `stake >= MIN_STAKE`
- `stakeUnlockTime` has elapsed
- `reputation >= MIN_REPUTATION`
- post-dispute `JUROR_COOLDOWN` has elapsed

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

Counts currently eligible jurors by iterating the full registry. Applies the
same four-condition check as `isEligible()`.

---

#### `getCooldownUntil`

```solidity
function getCooldownUntil(address juror) external view returns (uint64)
```

Returns the unix timestamp after which the juror is re-eligible to vote. Returns
`0` for jurors who have never participated in a dispute.

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

Accumulates on-chain ratings for TrustLedger participants. Only `TrustLedger`
may write; anyone may read.

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

Records a rating. `score` must be in `[1, 100]`. Callable only by
`TRUST_LEDGER`.

Emits `Rated`.

---

#### `averageRating`

```solidity
function averageRating(address user)
    external view returns (uint256 numerator, uint256 denominator)
```

Returns the cumulative score sum and rating count. Compute the average as
`numerator / denominator` (verify `denominator > 0` before dividing).

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

---

## Example Interactions

Practical call sequences for the two main flows. Addresses come from
`artifacts/deployed-addresses.json`. The examples use Foundry's
[`cast`](https://book.getfoundry.sh/cast/) and [viem](https://viem.sh); the demo
scripts in [Contributing](CONTRIBUTING.md) wrap the same calls end-to-end.

!!! note "Hashes and URIs are required" `contractHash`/`proofOfWorkHash` must be
the `keccak256` of the actual file bytes (computed off-chain before upload) and
non-zero, and `contractURI`/`proofOfWorkURI` must be non-empty IPFS URIs.
Zero/empty values revert with `EmptyHash` / `EmptyURI`.

### Happy path (client creates → freelancer accepts → submits → client approves)

```bash
TL=0x...                       # TrustLedger address
RPC=$SEPOLIA_RPC_URL
FREELANCER=0x...
HASH=$(cast keccak "$(cat agreement.pdf)")   # keccak256 of the document bytes

# 1. Client creates a 0.5 ETH escrow.
#    args: freelancer, contractHash, contractURI, estimatedDuration (7d),
#          bufferFactor (1.1x), acceptanceWindow (48h), arbitrationFeeBps (5%),
#          holdBackBps (10%), warrantyPeriod (14d), token (ETH=0), tokenAmount (0)
cast send "$TL" \
  "createContract(address,bytes32,string,uint256,uint256,uint256,uint16,uint16,uint64,address,uint256)" \
  "$FREELANCER" "$HASH" "ipfs://<CID>" \
  604800 1100 172800 500 1000 1209600 \
  0x0000000000000000000000000000000000000000 0 \
  --value 0.5ether --rpc-url "$RPC" --private-key "$CLIENT_KEY"
# -> emits ContractCreated(id, client, freelancer, amount); first id is 1
```

The freelancer accepts with a wallet signature over
`keccak256(abi.encodePacked(id, freelancerAddress))`, signed with the EIP-191
prefix (`eth_sign` / `personal_sign`). viem applies the prefix automatically
when signing a `raw` hash:

```ts
import {
  createWalletClient,
  http,
  encodePacked,
  keccak256,
  hexToSignature,
} from "viem";

const id = 1n;
const innerHash = keccak256(
  encodePacked(["uint256", "address"], [id, freelancer]),
);
const signature = await walletClient.signMessage({
  message: { raw: innerHash },
});
const { v, r, s } = hexToSignature(signature);

// 2. Freelancer accepts -> status ACTIVE
await walletClient.writeContract({
  address: TL,
  abi,
  functionName: "acceptContract",
  args: [id, Number(v), r, s],
});
```

```bash
# 3. Freelancer submits the deliverable -> status SUBMITTED, starts the 48h acceptance window
POW=$(cast keccak "$(cat deliverable.zip)")
cast send "$TL" "submitProofOfWork(uint256,bytes32,string)" \
  1 "$POW" "ipfs://<deliverable-CID>" --rpc-url "$RPC" --private-key "$FREELANCER_KEY"

# 4. Client approves -> releases amount - holdBack, status APPROVED
cast send "$TL" "approveWork(uint256)" 1 --rpc-url "$RPC" --private-key "$CLIENT_KEY"

# Read the full struct at any point
cast call "$TL" "getContract(uint256)" 1 --rpc-url "$RPC"
```

If the client never responds, the freelancer can call
`claimAfterAcceptanceWindow(1)` once the 48-hour window elapses. After the
warranty period, the freelancer claims the hold-back with
`claimWarrantyFunds(1)`.

### Dispute path (client disputes → jurors commit/reveal → ruling executes)

```bash
ARB=0x...   # Arbitration address

# 1. Instead of approving, the client disputes -> forwards the fee pool to Arbitration
cast send "$TL" "disputeWork(uint256)" 1 --rpc-url "$RPC" --private-key "$CLIENT_KEY"
# -> WorkDisputed(id, arbitrationId); read the dispute id from the event or getContract()

# 2. A staked, eligible juror commits a hidden vote.
#    commitment = keccak256(abi.encodePacked(disputeId, juror, completionPct, salt))
DISPUTE=1; PCT=70; SALT=0x<32-byte-random>
COMMIT=$(cast keccak "$(cast abi-encode 'f(uint256,address,uint256,bytes32)' $DISPUTE $JUROR $PCT $SALT)")
cast send "$ARB" "commitVote(uint256,bytes32)" $DISPUTE "$COMMIT" \
  --rpc-url "$RPC" --private-key "$JUROR_KEY"

# 3. After >= MIN_JURORS commit (or the 72h commit window passes), advance and reveal.
cast send "$ARB" "advanceToReveal(uint256)" $DISPUTE --rpc-url "$RPC" --private-key "$JUROR_KEY"
cast send "$ARB" "revealVote(uint256,uint256,bytes32)" $DISPUTE $PCT $SALT \
  --rpc-url "$RPC" --private-key "$JUROR_KEY"

# 4. After the reveal window: finalize (computes the median, slashes minorities),
#    then execute once the 72h appeal window closes.
cast send "$ARB" "finalizeDispute(uint256)" $DISPUTE --rpc-url "$RPC" --private-key "$JUROR_KEY"
cast send "$ARB" "executeRuling(uint256)" $DISPUTE --rpc-url "$RPC" --private-key "$ANY_KEY"
# -> TrustLedger.executeRuling distributes funds by completionPct; status RESOLVED

# 5. Majority jurors claim their fee-pool share after the appeal window.
cast send "$ARB" "claimReward(uint256)" $DISPUTE --rpc-url "$RPC" --private-key "$JUROR_KEY"
```

!!! warning "Use a fresh, secret salt per commit" The `salt` must stay secret
until reveal and match exactly, byte-for-byte. A revealed value whose recomputed
commitment differs from the stored one reverts with `InvalidCommitment`, and a
juror who never reveals is slashed.

### Reading events with viem

```ts
import { parseAbiItem } from "viem";

const logs = await publicClient.getLogs({
  address: TL,
  event: parseAbiItem(
    "event ContractCreated(uint256 indexed id, address indexed client, address indexed freelancer, uint256 amount)",
  ),
  fromBlock: deployBlock,
});
```

---

## Related docs

- [Home](Home.md) - documentation index
- [Architecture](ARCHITECTURE.md) - system diagram, state machine, and payout
  formulas
- [FAQ](FAQ.md) - common questions about using, building, and contributing
- [GitHub Models](GITHUB_MODELS.md) - `.prompt.yml` examples, Python SDK, and
  Actions workflow
- [Contributing](CONTRIBUTING.md) - local setup, testing, and demo scripts

---

## Security

See [SECURITY.md](../SECURITY.md) for the full vulnerability reporting policy,
in-scope contracts, severity classification, and response timeline.

**Do not open public GitHub issues for security vulnerabilities.** Report
privately via the contact in `SECURITY.md`.

TrustLedger is currently pre-mainnet. No contracts hold real user funds. The
codebase targets Ethereum Sepolia (testnet) and is under active development.

---

## License

This project is licensed under the Apache License 2.0. See [LICENSE](../LICENSE)
for full terms.

---

## Authors

- Kevin Le
- Kellen Snider
