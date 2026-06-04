# Docker Guide

TrustLedger ships with a multi-stage Docker image and a `docker-compose.yml`
that lets you run demos, start a local chain for MetaMask, and execute the full
test suite - all without installing Node.js or Foundry on your machine.

> **Scope:** Docker covers the contracts and Hardhat environment only. The
> Next.js frontend (`src/`) does not need Docker - run it directly with
> `npm run dev:frontend` (from `src/`). See [`src/README.md`](../src/README.md)
> for frontend setup. GitHub Models prompts run via `npm run models:*` on the
> host or in [`github-models.yml`](../.github/workflows/github-models.yml) - see
> [GITHUB_MODELS.md](GITHUB_MODELS.md).

---

## Docker Files Reference

| File                            | Type                      | Purpose                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Dockerfile`                    | Production / demo         | Two-stage build: copies Foundry binaries from `ghcr.io/foundry-rs/foundry`, sets up Node.js 22 with `git`, `curl`, and `ca-certificates`, installs npm dependencies, and pre-compiles contracts via Hardhat and Foundry at image build time so the container starts instantly. Entrypoint is `scripts/docker-demo.sh`. Used by the root `docker-compose.yml`. |
| `docker-compose.yml`            | Orchestration             | Defines six demo services (`demo-good`, `demo-bad`, `demo-jurors`, `demo-stablecoin`, `node`, `test`) that all build from `Dockerfile`. Sets the `DEMO` env var per service to control which demo script `docker-demo.sh` runs. Exposes port 8545 on the host.                                                                                                |
| `docker/Dockerfile.dev`         | Development               | Same two-stage Node + Foundry base as the root `Dockerfile` but designed for live development: source files are mounted as a volume so edits appear inside the container immediately without rebuilding the image. Entrypoint is `scripts/docker-demo.sh`. Used by `docker/docker-compose.dev.yml`.                                                           |
| `docker/docker-compose.dev.yml` | Development orchestration | Builds from `docker/Dockerfile.dev` with the repo root as the build context, mounts the repo root as a live volume (excluding `node_modules`), loads secrets from the root `.env` via `env_file`, and runs `npm run node` (Hardhat local chain) on port 8545.                                                                                                 |
| `docker/Dockerfile.ci`          | CI verification           | Runs the full test suite as Docker `RUN` build steps: `npm run compile` → `npm run hardhat:test` → `cd contracts && forge test`. Has no entrypoint - the image build fails if any step fails. Use this to locally reproduce exactly what GitHub Actions runs without setting up a full CI environment.                                                        |

---

## Prerequisites

| Tool           | Version | Install                                                                               |
| -------------- | ------- | ------------------------------------------------------------------------------------- |
| Docker Desktop | ≥ 4.x   | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |
| Git            | Any     | [git-scm.com](https://git-scm.com)                                                    |

Docker Desktop includes both the Docker daemon and the `docker compose` CLI. No
separate `docker-compose` (v1) install is needed.

Verify your installation:

```bash
docker --version        # Docker version 24.x or later
docker compose version  # Docker Compose version v2.x or later
```

---

## One-Time Setup

### 1. Clone the repository

```bash
git clone https://github.com/kevinle3212/TrustLedger.git
cd TrustLedger
```

### 2. Initialize Git Submodules

The Foundry dependencies (`forge-std` and `openzeppelin-contracts`) are tracked
as git submodules in `contracts/lib/`. This step populates those directories:

```bash
git submodule update --init --recursive
```

If you skip this step, `forge build` will fail during the Docker image build.

### 3. Build the image

```bash
docker compose build
```

This takes approximately 2-3 minutes the first time. It:

1. Pulls `node:22-bookworm-slim` (Node.js runtime) and
   `ghcr.io/foundry-rs/foundry` (Forge, Cast, Anvil binaries).
2. Copies the Foundry binaries into the Node image.
3. Runs `npm ci` to install all Node dependencies.
4. Runs `npm run compile` (Hardhat compile + TypeChain type generation).
5. Runs `forge build` (Foundry compile + cache).

Subsequent builds are fast because Docker caches each layer. A layer is only
rebuilt when its inputs change (e.g., a new package in `package.json` or a
contract source edit).

---

## Services

Four services are defined in `docker-compose.yml`. All of them use the same
image.

### `demo-good` - Happy path demo

```bash
docker compose up demo-good
```

Starts the Hardhat node, deploys all three contracts, then runs the happy-path
demo:

1. Client deposits 1 ETH into escrow.
2. Freelancer signs acceptance (ECDSA wallet binding).
3. Freelancer submits proof of work (IPFS hash).
4. Client approves → **1 ETH released to freelancer.**

After the demo completes, the node stays running at `http://localhost:8545` so
you can inspect chain state. Press `Ctrl+C` to stop.

