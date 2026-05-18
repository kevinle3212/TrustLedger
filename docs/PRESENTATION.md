# TrustLedger — OBG Presentation Notes

Presenter: Kevin Le, Kellen Snider

---

## The Problem

Freelancing is a $1.5 trillion global market. Every week, freelancers and clients deal with:

- **Ghost clients** — clients who approve work but never pay.
- **Scope creep** — clients who refuse payment claiming work was "incomplete."
- **No recourse** — centralized platforms (Upwork, Fiverr) take 20% and resolve disputes opaquely.
- **Volatility risk** — dollar-denominated agreements paid in ETH after weeks of price movement.

**The question:** Can smart contracts replace the middleman entirely?

---

## What TrustLedger Does

TrustLedger is a decentralized escrow and dispute resolution protocol for freelance agreements on Ethereum.

A client locks funds in a contract. The freelancer completes the work. If everyone agrees, funds release automatically. If there is a dispute, a panel of staked jurors votes on a completion percentage, and funds split accordingly.

> No platform fee. No company. No trust required — only math and cryptography.

---

## Architecture

```text
  Client / Freelancer Wallet
           │
           │  ethers.js / wagmi / viem
           ▼
  ┌─────────────────────────────────────────────────────┐
  │                   TrustLedger.sol                   │
  │  createContract()  acceptContract()  approveWork()  │
  │  submitProofOfWork()  disputeWork()  executeRuling()│
  └────────────┬───────────────────────────────┬────────┘
               │ openDispute() / executeRuling()│ submitRating()
               ▼                               ▼
  ┌───────────────────────┐      ┌──────────────────────┐
  │    Arbitration.sol    │      │  ReputationRegistry  │
  │  commitVote()         │      │  rate()              │
  │  revealVote()         │      │  averageRating()     │
  │  finalizeDispute()    │      └──────────────────────┘
  │  appeal()             │
  │  executeRuling() ─────┘ (calls back TrustLedger)
  └────────────┬──────────┘
               │ lockForDispute() / unlockFromDispute() / slash()
               ▼
  ┌────────────────────────┐
  │    JurorRegistry.sol   │
  │  register()  unstake() │
  │  isEligible()          │
  └────────────────────────┘
               ▲
               │ VRF randomness (optional)
  ┌────────────────────────┐    ┌────────────────────────┐
  │  Chainlink VRF v2      │    │  Chainlink Price Feed  │
  │  (juror selection)     │    │  ETH/USD at creation   │
  └────────────────────────┘    └────────────────────────┘
```

**Contract lifecycle (state machine):**

```text
PENDING ──[accept]──► ACTIVE ──[submitProofOfWork]──► SUBMITTED
   │                     │                                 │          │
[reject/cancel]    [missDeadline]                   [approveWork] [disputeWork]
   │                     │                          [claimWindow]      │
   ▼                     ▼                                 │          │
CANCELLED            CANCELLED                         APPROVED    DISPUTED
                                                           │          │
                                                  [claimWarranty] [executeRuling]
                                                           │          │
                                                      (hold-back) RESOLVED
```

---

## Deploy Order

Deploying three mutually-referencing contracts requires precomputing addresses using the EVM's deterministic `CREATE` opcode. The deploy script reads the deployer's current nonce and computes where `Arbitration` will land before deploying anything.

```text
Step 1:  Compute arbitrationAddr = CREATE(deployer, nonce + 2)

Step 2:  Deploy JurorRegistry(arbitrationAddr)   ← nonce
Step 3:  Deploy TrustLedger(arbitrationAddr)     ← nonce + 1
Step 4:  Deploy Arbitration(trustLedger, jurorRegistry)  ← nonce + 2

         ✓ assert arbitration.address == arbitrationAddr

Step 5:  (Optional) TrustLedger.initPriceFeed(chainlinkFeed)
         // function implemented; not called in deploy scripts — requires a live Chainlink ETH/USD feed address
Step 6:  (Optional) TrustLedger.initReputationRegistry(reputationRegistry)
         // function implemented; not called in deploy scripts — depends on ReputationRegistry address from Step 8
Step 7:  (Optional) Arbitration.initVrfCoordinator(vrfCoordinator)
         // function implemented; not called in deploy scripts — requires a funded Chainlink VRF v2 subscription
Step 8:  Deploy ReputationRegistry(trustLedger)
         // contract implemented in src/ — not yet included in either deploy script
```

