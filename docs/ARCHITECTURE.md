# Architecture

TrustLedger is a four-contract system deployed on Ethereum. The contracts communicate through well-defined interfaces with no owner or admin role — every state transition is enforced by the EVM.

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
  │  createContract()    ← client locks ETH or ERC-20                    │
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

## Scenario A — Happy Path

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

---

## Scenario B — Dispute Flow

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

If 0 < p < 100:
  rawPay          = (2 × p × amount) / 300
  freelancerFee   = feePool × p / 100
  freelancerPay   = rawPay − freelancerFee
  clientRefund    = remaining − freelancerPay

Invariant: freelancerPay + clientRefund == remaining (all funds distributed)
```

### Example: p = 50, amount = 1 ETH, arbitrationFeeBps = 1500

```text
feePool       = 1 ETH × 1500 / 10_000 = 0.15 ETH
remaining     = 1 ETH − 0.15 ETH      = 0.85 ETH
rawPay        = (2 × 50 × 1) / 300    ≈ 0.3333 ETH
freelancerFee = 0.15 × 50 / 100       = 0.075 ETH
freelancerPay ≈ 0.3333 − 0.075        ≈ 0.258 ETH
clientRefund  = 0.85 − 0.258          ≈ 0.592 ETH
```

### Juror slashing (10%)

```text
slashAmount = jurorStake × SLASH_BPS / BPS_DENOMINATOR
            = jurorStake × 1000 / 10_000
            = jurorStake × 10%

Triggers:
  - juror committed but did not reveal (no-reveal)
  - juror's revealed vote is > 20 pct-points from the median ruling

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

## VRF Juror Selection Flow

```text
openDispute()
    │
    ├── if vrfCoordinator != address(0):
    │       VRFCoordinator.requestRandomWords(
    │           keyHash = 0,
    │           subId = 0,
    │           confirmations = 3,
    │           callbackGas = 200_000,
    │           numWords = BASE_MAX_JURORS     ← 5 words
    │       ) → requestId
    │       _pendingVrfRequest[requestId] = disputeId
    │
    └── else: legacy mode (jurors self-select via commitVote)

fulfillRandomWords(requestId, randomWords[]) ← called by VRF coordinator
    │
    └── for each word:
            candidate = allJurors[word % poolSize]
            skip if: party / already selected / ineligible / original juror
            mark _committed[candidate] = true
            push to _jurors[disputeId]

commitVote() in VRF mode:
    revert if !_committed[msg.sender]    ← only pre-selected jurors
    revert if _commitments != bytes32(0) ← only once per juror
```

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

## Security

See [SECURITY.md](../SECURITY.md) for the full vulnerability reporting policy, in-scope contracts, severity classification, and response timeline.

**Do not open public GitHub issues for security vulnerabilities.** Report privately via the contact in `SECURITY.md`.

TrustLedger is currently pre-mainnet. No contracts hold real user funds. The codebase targets Ethereum Sepolia (testnet) and is under active development.

---

## License

This project is licensed under the Apache License 2.0. See [LICENSE](../LICENSE) for full terms.

---

## Authors

- Kevin Le
- Kellen Snider