### `demo-bad` - Dispute flow demo

```bash
docker compose up demo-bad
```

Starts the node, deploys, then runs the dispute-flow demo:

1. Jurors register with 0.1 ETH stake each.
2. 7-day stake lock elapses (EVM time-travel).
3. Client deposits 1 ETH into escrow.
4. Freelancer accepts and submits proof of work.
5. Client disputes instead of approving.
6. Jurors commit hidden votes (50% completion, commit-reveal).
7. Phase advances to reveal.
8. Jurors reveal their votes.
9. 72-hour reveal window elapses (EVM time-travel).
10. Dispute finalized - median ruling computed.
11. 72-hour appeal window elapses (EVM time-travel).
12. Ruling executed → **~0.258 ETH released to freelancer.**

The entire flow completes in seconds because `evm_increaseTime` is used to skip
lock and voting windows.

### `demo-jurors` - Juror reputation system demo

```bash
docker compose up demo-jurors
```

Starts the node, deploys, then demonstrates the juror reputation and slashing
system:

1. Three jurors register with different stakes (0.1, 0.2, 0.3 ETH).
2. Baseline reputation table printed (all start at 100).
3. 7-day stake lock elapses (EVM time-travel) - all 3 become eligible.
4. Client creates a 1 ETH escrow; freelancer accepts and submits proof.
5. Client disputes; J1 and J2 commit **70%** (majority), J3 commits **20%**
   (minority).
6. Reveal phase: all votes revealed.
7. Dispute finalized - median ruling is 70%.
8. J3's deviation (50 pct-points from median) exceeds the severe threshold →
   **20% stake slash, −10 reputation**.
9. Final reputation table printed with before/after diff for each juror.

### `demo-stablecoin` - ERC-20 escrow and reputation demo

```bash
docker compose up demo-stablecoin
```

Starts the node, deploys (including `ReputationRegistry`), then runs
`scripts/demo/demo-stablecoin.ts`:

1. Deploys a `MockERC20` stablecoin and mints tokens to the client.
2. Gas benchmark: `createContract` with ETH vs ERC-20 escrow.
3. Full happy path on token escrow (accept → submit → approve).
4. Both parties call `submitRating`; scores read back from `ReputationRegistry`.

On L2 networks, stablecoin escrows avoid ETH price exposure while keeping
similar per-tx gas costs.

### Interactive scenario runner (local only)

Docker covers the four scripted demos above. For all seven interactive options
(five dispute outcomes plus juror and stablecoin demos), use the runner on your
local machine. After each scenario completes it loops back to the menu - press
`Ctrl+C` to exit:

```bash
# Interactive menu - type 1-7 at the prompt
npm run demo:run

# Or pass the scenario number directly
./scripts/run-demo.sh 1   # Plaintiff (client) wins - unanimous 0% ruling
./scripts/run-demo.sh 2   # Defendant (freelancer) wins - unanimous 100% ruling
./scripts/run-demo.sh 3   # Tie - unanimous 50% ruling
./scripts/run-demo.sh 4   # Arbitration ruling, in favor of client (minority slashed)
./scripts/run-demo.sh 5   # Arbitration ruling, in favor of freelancer (minority slashed)
./scripts/run-demo.sh 6   # Juror reputation demo (same flow as demo-jurors)
./scripts/run-demo.sh 7   # Stablecoin escrow demo (same flow as demo-stablecoin)
```