No owner or admin role. Once deployed, the addresses are immutable.

---

## Feature: On-Chain Proof of Agreement

Neither party can claim the agreement said something different after the fact. Proof of tampering is mathematically instant.

At contract creation, `keccak256` of the off-chain document and its IPFS URI are written to the `EscrowContract` struct. At work submission, the same is done for the deliverable. Any modification to either document changes its hash, which will not match what is stored on-chain.

```solidity
// stored at creation
bytes32 contractHash;  // keccak256 of the agreement PDF
string  contractURI;   // ipfs://Qm...

// stored when freelancer submits work
bytes32 proofOfWorkHash;  // keccak256 of the deliverable
string  proofOfWorkURI;   // ipfs://Qm...
```

---

## Feature: ECDSA Wallet Binding

A freelancer cannot be enrolled in a contract without explicit cryptographic consent from their private key. A third party cannot accept on their behalf.

The contract requires `ecrecover` to return the freelancer's address before advancing to `ACTIVE`. The signed message is `keccak256(contractId, freelancerAddress)`, which binds the signature to one specific contract. The EIP-191 prefix prevents replay attacks and malformed transaction reuse.

```solidity
bytes32 innerHash = keccak256(abi.encodePacked(id, c.freelancer));
bytes32 ethSignedHash = keccak256(
    abi.encodePacked("\x19Ethereum Signed Message:\n32", innerHash)
);
address signer = ecrecover(ethSignedHash, v, r, s);
if (signer != c.freelancer) revert InvalidSignature();
```

---

## Feature: Commit-Reveal Voting

Jurors vote in secret. No one can see the crowd forming and pile on at the last second. Votes are revealed only after the commit window closes — and any deviation from the original commitment is rejected.

The commitment is `keccak256(disputeId, jurorAddress, completionPct, salt)`. The salt is a 32-byte random secret the juror keeps off-chain. During reveal, the contract re-derives the hash and compares it to the stored commitment. A mismatch reverts.

```text
Commit phase (72 h):   juror submits H = keccak256(id ‖ addr ‖ pct ‖ salt)
Reveal phase (72 h):   juror submits pct + salt
                       contract verifies: keccak256(id ‖ addr ‖ pct ‖ salt) == H
Finalize:              median of revealed votes becomes the ruling
```

---

## Feature: Verifiable Random Juror Selection

When Chainlink VRF is configured, no one — not even the deployer — can predict or manipulate which jurors are chosen. The selection is provably random.

On `openDispute()`, a VRF randomness request is sent to the Chainlink coordinator. The coordinator calls `fulfillRandomWords()` with verified random numbers. Each word selects a candidate from the eligible pool using modulo. Parties and ineligible jurors are skipped. Pre-selected jurors are the only addresses allowed to `commitVote()`.

```text
openDispute() ──► VRFCoordinator.requestRandomWords(numWords = 5)
                       │
                       └──► fulfillRandomWords(requestId, [r1, r2, r3, r4, r5])
                                 allJurors[r1 % poolSize] → candidate 1
                                 allJurors[r2 % poolSize] → candidate 2
                                 ...
```

Without VRF: any eligible juror self-selects by calling `commitVote()` (legacy mode).

---

## Feature: Partial Completion Rulings

Disputes are not binary. A freelancer who completed 70% of the work gets 70% of the payment — proportionally — not nothing.

Jurors vote `completionPct` in `[0, 100]`. The median vote is the ruling. The payout formula shares the arbitration fee burden proportionally between both parties:

