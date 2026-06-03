# Testing Guide

TrustLedger uses two parallel test suites: **Hardhat/Mocha** (TypeScript,
integration-level) and **Foundry/Forge** (Solidity, unit + fuzz). Both must pass
before merging.

---

## Quick Reference

| Goal                                    | Command                                                   |
| --------------------------------------- | --------------------------------------------------------- |
| Run all Hardhat tests                   | `npm run hardhat:test`                                    |
| Run all Foundry tests                   | `npm run foundry:test`                                    |
| Run Hardhat with gas report             | `npm run hardhat:gas`                                     |
| Run Foundry with gas report             | `npm run foundry:gas`                                     |
| Run Foundry with verbose output         | `cd contracts && forge test -vvv`                         |
| Check Foundry gas snapshot              | `cd contracts && forge snapshot --check`                  |
| Run all tests under the staging profile | `npm run foundry:test:staging`                            |
| Run fork integration tests              | `npm run foundry:test:fork` (requires `FORK_URL` in .env) |

---

## Test Layout

```text
test/
└── TrustLedger.test.ts          # Hardhat integration suite (146 tests)

contracts/test/
├── unit/
│   ├── TrustLedgerTest.t.sol    # Foundry unit tests for TrustLedger
│   ├── JurorRegistryTest.t.sol  # Foundry unit tests for JurorRegistry
│   └── ReputationRegistryTest.t.sol
├── fuzz/
│   └── PayoutFuzz.t.sol         # Fuzz tests for payout math invariants
└── fork/
    └── FullLifecycleFork.t.sol  # Fork integration tests (skip when FORK_URL unset)
```

**Baseline counts:** 146 Hardhat + 84 Foundry = **230 tests total**. An
additional **4 fork integration tests** run when `FORK_URL` (or
`SEPOLIA_RPC_URL`) is set in `.env`; they skip automatically otherwise.

---

## Hardhat Suite (`test/TrustLedger.test.ts`)

### What it covers

Tests the full contract system through the JavaScript/ethers.js stack - same
flows as the Foundry unit tests but exercised via the TypeScript API.

| Suite                          | What it tests                                                   |
| ------------------------------ | --------------------------------------------------------------- |
| Deployment                     | Contract addresses, immutable references                        |
| Happy Path                     | Create → Accept → Submit → Approve                              |
| Cancel Pending                 | Client cancels before acceptance                                |
| Rejection                      | Freelancer rejects the contract                                 |
| Deadline Miss                  | Client reclaims after deadline                                  |
| Acceptance Window Auto-Release | Freelancer misses acceptance window                             |
| Dispute Flow                   | Open dispute, VRF juror selection, commit/reveal voting, ruling |
| Appeal Flow                    | Panel expansion, appeal commit/reveal, final ruling             |
| Reputation                     | Post-ruling reputation scoring                                  |
| Edge cases & reverts           | Invalid params, wrong caller, wrong status                      |

### Key helpers

- `deployContracts()` - deploys all five contracts fresh; called in
  `beforeEach`.
- `createContract(opts?)` - creates a contract and returns its `contractId`.
- `createAcceptAndSubmit(opts?)` - runs the full happy path up to SUBMITTED
  status.
- `impersonate(addr)` - wraps `hardhat_impersonateAccount` + `ethers.getSigner`.
- `makeCommitment(vote, salt)` - hashes a juror vote commitment.
- `STATUS` constant - maps status names to their numeric values; never use raw
  magic numbers.

### Notable differences from Foundry

- Time is manipulated with `hardhat_mine` / `evm_increaseTime` JSON-RPC calls
  instead of `vm.warp()`.
- All on-chain integers are `BigInt` (ethers v6); never mix with `number`.
- `acceptContract` requires a real ECDSA signature computed with
  `wallet.signMessage`.
- `expect(...).to.emit(...)` replaces `assertEq` / `assertTrue`.

### Running a single test

```bash
npx hardhat test --grep "should pay freelancer"
```

---

## Foundry Suite (`contracts/test/`)

### Unit tests

Follow the naming convention `test_<Scenario>_<Outcome>`:

- `test_HappyPath_CreateAcceptSubmitApprove`
- `test_Revert_CreateContract_ZeroAddress`
- `test_Slash_DeactivatesIfBelowMin`