The runner auto-starts the Hardhat node and deploys contracts if they are not
already running. See [CONTRIBUTING.md](./CONTRIBUTING.md#case-scenarios) for the
full scenario table.

### `node` - Local chain only

```bash
docker compose up node
```

Starts the Hardhat node and keeps it running at `http://localhost:8545` (chain
ID 31337). No contracts are deployed. Use this service when you want to deploy
and interact manually via MetaMask, Remix IDE, or your own scripts.

Hardhat prints 20 pre-funded test accounts and their private keys on startup.
Each account starts with 10,000 ETH - no faucet needed.

### `test` - Full test suite

```bash
docker compose run test
```

Runs all tests inside the container and exits when done:

- 146 Hardhat / Mocha / Chai integration tests (TypeScript)
- 37 Foundry unit tests (`TrustLedgerTest`)
- 29 Foundry unit tests (`JurorRegistryTest`)
- 11 Foundry unit tests (`ReputationRegistryTest`)
- 7 Foundry fuzz tests (`PayoutFuzz`, 10,000 runs each)

Fork integration tests (`FullLifecycleFork`) are skipped inside Docker because
no `FORK_URL` is set in the default environment. To run them, pass the variable
explicitly:

```bash
docker compose run -e FORK_URL=<your-rpc-url> test bash -c "cd contracts && forge test --match-contract FullLifecycleFork -vvv"
```

Note: `docker compose run` (not `up`) is used here because `test` is a one-shot
job that should exit when finished, not restart.

---

## Testing Inside Docker

### Run the full suite

```bash
docker compose run test
```

Runs all 230 tests in sequence and exits with a non-zero code if any fail.

| Suite                          | Count | Type                     | Runner  |
| ------------------------------ | ----- | ------------------------ | ------- |
| `TrustLedger.test.ts`          | 146   | Integration (TypeScript) | Hardhat |
| `TrustLedgerTest.t.sol`        | 37    | Unit                     | Foundry |
| `JurorRegistryTest.t.sol`      | 29    | Unit                     | Foundry |
| `ReputationRegistryTest.t.sol` | 11    | Unit                     | Foundry |
| `PayoutFuzz.t.sol`             | 7     | Fuzz (10,000 runs each)  | Foundry |

### Run a specific suite

```bash
# Hardhat integration tests only
docker compose run test bash -c "npm run hardhat:test"

# Foundry - TrustLedger contract (with full traces)
docker compose run test bash -c "cd contracts && forge test --match-contract TrustLedgerTest -vvv"

# Foundry - JurorRegistry contract
docker compose run test bash -c "cd contracts && forge test --match-contract JurorRegistryTest -vvv"

# Foundry - ReputationRegistry contract
docker compose run test bash -c "cd contracts && forge test --match-contract ReputationRegistryTest -vvv"

# Foundry - fuzz suite only
docker compose run test bash -c "cd contracts && forge test --match-contract PayoutFuzz -vv"

# Single test by name
docker compose run test bash -c "cd contracts && forge test --match-test test_HappyPath_CreateAcceptSubmitApprove -vvvv"

# Gas cost report
docker compose run test bash -c "cd contracts && forge test --gas-report"
```

### What each suite covers

#### `TrustLedger.test.ts` - Hardhat integration tests (146 tests)

End-to-end TypeScript tests that deploy all contracts to a live Hardhat node and
drive them through full lifecycle flows using ethers.js and TypeChain-generated
types. Balance diffs are verified at each payout step.

| Group                  | What it covers                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| Deployment             | Contract addresses and immutable references wired correctly                                        |
| Happy path             | Create → accept (ECDSA signature) → submit proof of work → approve → full ETH payout               |
| Cancel pending         | Client cancels before freelancer accepts; full refund verified by balance diff                     |
| Rejection              | Freelancer rejects; client refunded; status set to `CANCELLED`                                     |
| Deadline miss          | Client reclaims escrow after project deadline passes                                               |
| Acceptance window      | Freelancer auto-claims release after acceptance window elapses via `evm_increaseTime`              |
| Hold-back and warranty | Partial payout on approval; warranty clock; full release after period                              |
| Dispute flow           | Fee pool transferred to `Arbitration`; status set to `DISPUTED`; dispute opened on-chain           |
| `executeRuling`        | 0%, 100%, and 50% split payouts each verified by balance diff                                      |
| Revert cases           | Invalid inputs: zero address, self-contract, bad signature, wrong caller, wrong status             |
| ERC-20 escrow          | Full lifecycle (create, approve, reject, cancel, warranty, dispute, ruling) with token not ETH     |
| Chainlink price feed   | USD value stored on creation; zero when price feed returns ≤ 0; double-init reverts                |
| VRF mock               | VRF randomness requested on dispute open; jurors pre-selected; non-VRF commits rejected            |
| Full arbitration       | Commit → reveal → finalize → execute ruling; majority/minority handling; reward claim after window |
| Appeal flow            | Bond validation, window enforcement, non-party rejection, double-appeal, bond return/forfeiture    |
| Reputation registry    | Bidirectional rating, accumulation, score bounds, double-rate prevention, timing enforcement       |

#### `TrustLedgerTest.t.sol` - Foundry unit tests (33 tests)

Solidity-native tests targeting `TrustLedger.sol` using Foundry `vm` cheatcodes
for time travel, address pranking, and revert matching.

| Group              | What it covers                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Happy path         | Create/accept/submit/approve with and without hold-back                                                                |
| Cancel / reject    | Refund paths and status transitions                                                                                    |
| Deadline / window  | Client reclaim and auto-release flows                                                                                  |
| Dispute and ruling | Fee pool routing; 0%, 50%, and 100% payout splits                                                                      |
| Payout math        | Fuzz over `completionPct`: client + freelancer receipts always equal escrowed total                                    |
| Revert guards      | All invalid-input paths across `createContract`, `acceptContract`, `approveWork`, `executeRuling`, `submitProofOfWork` |
| Ancillary          | Rating no-op when registry unset; `nextId` increments after each creation                                              |

#### `JurorRegistryTest.t.sol` - Foundry unit tests (22 tests)

Tests `JurorRegistry.sol` - the staking and eligibility contract that manages
the juror pool.

| Group         | What it covers                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| Registration  | Sufficient stake accepted; below-minimum and duplicate registration reverted                           |
| Unstaking     | Lock period enforced; deactivation if stake drops below minimum; active-dispute block                  |
| Staking       | Adding stake resets the lock period                                                                    |
| Eligibility   | Initially false; true after lock period; false when inactive                                           |
| Slashing      | Stake reduced and minority-vote count decremented; deactivation below minimum; Arbitration-only access |
| Lock / unlock | Active dispute counter incremented and decremented; participated counter on unlock; access control     |
| Juror count   | Eligible juror count reflects active, locked jurors correctly                                          |

#### `ReputationRegistryTest.t.sol` - Foundry unit tests (11 tests)

Tests `ReputationRegistry.sol` - the on-chain rating system for clients and
freelancers.

| Group          | What it covers                                                                     |
| -------------- | ---------------------------------------------------------------------------------- |
| Construction   | Zero-address reverts; immutable `TrustLedger` reference set correctly              |
| Rating         | Score recorded; multiple ratings accumulated; boundary scores (1 and 100) accepted |
| Access control | Only `TrustLedger` can call `rate()`; zero score and above-100 reverted            |
| Averages       | Unrated users return zero; scores accumulate independently per address             |

#### `PayoutFuzz.t.sol` - Foundry fuzz tests (7 tests, 10,000 runs each)

Property-based tests that send random inputs across the full `uint` range into
the payout math to prove invariants hold universally.

| Test                                     | Property verified                                                    |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `testFuzz_PayoutConservation`            | client + freelancer receipts always equal the full escrowed amount   |
| `testFuzz_PartialPayoutFormula`          | partial payout matches the proportional formula for any completion % |
| `testFuzz_BufferFactorDeadline`          | deadline computed from buffer factor never overflows                 |
| `testFuzz_HoldBackBounds`                | hold-back amount never exceeds the escrowed principal                |
| `testFuzz_FeePoolBounds`                 | arbitration fee never exceeds the escrowed amount                    |
| `testFuzz_ZeroPct_FreelancerGetsNothing` | 0% completion → freelancer receives exactly 0                        |
| `testFuzz_FullPct_ClientGetsNothing`     | 100% completion → client receives exactly 0                          |

### Verify commitlint inside Docker

```bash
# Should pass silently (exit 0)
docker compose run test bash -c "echo 'feat: add docker test' | npx commitlint"

# Should fail with errors (exit 1)
docker compose run test bash -c "echo 'bad message' | npx commitlint; echo exit \$?"
```

---

## Connecting MetaMask to the Docker Node

When `demo-good`, `demo-bad`, `demo-jurors`, or `node` is running, the chain is
accessible from your host machine at `http://localhost:8545`.

### Add the network to MetaMask

| Field        | Value                   |
| ------------ | ----------------------- |
| Network name | `Hardhat`               |
| RPC URL      | `http://127.0.0.1:8545` |
| Chain ID     | `31337`                 |
| Currency     | `ETH`                   |

### Import a test account

When the container starts, Hardhat prints all 20 test accounts with their
private keys. Copy any private key and import it into MetaMask. These are
ephemeral dev keys - **never use them on mainnet or with real funds.**

| Role       | Account index |
| ---------- | ------------- |
| Client     | Account #0    |
| Freelancer | Account #1    |
| Juror 1    | Account #2    |
| Juror 2    | Account #3    |
| Juror 3    | Account #4    |

---

## Rebuilding After Changes

If you edit contract source files or `package.json`, rebuild the image before
running:

```bash
docker compose build
docker compose up demo-good
```

To force a full rebuild without the layer cache (useful if a dependency update
is not being picked up):

```bash
docker compose build --no-cache
```

---

## Running a Single Demo Command Directly

You can skip `docker-compose.yml` and run the image directly:

```bash
# Build the image
docker build -t trustledger .

# Happy-path demo
docker run -e DEMO=good -p 8545:8545 trustledger

# Dispute-flow demo
docker run -e DEMO=bad -p 8545:8545 trustledger

# Node only
docker run -e DEMO=node -p 8545:8545 trustledger

# Both demos in sequence
docker run -e DEMO=both -p 8545:8545 trustledger
```

The `DEMO` environment variable controls what the container does after the node
starts. Valid values: `good`, `bad`, `both`, `node`.

---

## How the Image Is Built

The `Dockerfile` at the project root uses a two-stage build:

```text
Stage 1 - foundry-bin
  FROM ghcr.io/foundry-rs/foundry:latest
  (official Foundry image - contains forge, cast, anvil)

Stage 2 - trustledger
  FROM node:22-bookworm-slim
  COPY --from=foundry-bin forge cast anvil → /usr/local/bin/
  RUN apt-get install git curl
  COPY package.json package-lock.json → RUN npm ci
  COPY . .
  RUN git submodule update --init --recursive
  RUN npm run compile && forge build
  EXPOSE 8545
  ENTRYPOINT ["bash", "scripts/docker-demo.sh"]
```

Copying Foundry binaries from the official image avoids running the `foundryup`
shell script, making the build reproducible and faster.

---

## Troubleshooting

### Port 8545 already in use

Another process (e.g., a local `npm run node`) is using port 8545. Either stop
that process or run the container on a different host port:

```bash
docker run -e DEMO=good -p 9545:8545 trustledger
```

Then set MetaMask's RPC URL to `http://127.0.0.1:9545`.

### `git submodule update` Fails at Build Time

The image build runs `git submodule update --init --recursive` if `.git/` is
present in the build context. If your clone is missing submodule content, run
this on your host before building:

```bash
git submodule update --init --recursive
docker compose build
```

### Container exits immediately

Check the output for an error before the node started. Common causes:

- `npm run compile` failed - check that `contracts/lib/` is populated (submodule
  issue).
- Missing `artifacts/` - the compile step was skipped. Rebuild the image.

### `DEMO` value not recognized

If you see `Unknown DEMO='...'`, the environment variable was set incorrectly.
Valid values are `good`, `bad`, `both`, and `node` (lowercase).

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

- [Kevin Le](https://www.linkedin.com/in/lekevin1/)
- [Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)