```text
Payout formula (0 < p < 100):

  feePool         = amount × arbitrationFeeBps / 10_000
  remaining       = amount − feePool
  rawPay          = (2 × p × amount) / 300
  freelancerFee   = feePool × p / 100
  freelancerPay   = rawPay − freelancerFee
  clientRefund    = remaining − freelancerPay

Edge cases:
  p = 0  → freelancerPay = 0 (full refund to client)
  p = 100 → freelancerPay = remaining (full payment to freelancer)

Example (p = 50, amount = 1 ETH, arbitrationFeeBps = 1500):
  feePool       = 0.15 ETH
  rawPay        = (2 × 50 × 1) / 300 ≈ 0.333 ETH
  freelancerFee = 0.15 × 50 / 100    = 0.075 ETH
  freelancerPay ≈ 0.333 − 0.075      ≈ 0.258 ETH
  clientRefund  = 0.85 − 0.258       ≈ 0.592 ETH
```

---

## Feature: Juror Slashing and Reputation

Jurors have skin in the game. Vote wrong and lose 10% of your stake. Do it repeatedly and your on-chain reputation score decays. This deters dishonest and lazy jurors.

- **Minority threshold:** A vote more than 20 percentage points from the median is classified as minority.
- **Slash:** Minority voters and non-revealers lose `stake × 1000 / 10_000` (10%).
- **Reputation:** Starts at 100. Decreases by 10 per minority vote. Floors at 0.
- **Deactivation:** If stake falls below `MIN_STAKE = 0.01 ETH` after slashing, the juror is deactivated.
- **Reward:** Majority voters share the fee pool equally after the appeal window closes.

```solidity
bool inMajority = abs(vote - ruling) <= MAJORITY_THRESHOLD;  // ±20 pct-points
if (!inMajority) {
    uint256 sAmt = (stake * SLASH_BPS) / BPS_DENOMINATOR;    // 10%
    JUROR_REGISTRY.slash(juror, sAmt);
}
```

---

## Feature: Appeals with Escalating Panels

Either party can challenge an unfair ruling within 72 hours. A larger, independent jury re-evaluates the case. Winning returns your bond; losing forfeits it.

- Appeal bond required: `feePool × 15_000 / 10_000` (1.5× the original fee pool).
- Appeal panel doubles: first appeal uses 10 jurors (vs. 5 originally).
- Original jurors are marked `_isOriginalJuror` and blocked from the appeal panel.
- Bond is included in the appeal's fee pool. If the ruling changes, bond is returned. If unchanged, bond is forfeited (it stays in the fee pool for the appeal jurors).

```text
Original dispute:  5 jurors  →  ruling = 70%
Appeal filed:      1.5× bond posted
Appeal dispute:   10 jurors  →  new ruling
  If new ruling ≠ 70%: bond returned to appealer
  If new ruling = 70%: bond stays in fee pool (forfeited)
```

---

## Feature: Warranty Hold-Back

Clients can withhold 5-15% of payment for a set warranty period after approval. If a bug surfaces post-delivery, the client retains leverage. After the warranty expires, the freelancer claims the hold-back automatically.

```solidity
holdBackBps   in [500, 1500]   // 5-15% of amount
warrantyPeriod > 0             // seconds; e.g. 30 days = 30 * 24 * 3600

// On approval:
holdBackAmount = amount × holdBackBps / 10_000
payout         = amount − holdBackAmount
warrantyDeadline = block.timestamp + warrantyPeriod

// After warranty expires:
freelancer calls claimWarrantyFunds() → receives holdBackAmount
```

---

## Feature: Anti-Ghosting (Auto-Release)

Clients cannot indefinitely withhold payment by ignoring submitted work. The acceptance window is enforced by the chain itself.