The `setUp()` function in each contract deploys all dependencies fresh before
every test. Addresses are pre-computed with `computeCreateAddress` to break
circular constructor dependencies.

### Fuzz tests (`PayoutFuzz.t.sol`)

Follow the naming convention `testFuzz_<Invariant>`:

| Test                                     | Invariant                                  |
| ---------------------------------------- | ------------------------------------------ |
| `testFuzz_PayoutConservation`            | Total payouts ≤ escrowed amount − fee pool |
| `testFuzz_PartialPayoutFormula`          | Partial payout matches its formula exactly |
| `testFuzz_BufferFactorDeadline`          | Deadlines are always in the future         |
| `testFuzz_HoldBackBounds`                | Hold-back stays within declared percentage |
| `testFuzz_FeePoolBounds`                 | Fee pool never exceeds escrowed amount     |
| `testFuzz_ZeroPct_FreelancerGetsNothing` | 0% completion → freelancer gets 0          |
| `testFuzz_FullPct_ClientGetsNothing`     | 100% completion → client gets 0            |

### Fuzz run counts

Configured in `contracts/foundry.toml`:

| Profile   | Fuzz runs | Use                                          |
| --------- | --------- | -------------------------------------------- |
| `default` | 10 000    | Local development                            |
| `staging` | 2 500     | Production-parity pre-deploy / staging check |
| `ci`      | 256       | CI (keeps job under 5 min)                   |

To switch profiles:

```bash
FOUNDRY_PROFILE=ci forge test       # fast CI pass
FOUNDRY_PROFILE=staging forge test  # staging check (or npm run foundry:test:staging)
```

### Running a single test

```bash
cd contracts && forge test --match-test test_HappyPath_CreateAcceptSubmitApprove -vvv
```

---

## Fork Integration Tests (`contracts/test/fork/`)

Fork tests run the same lifecycle flows as unit tests but against a **forked
Sepolia chain** instead of a blank in-memory EVM. This catches issues that only
appear when the deployer nonce is non-zero or real chain state is present -
conditions that match production exactly.

### Activation

Fork tests **skip automatically** when no RPC URL is configured, so they never
block offline development or CI. To run them:

1. Set `FORK_URL` in `.env` to any Sepolia (or mainnet) RPC endpoint. You can
   reuse `SEPOLIA_RPC_URL`:

   ```bash
   FORK_URL=https://eth-sepolia.g.alchemy.com/v2/<your-key>
   ```

2. Run the fork suite:

   ```bash
   npm run foundry:test:fork
   ```

   Or run all tests (including fork) under the staging profile:

   ```bash
   npm run foundry:test:staging
   ```

Optionally set `FORK_BLOCK_NUMBER` to pin to a specific block for reproducible
results. Omit it to fork from the latest block.

### What `FullLifecycleFork.t.sol` covers

| Test                                            | What it verifies                                                            |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| `test_Fork_HappyPath_CreateAcceptSubmitApprove` | Full lifecycle (create → accept → submit → approve) on forked chain state   |
| `test_Fork_DeployAddressPrediction`             | Nonce-based address prediction from `Deploy.s.sol` is correct on real chain |
| `test_Fork_DisputePath_FreelancerWins`          | Dispute → ruling → payout works against forked Sepolia                      |
| `test_Fork_CancelPending_RefundsClient`         | Cancellation refund is unaffected by live chain state                       |

---

## Adding New Tests

### Hardhat

1. Add the test inside the relevant `describe` block in
   `test/TrustLedger.test.ts`.
2. Use `STATUS` constants - never raw integers.
3. Use `impersonate()` and `makeCommitment()` helpers where applicable.
4. Call `deployContracts()` in `beforeEach` if the suite needs a clean state.

### Foundry unit tests

1. Name functions `test_<Scenario>_<Outcome>` (snake_case).
2. Add to the relevant contract under `contracts/test/unit/`.
3. Use `vm.prank(addr)` for single-call impersonation; `vm.startPrank(addr)` /
   `vm.stopPrank()` for multi-call blocks.
4. Prefer `vm.expectRevert(CustomError.selector)` over message-string reverts.

### Foundry fuzz tests

