# Architecture

TrustLedger is a four-contract system deployed on Ethereum. The contracts communicate through well-defined interfaces with no owner or admin role - every state transition is enforced by the EVM.

---

## System Diagram

```text
  ┌──────────────────────────────────────────────────────────────────────┐
  │                          External Actors                             │
  │   Client Wallet        Freelancer Wallet        Juror Wallet(s)     │
  └──────────┬───────────────────┬──────────────────────┬───────────────┘
             │                   │                      │
             │    ethers / wagmi / viem                 │
             ▼                   ▼                      │
  ┌──────────────────────────────────────────────────────────────────────┐
  │                        TrustLedger.sol                               │
  │                                                                      │
  │  createContract()    ← client locks ETH or ERC-20  [whenNotPaused]  │
  │  acceptContract()    ← freelancer signs with ECDSA (ecrecover)       │
  │  rejectContract()    ← freelancer declines; client refunded          │
  │  submitProofOfWork() ← freelancer submits IPFS hash                  │
  │  approveWork()       ← client approves; funds released               │
  │  disputeWork()       ← client disputes; fee pool forwarded ──────────┼──►
  │  claimAfterDeadlineMiss()     ← client reclaims after deadline miss  │
  │  claimAfterAcceptanceWindow() ← freelancer auto-claims if ghost      │
  │  claimWarrantyFunds()  ← freelancer claims hold-back after period    │
  │  executeRuling()  ◄── called by Arbitration with completionPct       │
  │  submitRating()   ──────────────────────────────────────────────────►│
  │  pause() / unpause()  ← pauser address only                          │
  └──────────────────────────────┬───────────────────────────────────────┘
                                 │                                        │
                    openDispute(contractId, client,                       │
                    freelancer, amount, feePool)                          │
                                 ▼                                        │
  ┌──────────────────────────────────────────────────────────────────────┤
  │                        Arbitration.sol                               │
  │                                                                      │
  │  openDispute()       ← called only by TrustLedger                    │
  │  commitVote()        ← eligible juror submits keccak256 commitment   │
  │  revealVote()        ← juror reveals completionPct + salt            │
  │  advanceToReveal()   ← anyone; after deadline or ≥ 3 commits         │
  │  finalizeDispute()   ← anyone; after reveal deadline                 │
  │  appeal()            ← client or freelancer; costs 1.5× bond         │
  │  claimReward()       ← majority juror claims fee share               │
  │  executeRuling()     ── calls TrustLedger.executeRuling() ──────────►│
  └──────────────────────────────┬───────────────────────────────────────┘
                                 │
           lockForDispute()  /  unlockFromDispute()  /  slash()
                                 ▼
  ┌───────────────────────────────────────────────┐
  │                JurorRegistry.sol              │
  │                                               │
  │  register()       ← anyone; stake ≥ 0.01 ETH  │
  │  addStake()       ← registered juror           │
  │  unstake()        ← juror; after 7-day lock    │
  │  lockForDispute() ← Arbitration only           │
  │  unlockFromDispute() ← Arbitration only        │
  │  slash()          ← Arbitration only           │
  │  isEligible()     ← view; called by Arbitration│
  │  getJuror()       ← view                       │
  │  getJurorList()   ← view                       │
  └───────────────────────────────────────────────┘
                    ▲
                    │  requestRandomWords() / fulfillRandomWords()
  ┌─────────────────┴─────────────────┐
  │      Chainlink VRF v2             │   (optional; wired via initVrfCoordinator)
  └───────────────────────────────────┘


  ┌────────────────────────────────────┐
  │       ReputationRegistry.sol      │   ← TrustLedger calls rate() after completion
  │  rate()          ← TrustLedger    │
  │  averageRating() ← anyone         │
  └────────────────────────────────────┘

  ┌────────────────────────────────────┐
  │   Chainlink AggregatorV3Interface  │   ← wired via TrustLedger.initPriceFeed()
  │   latestRoundData() → ETH/USD      │
  └────────────────────────────────────┘
```

---

## Scenario A - Happy Path

### On-Chain Flow

```text
Client                  TrustLedger             Freelancer
  │                         │                       │
  │── createContract() ─────►│ (ETH locked)          │
  │                         │─── ContractCreated ───►│
  │                         │                       │
  │                         │◄── acceptContract(v,r,s) (ECDSA sig) ──│
  │                         │  ecrecover verifies signer             │
  │                         │─── ContractAccepted ──►│
  │                         │                       │
  │                         │◄── submitProofOfWork(hash, uri) ────────│
  │                         │  acceptanceDeadline set                │
  │                         │─── ProofSubmitted ────►│
  │                         │                       │
  │── approveWork() ────────►│                       │
  │                         │── FundsReleased ───────────────────────►│
  │                         │  (amount - holdBack)                   │
  │                         │                       │
  │── submitRating(score) ──►│─── ReputationRegistry.rate() ──────────►│
  │                         │◄─ submitRating(score) ──────────────────│
  │                         │─── ReputationRegistry.rate() ──────────►│
```