When the freelancer calls `submitProofOfWork()`, an `acceptanceDeadline` is written: `block.timestamp + acceptanceWindow`. If the client does not call `approveWork()` or `disputeWork()` before that deadline, the freelancer calls `claimAfterAcceptanceWindow()` for full payment. The minimum acceptance window is `48 hours` (enforced by the contract constant `MIN_ACCEPTANCE_WINDOW`).

---

## Feature: ETH and ERC-20 Stablecoin Escrow

Escrow can be denominated in USDC, DAI, or any ERC-20 token, eliminating price volatility on multi-week projects.

The `token` field on `EscrowContract` is `address(0)` for ETH and the token contract address for ERC-20. Every payout path (`_sendFunds`, `_releaseToFreelancer`) branches on `token`. For ERC-20 disputes, the fee pool is paid in ETH (at dispute time via `msg.value`) since jurors are always rewarded in ETH, while the token amount splits between the parties.

---

## Feature: Chainlink Price Feed

The ETH/USD value of the escrowed amount is locked on-chain at creation. Both parties can always prove what the agreed dollar value was, regardless of what ETH does afterward.

`TrustLedger.initPriceFeed()` wires in a `AggregatorV3Interface` once. In `createContract()`, `_queryUsdValue()` calls `priceFeed.latestRoundData()` and stores the result in `usdValueAtCreation`. Units are Chainlink's standard 8 decimal places (`$1 = 1e8`).

---

## Feature: Bidirectional On-Chain Reputation

Both parties rate each other after every completed contract. Scores accumulate permanently on-chain. Freelancers with a history of disputes have lower reputations. So do clients who ghost or behave badly.

After a contract reaches `APPROVED` or `RESOLVED`, either party calls `submitRating(id, score)` with a score in `[1, 100]`. TrustLedger calls `ReputationRegistry.rate(counterparty, score)`. Only TrustLedger can write ratings — no third party can manipulate scores. Each party can rate only once per contract.

```solidity
function averageRating(address user) external view
    returns (uint256 numerator, uint256 denominator);
// average = numerator / denominator (check denominator > 0)
```

---

## Tech Stack

| Layer               | Technology                                | Why                                                       |
| ------------------- | ----------------------------------------- | --------------------------------------------------------- |
| Smart contracts     | Solidity 0.8.24                           | Latest stable; custom errors, `immutable`, named mappings |
| EVM network         | Ethereum Sepolia (testnet)                | Native L1 settlement; no bridging required                |
| Security library    | OpenZeppelin 5.x `ReentrancyGuard`        | Industry-standard reentrancy protection                   |
| Oracle — price      | Chainlink AggregatorV3Interface           | Decentralized, tamper-resistant ETH/USD feed              |
| Oracle — randomness | Chainlink VRF v2                          | On-chain verifiable random juror selection                |
| Off-chain storage   | IPFS                                      | Content-addressed; hashes verifiable on-chain             |
| Solidity testing    | Foundry (`forge test`)                    | Native Solidity, fast, 10k fuzz runs per suite            |
| TS testing          | Hardhat 2.x + Mocha + Chai + ethers.js v6 | Full integration tests with TypeChain types               |
| TypeScript          | TypeScript 6 / Node.js 22+                | Strict types, ESM + CJS dual config                       |
| Frontend (planned)  | RainbowKit + wagmi + viem                 | Best-in-class wallet connection, typed contract calls     |
| CI/CD               | GitHub Actions                            | Lint, compile, test on every pull request                 |
| Code review         | CodeRabbit                                | AI-assisted PR review with Solidity awareness             |

---

## Hardhat and Foundry — Two Toolchains, One Codebase

Both tools compile the same Solidity source files with the same compiler settings
(`solc 0.8.24`, `optimizer_runs = 200`, `via_ir = true`). They serve different roles.

**Hardhat** is the TypeScript integration layer:

- Runs a local EVM node (`npm run node`) so demo scripts and manual MetaMask testing work without
  any public testnet.