1. Name functions `testFuzz_<InvariantDescription>`.
2. Add to `contracts/test/fuzz/PayoutFuzz.t.sol` for payout math, or create a
   new file for unrelated invariants.
3. Bound inputs with `vm.assume(...)` or `bound(input, min, max)` to avoid
   trivial rejections.
4. Fuzz tests must express a mathematical invariant - not just a happy-path
   scenario.

### Foundry fork tests

1. Add files to `contracts/test/fork/` with a `.t.sol` suffix.
2. Start every `setUp()` with the skip guard:

   ```solidity
   string memory rpcUrl = vm.envOr("SEPOLIA_RPC_URL", string(""));
   vm.skip(bytes(rpcUrl).length == 0);
   vm.createSelectFork(rpcUrl);
   ```

3. Name functions `test_Fork_<Scenario>_<Outcome>`.
4. Fork tests should verify behaviour that differs between a blank EVM and a
   real chain - deployment ordering, nonce effects, and production-equivalent
   gas conditions.

---

## Local demo scripts (manual smoke tests)

These are not automated test suites; they exercise full flows on a local Hardhat
node. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup.

| Script                  | Command                   | What it verifies                                                           |
| ----------------------- | ------------------------- | -------------------------------------------------------------------------- |
| Happy path              | `npm run demo:good`       | ETH escrow lifecycle                                                       |
| Dispute                 | `npm run demo:bad`        | Commit-reveal + ruling                                                     |
| Juror reputation        | `npm run demo:jurors`     | Minority slash + juror reputation table                                    |
| Stablecoin + reputation | `npm run demo:stablecoin` | ERC-20 escrow, gas comparison, `submitRating` + `ReputationRegistry` reads |
| All scenarios           | `npm run demo:run`        | Interactive menu (options 1-7)                                             |

---

## GitHub Models prompts

Prompt files under `.github/prompts/` are evaluated in CI and locally. See
[GITHUB_MODELS.md](GITHUB_MODELS.md).

| Script                   | Purpose                                  |
| ------------------------ | ---------------------------------------- |
| `npm run models:install` | Install Python SDK deps                  |
| `npm run models:run`     | Run Python example scenarios             |
| `npm run models:eval`    | Run `gh models eval` on all prompt files |

---

## Pre-commit Checks

The Husky pre-commit hook runs automatically on every commit:

```text
npm run lint          # ESLint (test/**/*.ts, scripts/**/*.ts, hardhat.config.ts) + Solhint
npm run lint:frontend # ESLint on src/
npm run lint:prettier # Prettier check across the whole repo
```

Tests are **not** run on pre-commit (they are slow); they run in CI instead.

---

## CI Pipeline

Four parallel jobs run on every push and PR (`.github/workflows/ci.yml`):

| Job        | What runs                                                                               |
| ---------- | --------------------------------------------------------------------------------------- |
| Frontend   | `tsc --noEmit`, `lint:frontend`, `build:frontend`                                       |
| TypeScript | `tsc -p tsconfig.hardhat.json --noEmit`, `lint`, `prettier`                             |
| Hardhat    | `compile`, `hardhat:test` (146 integration tests)                                       |
| Solidity   | `forge fmt --check`, `forge build --sizes`, `forge test -vvv`, `forge snapshot --check` |

All four jobs must pass for a PR to merge.

A separate workflow,
[`.github/workflows/github-models.yml`](../.github/workflows/github-models.yml),
runs when `.github/prompts/` or `scripts/models/` change. See
[GITHUB_MODELS.md](GITHUB_MODELS.md).

---

## Environment Setup

No `.env` file is needed to run the unit or fuzz test suites - they run against
a local in-process Hardhat node or Foundry's internal EVM. A `.env` is only
required for testnet deployments and fork tests.

To enable fork integration tests, add `FORK_URL` (or `SEPOLIA_RPC_URL`) to
`.env`. Optionally set `FORK_BLOCK_NUMBER` to pin to a specific block.

**Prerequisites:**

```bash
# Node.js dependencies (root)
npm ci

# Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Compile contracts (generates TypeChain types required by Hardhat tests)
npm run compile
```

Then run:

```bash
npm run hardhat:test   # Hardhat suite
npm run foundry:test   # Foundry suite
```