### Frontend Magic Link Flow (Precedes On-Chain Acceptance)

The client fills in the freelancer's email on the create-contract page. After the
`createContract` transaction confirms, the frontend extracts the contract ID from
the `ContractCreated` event log and calls the Next.js API to send a signed magic link.

```text
Client browser          Next.js API             Email            Freelancer browser
  │                         │                      │                       │
  │── createContract() tx ──►│ (on-chain)           │                       │
  │   (confirms; id parsed) │                      │                       │
  │                         │                      │                       │
  │─ POST /api/magic-link/send ─────────────────────────────────────────   │
  │   {contractId, freelancerEmail, freelancerAddress}                      │
  │                         │                      │                       │
  │                         │ signMagicToken()      │                       │
  │                         │ (HMAC-SHA256, 72h exp)│                       │
  │                         │─── Resend email ─────►│─── link in inbox ────►│
  │◄── {ok: true} ──────────│                      │                       │
  │                         │                      │                       │
  │                         │                      │   /freelancer/accept?token=…
  │                         │◄── GET /api/magic-link/verify?token=… ───────│
  │                         │    (HMAC + expiry check)                      │
  │                         │─── {ok, payload} ────────────────────────────►│
  │                         │                      │                       │
  │                         │   (reads getContract on-chain)               │
  │                         │                      │                       │
  │                         │   (wallet connect prompt; must match freelancerAddress)
  │                         │                      │                       │
  │                         │   signMessage(keccak256(id, freelancerAddress))
  │                         │◄──────────────────────────────── sig (v, r, s)│
  │                         │                      │                       │
  │                         │◄─ acceptContract(id, v, r, s) ───────────────│
  │                         │   (ecrecover verifies signer on-chain)       │
  │                         │─── ContractAccepted ─────────────────────────►│
  │                         │   project deadline timer starts              │
```

The magic link is single-use by design: the contract's status machine (`PENDING → ACTIVE`) is
irreversible on-chain, so a replayed token will simply find the contract in a non-PENDING state
and the `acceptContract` call will revert with `InvalidStatus`. No server-side token revocation
store is required.

---

## Scenario B - Dispute Flow

```text
Client              TrustLedger          Arbitration          JurorRegistry
  │                     │                    │                    │
  │─ disputeWork() ─────►│                    │                    │
  │                     │─ openDispute() ─────►│                    │
  │                     │  (feePool as ETH)   │ COMMIT phase opens │
  │                     │                    │                    │
  │           Juror 1,2,3 ─── commitVote(hash) ──►│                 │
  │                     │                    │─ lockForDispute() ──►│
  │                     │                    │                    │
  │           Anyone ─── advanceToReveal() ──►│ REVEAL phase opens  │
  │                     │                    │                    │
  │           Juror 1,2,3 ─── revealVote(pct,salt) ──►│             │
  │                     │                    │                    │
  │           Anyone ─── finalizeDispute() ──►│ median ruling       │
  │                     │                    │─ unlockFromDispute() ►│
  │                     │                    │─ slash(minority) ───►│
  │                     │                    │                    │
  │           (72h appeal window passes)     │                    │
  │                     │                    │                    │
  │           Anyone ─── executeRuling() ───►│                    │
  │                     │◄─ executeRuling(id, pct) ───────────────  │
  │◄── FundsReleased ──  │                                          │
  Freelancer ◄────────── │ (proportional split)                     │
```

---

## Contract Lifecycle State Machine

```text
                    ┌──────────────────────────────────────┐
                    │              PENDING                 │
                    │  Waiting for freelancer response     │
                    └────────┬──────────────┬─────────────┘
                             │              │
                     accept()│              │reject() / cancel()
                             │              │ / deadline elapsed
                             ▼              ▼
                    ┌──────────────┐    ┌────────────┐
                    │   ACTIVE     │    │ CANCELLED  │
                    │  Deadline    │    └────────────┘
                    │  running     │
                    └──────┬───────┘
                           │
                 submitProofOfWork()
                           │
                           ▼
                    ┌──────────────────┐
                    │   SUBMITTED      │
                    │  Acceptance      │
                    │  window running  │
                    └───┬──────────┬───┘
                        │          │
                approveWork()   disputeWork()
             claimAfterWindow() │
                        │          │
                        ▼          ▼
                   ┌──────────┐  ┌──────────┐
                   │ APPROVED │  │ DISPUTED │
                   │          │  │          │
                   └────┬─────┘  └────┬─────┘
                        │             │
              claimWarrantyFunds()  executeRuling()
                  (if hold-back)       │
                        │             ▼
                        │         ┌──────────┐
                        │         │ RESOLVED │
                        │         └──────────┘
                        │
                  (warranty expires)
```