- Deployment scripts (`scripts/deploy.ts`) use ethers.js to deploy all three contracts in the
  correct nonce order and write addresses to `artifacts/deployed-addresses.json` for the frontend.
- 73 integration tests (`test/TrustLedger.test.ts`) simulate multi-wallet flows in TypeScript.
  TypeChain generates typed contract wrappers so every function call is checked at compile time.
- Balance diffs, event assertions, and revert messages are verified in plain TypeScript —
  readable by anyone who knows JavaScript.

**Foundry** is the contract-native performance layer:

- 65 unit tests written in Solidity (`contracts/test/`) run with `vm.prank`, `vm.warp`,
  `vm.deal`, and `vm.expectRevert` cheatcodes. No Node.js overhead — tests finish in seconds.
- 7 fuzz tests (`PayoutFuzz.t.sol`) run 10,000 random inputs each, proving payout conservation
  and formula correctness hold for the full `uint128` range.
- Gas reporting (`npm run foundry:gas`) shows per-function min/mean/max gas costs — used to catch
  regressions before deployment.
- `Deploy.s.sol` is a Solidity deployment script that precomputes the `Arbitration` address using
  the deployer's nonce, deploys all three contracts in order, asserts addresses match, and logs
  results. Deployed via `npm run foundry:deploy:sepolia`.

```text
Hardhat                          Foundry
───────────────────────────────────────────────────────
Local node + MetaMask            forge test (Solidity-native)
ethers.js + TypeChain types      vm.prank / vm.warp / vm.deal
Integration tests (TypeScript)   Unit + fuzz tests (Solidity)
hardhat:deploy:sepolia           foundry:deploy:sepolia
artifacts/deployed-addresses.json  broadcast/ receipts
```

Both toolchains are available as npm scripts — no need to call `forge` or `hardhat` directly.

---

## Important Packages

| Package                            | Version    | Purpose                                                     |
| ---------------------------------- | ---------- | ----------------------------------------------------------- |
| `@openzeppelin/contracts`          | ^5.6.1     | `ReentrancyGuard` used by all three core contracts          |
| `hardhat`                          | ^2.28.6    | Local blockchain node, test runner, deploy scripts          |
| `@nomicfoundation/hardhat-toolbox` | ^5.0.0     | Bundles ethers v6, TypeChain, Mocha, Chai, gas reporter     |
| `typescript-eslint`                | ^8.59.3    | TypeScript linting with type-aware rules                    |
| `prettier`                         | ^3.8.3     | Consistent formatting for TypeScript and Solidity           |
| `solhint`                          | ^6.2.1     | Solidity style and security linting                         |
| `dotenv`                           | ^17.4.2    | Loads `.env` into `process.env` for private keys and URLs   |
| `forge-std`                        | (vendored) | Foundry test utilities: `Test`, `vm`, `console`, assertions |

---

## How TrustLedger Is Different

| Feature                        | TrustLedger               | Kleros            | Escrow.com           | Upwork              |
| ------------------------------ | ------------------------- | ----------------- | -------------------- | ------------------- |
| Decentralized                  | ✅ Fully                  | ✅ Fully          | ❌ Centralized       | ❌ Centralized      |
| Partial-completion payouts     | ✅ Median % ruling        | ❌ Binary verdict | ❌ Manual            | ❌ Manual           |
| ECDSA wallet binding           | ✅ On-chain ecrecover     | ❌ No             | ❌ No                | ❌ No               |
| Verifiable random juror select | ✅ Chainlink VRF          | ❌ Token-weighted | ❌ No                | ❌ No               |
| Proportional fee split         | ✅ Shared by %            | ❌ Loser pays     | ❌ Flat platform fee | ❌ 20% always       |
| Warranty hold-back             | ✅ 5-15% configurable     | ❌ No             | ❌ No                | ❌ No               |
| Anti-ghosting (auto-release)   | ✅ Enforced on-chain      | ❌ No             | ❌ No                | ❌ No               |
| ERC-20 stablecoin escrow       | ✅ Any ERC-20             | ❌ ETH/PNK only   | ❌ Fiat only         | ❌ Fiat only        |
| Bidirectional reputation       | ✅ Both parties           | ❌ No             | ❌ No                | ✅ Centralized only |
| Platform fee                   | 0% (configurable arb fee) | ~3%               | ~1-3%                | 20%                 |
| Open source                    | ✅ Apache-2.0             | ✅ MIT            | ❌ Proprietary       | ❌ Proprietary      |