---

## Deploy Order and CREATE Address Resolution

The three primary contracts have a circular dependency: `TrustLedger` needs `Arbitration`'s address, and `Arbitration` needs both `TrustLedger`'s and `JurorRegistry`'s addresses. This is resolved using EVM's deterministic `CREATE` opcode.

```text
Formula:
  CREATE address = keccak256(RLP(deployerAddress, nonce))[12:]

Deploy sequence:
  nonce     → JurorRegistry.deploy(arbitrationAddr)   ← precomputed
  nonce + 1 → TrustLedger.deploy(arbitrationAddr)     ← precomputed
  nonce + 2 → Arbitration.deploy(trustLedger, jurorRegistry)
                                                        ← lands at arbitrationAddr ✓

Verification:
  assert arbitration.address == arbitrationAddr
  If the nonce was wrong (e.g. a failed tx incremented it silently),
  this assertion catches the mismatch immediately.
```

---

## Payout Formulas

### Happy path (no dispute)

```text
immediate payout = amount − holdBackAmount
holdBackAmount   = amount × holdBackBps / 10_000

After warranty period:
  claimWarrantyFunds() → freelancer receives holdBackAmount
```

### Dispute ruling (completionPct p)

```text
feePool         = amount × arbitrationFeeBps / 10_000
remaining       = amount − feePool

If p == 100:
  freelancerPay = remaining
  clientRefund  = 0

If p == 0:
  freelancerPay = 0
  clientRefund  = remaining

If 0 < p < 1:
  earnedAmount    = p × amount
  rawPay          = (2 × earnedAmount) / 3
  freelancerFee   = feePool × p
  freelancerPay   = rawPay − freelancerFee
  clientRefund    = remaining − freelancerPay

Invariant: freelancerPay + clientRefund == remaining (all funds distributed)

The freelancer receives 2/3 of the earned amount (p × amount) as a gross payment,
then pays their proportional share of the arbitration fee.
```

### Example: p = 0.6 (60%), amount = 1000, arbitrationFeeBps = 1500

```text
feePool       = 1000 × 1500 / 10_000 = 150
remaining     = 1000 − 150           = 850
earnedAmount  = 0.6 × 1000           = 600
rawPay        = (2 × 600) / 3        = 400
freelancerFee = 150 × 0.6            = 90
freelancerPay = 400 − 90             = 310
clientRefund  = 850 − 310            = 540
```

### Example: p = 0.5 (50%), amount = 1 ETH, arbitrationFeeBps = 1500

```text
feePool       = 1 ETH × 1500 / 10_000  = 0.15 ETH
remaining     = 1 ETH − 0.15 ETH       = 0.85 ETH
earnedAmount  = 0.5 × 1 ETH            = 0.5 ETH
rawPay        = (2 × 0.5) / 3          ≈ 0.3333 ETH
freelancerFee = 0.15 × 0.5             = 0.075 ETH
freelancerPay ≈ 0.3333 − 0.075         ≈ 0.258 ETH
clientRefund  = 0.85 − 0.258           ≈ 0.592 ETH
```

### Juror slashing (tiered)

```text
deviation = |vote − median ruling|

No-reveal jurors (committed but never revealed):
  slashAmount = stake × 10%   (always standard rate)

Minority voters (deviation > MAJORITY_THRESHOLD = 20):
  deviation ≤ 30  →  slashAmount = stake × SLASH_BPS / 10_000  = stake × 10%
  deviation > 30  →  slashAmount = stake × SEVERE_SLASH_BPS / 10_000 = stake × 20%

Rationale: bribed or colluding jurors tend to submit extreme outlier votes to
force a predetermined result. Doubling the penalty for deviations > 30 pct-points
makes such attempts significantly more expensive.

Reputation decay per slash:
  reputation = max(0, reputation − 10)   (starts at 100)
```

### Appeal bond

```text
required bond = feePool × APPEAL_BOND_MULTIPLIER_BPS / BPS_DENOMINATOR
              = feePool × 15_000 / 10_000
              = feePool × 1.5

If appeal changes the ruling:  bond returned to appealer
If appeal confirms ruling:      bond stays in appeal fee pool (forfeited)

Appeal juror panel: maxJurors × 2 (5 → 10 → 20 for successive appeals)
```

---

## Juror Selection: Chainlink VRF and RANDAO Fallback

When a dispute is opened, jurors are selected using verifiable randomness. Two paths exist depending on whether a VRF coordinator has been wired in:

```text
openDispute()
    │
    ├── VRF path (vrfCoordinator != address(0)):
    │       VRFCoordinator.requestRandomWords(
    │           keyHash = bytes32(0),   ← gas lane; set by subscription
    │           subId = 0,              ← VRF subscription ID
    │           confirmations = 3,
    │           callbackGas = 200_000,
    │           numWords = 1            ← one word used as Fisher-Yates seed
    │       ) → requestId
    │       _pendingVrfRequest[requestId] = disputeId
    │       (dispute waits; jurors pre-selected in callback below)
    │
    └── RANDAO path (vrfCoordinator == address(0)):
            seed = keccak256(block.prevrandao, block.timestamp, disputeId)
            _selectJurorsFromSeed(disputeId, seed)
            (jurors selected synchronously; no external call needed)

fulfillRandomWords(requestId, randomWords[]) ← VRF coordinator callback only
    │
    └── seed = randomWords[0]
        _selectJurorsFromSeed(disputeId, seed)

_selectJurorsFromSeed(disputeId, seed):
    Partial Fisher-Yates shuffle over the full JurorRegistry pool:
        for i in [0, n):
            j = i + (seed % (n - i))
            seed = keccak256(seed)      ← re-hash for each step
            swap pool[i] ↔ pool[j]
            accept pool[i] if:
                not a dispute party
                not already selected
                not an original juror (appeal isolation)
                isEligible() == true
            stop when maxJurors slots filled
    sets vrfFulfilled = true; emits CommitteeSelected

commitVote() in VRF / RANDAO mode (vrfFulfilled == true):
    revert if !_committed[msg.sender]    ← only pre-selected jurors may commit
    revert if _commitments != bytes32(0) ← only once per juror

commitVote() in legacy mode (vrfFulfilled == false):
    any eligible juror self-selects up to maxJurors slots
```

**VRF vs RANDAO trade-offs:**

|                   | Chainlink VRF                 | RANDAO (`block.prevrandao`)            |
| ----------------- | ----------------------------- | -------------------------------------- |
| Randomness source | Verifiable off-chain RNG      | EIP-4399 RANDAO reveal (beacon chain)  |
| Manipulation risk | None (cryptographic proof)    | Low (validator can withhold one block) |
| Latency           | ~1-3 blocks for callback      | Synchronous (same tx)                  |
| Cost              | VRF subscription fee          | Zero extra gas                         |
| Requirement       | `initVrfCoordinator()` called | Default; no setup needed               |

RANDAO is the default. For production deployments where the juror pool is large enough that a single withheld block could meaningfully shift selection, wire in Chainlink VRF via `Arbitration.initVrfCoordinator()`.

---

## Storage Layout

EVM storage slots are 32 bytes each. Field ordering in structs is packed to minimize the number of slots used (and therefore gas costs).

### `EscrowContract` (TrustLedger)

| Slot | Fields                                                                                           | Bytes used |
| ---- | ------------------------------------------------------------------------------------------------ | ---------- |
| 0    | `client` (address 20) + `arbitrationFeeBps` (2) + `holdBackBps` (2) + `status` (1)               | 25         |
| 1    | `freelancer` (address 20) + `warrantyDeadline` (8)                                               | 28         |
| 2    | `projectDeadline` (8) + `acceptanceWindow` (8) + `acceptanceDeadline` (8) + `warrantyPeriod` (8) | 32         |
| 3    | `amount` (256)                                                                                   | 32         |
| 4    | `holdBackAmount` (256)                                                                           | 32         |
| 5    | `arbitrationId` (256)                                                                            | 32         |
| 6    | `contractHash` (bytes32)                                                                         | 32         |
| 7    | `contractURI` (string, dynamic)                                                                  | 32+        |
| 8    | `proofOfWorkHash` (bytes32)                                                                      | 32         |
| 9    | `proofOfWorkURI` (string, dynamic)                                                               | 32+        |
| 10   | `token` (address 20)                                                                             | 20         |
| 11   | `usdValueAtCreation` (256)                                                                       | 32         |
| 12   | `previousContractId` (256) - `type(uint256).max` if no predecessor                               | 32         |

### `TrustLedger` contract-level state (outside `EscrowContract`)