**The key differentiator:** TrustLedger is the only protocol with partial-completion rulings, proportional fee sharing, ECDSA wallet binding, and a warranty hold-back mechanism combined in one permissionless smart contract.

---

## How to Recreate This Locally

### Option A — Docker (no toolchain install needed)

Requires only [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git clone https://github.com/kevinle3212/TrustLedger.git
cd TrustLedger
git submodule update --init --recursive

docker compose build        # one-time build (~2-3 min)
docker compose up demo-good # happy path
docker compose up demo-bad  # dispute flow
```

### Option B — Local toolchain

**Prerequisites:** Node.js ≥ 22, npm, Foundry, Git

```bash
# 1. Clone the repository
git clone https://github.com/kevinle3212/TrustLedger.git
cd TrustLedger
git submodule update --init --recursive

# 2. Install Node dependencies
npm install

# 3. Compile contracts + generate TypeScript types
npm run compile

# 4. Start a local Hardhat chain (keep this terminal open)
npm run node

# 5. Deploy all three contracts (second terminal)
npm run hardhat:deploy:local

# 6. Run demo scripts
npm run demo:good    # happy path: create → accept → submit → approve → payout
npm run demo:bad     # dispute:   create → accept → submit → dispute → vote → ruling
```

---

## Running Tests

### Foundry tests (Solidity, fast)

```bash
cd contracts

forge test                                        # all 73 tests
forge test -vvv                                   # verbose output with traces
forge test --match-contract TrustLedgerTest       # one suite
forge test --match-test test_HappyPath            # one test
forge test --gas-report                           # gas cost per function
```

### Hardhat tests (TypeScript, full integration)

```bash
# from project root
npm run hardhat:test        # 73 tests: ETH, ERC-20, VRF, appeals, reputation
```

### Linting

```bash
npm run lint:sol             # Solhint — Solidity style and security
npm run lint:ts              # ESLint — TypeScript
npm run lint:prettier        # Prettier — formatting check
```

**Test coverage summary:**

| Suite                    | Count | Type                         |
| ------------------------ | ----- | ---------------------------- |
| `TrustLedgerTest`        | 33    | Foundry unit                 |
| `JurorRegistryTest`      | 22    | Foundry unit                 |
| `ReputationRegistryTest` | 11    | Foundry unit                 |
| `PayoutFuzz`             | 7     | Foundry fuzz (10k runs each) |
| Hardhat / Mocha / Chai   | 73    | TypeScript integration       |

---

## What's Next

| Priority | Item                                              | Status          |
| -------- | ------------------------------------------------- | --------------- |
| 1        | Testnet deployment + extended soak testing        | Ready to deploy |
| 2        | Wire ReputationRegistry into deploy scripts       | Not started     |
| 3        | Wire initPriceFeed and initVrfCoordinator         | Not started     |
| 4        | Chainlink VRF v2 subscription (funded + consumer) | Needs sub ID    |
| 5        | External security audit                           | Not started     |
| 6        | Formal verification (Certora / Echidna)           | Not started     |
| 7        | Frontend (React + RainbowKit + wagmi)             | Planned         |
| 8        | IPFS upload service                               | Planned         |
| 9        | Gas optimization pass                             | Not started     |
| 10       | Emergency pause / kill switch                     | Not started     |

---

## Repository

Repository: [github.com/kevinle3212/TrustLedger](https://github.com/kevinle3212/TrustLedger)

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