| Variable             | Type                    | Description                                                 |
| -------------------- | ----------------------- | ----------------------------------------------------------- |
| `nextId`             | `uint256`               | Auto-incrementing escrow ID counter.                        |
| `priceFeed`          | `AggregatorV3Interface` | Optional Chainlink ETH/USD feed.                            |
| `reputationRegistry` | `IReputationRegistry`   | Optional reputation registry.                               |
| `pauser`             | `address`               | Optional address allowed to pause/unpause `createContract`. |

### `Dispute` (Arbitration)

| Slot | Fields                                                                                                    | Bytes |
| ---- | --------------------------------------------------------------------------------------------------------- | ----- |
| 0    | `contractId` (256)                                                                                        | 32    |
| 1    | `client` (20) + `phase` (1) + `finalized` (1) + `appealed` (1) + `vrfFulfilled` (1) + `phaseDeadline` (8) | 32    |
| 2    | `freelancer` (20)                                                                                         | 20    |
| 3-5  | `contractAmount`, `feePool`, `ruling` (3 × 256)                                                           | 96    |
| 6    | `appealer` (20)                                                                                           | 20    |
| 7-11 | `appealBond`, `appealDisputeId`, `parentDisputeId`, `maxJurors`, `jurorCount`                             | 160   |

---

## Frontend reputation UI

Two distinct on-chain reputation systems surface in the Next.js app:

| UI route      | Contract             | What it shows                                                                     |
| ------------- | -------------------- | --------------------------------------------------------------------------------- |
| `/reputation` | `ReputationRegistry` | Cumulative escrow rating average (`averageRating`) for any address                |
| `/dashboard`  | `TrustLedger`        | `submitRating` form on `APPROVED` / `RESOLVED` contracts                          |
| `/juror`      | `JurorRegistry`      | Juror stake reputation (100 → −10 per minority vote); unrelated to escrow ratings |

Local dev: deploy with `npm run hardhat:deploy:local` so `artifacts/deployed-addresses.json` includes `ReputationRegistry`; `next.config.ts` injects `NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS` at build time.

---

## Threat Mitigations

The following mechanisms address the protocol's stated threat model directly.

### Dishonest client disputing valid work

When `executeRuling` settles at `completionPct >= 80`, `TrustLedger` automatically calls `ReputationRegistry.rate(client, 1)`, permanently recording a low-score rating. The `_clientRated` flag is also set, preventing the client from submitting a self-serving rating via `submitRating`.

### Freelancer submitting low-quality work

When `executeRuling` settles at `completionPct <= 20`, the same mechanism applies to the freelancer: `ReputationRegistry.rate(freelancer, 1)` is called automatically and `_freelancerRated` is set. Reputation scores are public and visible to future clients before they hire.

### Juror bribery

Bribery attempts typically require jurors to vote at extreme values (e.g., 0 or 100) rather than near the true median. Any minority vote deviating more than 30 pct-points from the median incurs a **20% slash** instead of the standard 10%. This doubles the economic cost of an extreme vote, making bribery only worthwhile when the bribe exceeds 20% of the juror's stake.

### Juror collusion

After each dispute finalizes, `unlockFromDispute` sets a 7-day cooldown (`JUROR_COOLDOWN`) on the juror. `isEligible()` rejects jurors in cooldown, so the same group cannot coordinate on back-to-back disputes. Combined with random VRF/RANDAO selection, this makes sustained multi-dispute coordination impractical.

### Sybil attacks (fake juror identities)

`isEligible()` now enforces a minimum reputation of 20 (`MIN_REPUTATION`). A freshly registered Sybil account starts at reputation 100 but drops by 10 per minority vote. After 8 slashed votes the account falls below the threshold and is permanently excluded until the operator tops up reputation - which requires genuinely honest participation.

---

## Related docs

- [Home](Home.md) - documentation index
- [Contract Reference](CONTRACTS.md) - full public API for all contracts
- [GitHub Models](GITHUB_MODELS.md) - `.prompt.yml` examples, Python SDK, and Actions workflow
- [Contributing](CONTRIBUTING.md) - local setup and demo scripts

---

## Security

See [SECURITY.md](../SECURITY.md) for the full vulnerability reporting policy, in-scope contracts, severity classification, and response timeline.

**Do not open public GitHub issues for security vulnerabilities.** Report privately via the contact in `SECURITY.md`.

TrustLedger is currently pre-mainnet. No contracts hold real user funds. The codebase targets Ethereum Sepolia (testnet) for development; production deployments target Arbitrum, Base, or Optimism to keep gas costs proportional to typical contract values.

---

## License

This project is licensed under the Apache License 2.0. See [LICENSE](../LICENSE) for full terms.

---

## Authors

- Kevin Le
- Kellen Snider
