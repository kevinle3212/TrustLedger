# Contributing and Local Development

This guide covers everything needed to clone, compile, test, lint, and deploy TrustLedger locally.

---

## Prerequisites

| Tool    | Version  | Install                                              |
| ------- | -------- | ---------------------------------------------------- | ------------------ |
| Node.js | ≥ 22.0.0 | [nodejs.org](https://nodejs.org) or `nvm install 22` |
| npm     | Bundled  | Included with Node.js                                |
| Foundry | Latest   | `curl -L https://foundry.paradigm.xyz                | bash && foundryup` |
| Git     | Any      | [git-scm.com](https://git-scm.com)                   |

Verify your installation:

```bash
node --version    # v22.x.x or later
npm --version
forge --version   # forge 0.x.x
```

---

## Clone and Install

```bash
git clone https://github.com/kevinle3212/TrustLedger.git
cd TrustLedger

# Install Node.js dependencies (Hardhat, ethers, TypeChain, ESLint, Prettier)
npm install
```

No `forge install` is needed — Foundry dependencies (`forge-std`, `openzeppelin-contracts`) are committed directly to `contracts/lib/`.

---

## Environment Setup

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable               | Required for           | Description                                                                                       |
| ---------------------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| `SEPOLIA_RPC_URL`      | Testnet deploy / check | Ethereum Sepolia RPC endpoint.                                                                    |
| `DEPLOYER_PRIVATE_KEY` | Testnet deploy         | Private key of the deployer wallet. Use a dedicated testnet-only wallet that holds no real funds. |
| `ETHERSCAN_API_KEY`    | Contract verification  | Optional. Needed for `--verify` during deploy.                                                    |

**Never commit `.env`.** It is listed in `.gitignore`.

---

## Compile

```bash
# Compile all Solidity contracts and generate TypeScript types (TypeChain)
npm run compile
```

This runs `hardhat compile`, which reads sources from `contracts/src/`, outputs ABIs and bytecode to `artifacts/`, and generates TypeScript wrappers under `artifacts/typechain-types/`.

Foundry also compiles independently:

```bash
cd contracts
forge build
```

Both compilers use the same settings: `solc 0.8.24`, `optimizer_runs = 200`.

---

## Local Development

### Option A — Docker (no local toolchain required)

If you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed, this is the fastest path. Node.js and Foundry do not need to be installed on your machine.

```bash
git clone https://github.com/kevinle3212/TrustLedger.git
cd TrustLedger
git submodule update --init --recursive

docker compose build          # one-time image build (~2-3 min)

docker compose up demo-good   # happy path: create → accept → submit → approve → payout
docker compose up demo-bad    # dispute flow: create → accept → submit → dispute → vote → ruling
docker compose up node        # chain only — connect MetaMask to http://localhost:8545
docker compose run test       # full Hardhat + Foundry test suite
```

The `node` service exposes the chain at `http://localhost:8545` (chain ID 31337). Private keys for all 20 test accounts are printed on startup — import any of them into MetaMask to interact manually.

---

### Option B — Local toolchain

### 1. Start a local Hardhat chain

```bash
npm run node
```

This starts a local EVM node at `http://127.0.0.1:8545` (chain ID 31337) and prints 20 funded test accounts with their private keys. Keep this terminal open.

### 2. Deploy contracts

In a second terminal:

```bash
npm run hardhat:deploy:local
```

This deploys `JurorRegistry`, `TrustLedger`, and `Arbitration` in the correct order and writes their addresses to `artifacts/deployed-addresses.json`. The address file is consumed automatically by the demo scripts.

**Or do both steps in a single command:**

```bash
npm run start:deploy:local
```

This compiles, starts the local node in the background, waits for it to be ready, then deploys. The node keeps running after the deploy — stop it with `pkill -f "hardhat node"` when done.

### 3. Run the demo scripts

```bash
# Happy path: create → accept → submit → approve → full payout
npm run demo:good

# Dispute flow: create → accept → submit → dispute → vote → ruling → partial payout
npm run demo:bad
```

Both demos advance EVM time using `evm_increaseTime` to skip lock periods and voting windows, so the full flow completes in seconds.

---

## Hardhat Tests

The Hardhat test suite covers the full contract surface in TypeScript using Mocha, Chai, and ethers.js v6 with TypeChain-generated types.

```bash
# Compile (required before first test run or after contract changes)
npm run compile

# Run all 73 Hardhat tests
npm run hardhat:test
```

The suite includes:

| Group                         | Coverage                                                             |
| ----------------------------- | -------------------------------------------------------------------- |
| Deployment                    | Address correctness, immutable references                            |
| Happy path                    | Create → accept → submit → approve → full fund release               |
| Cancel pending                | Client cancels before acceptance; refund verified                    |
| Rejection                     | Freelancer rejects; client refunded                                  |
| Deadline miss                 | Client reclaims after project deadline                               |
| Acceptance window             | Freelancer auto-claims after window                                  |
| Hold-back and warranty        | Partial payout, warranty clock, release after period                 |
| Dispute flow                  | Fee pool transfer, status change, Arbitration contract state         |
| `executeRuling`               | 0%, 100%, and 50% split payouts verified by balance diff             |
| Revert cases                  | Invalid inputs: `ZeroAddress`, `SelfContract`, etc.                  |
| ERC-20 escrow                 | Create, approve, reject, cancel, warranty, dispute, ruling           |
| Chainlink price feed          | USD value stored, zero on bad price, double-init revert              |
| VRF mock                      | Request on dispute open, juror pre-selection, VRF-only enforcement   |
| Full arbitration dispute flow | Commit → reveal → finalize → execute; majority and minority handling |
| Appeal flow                   | Bond, window, non-party, double-appeal, bond return and forfeiture   |
| Reputation registry           | Bidirectional rating, accumulation, bounds, double-rate, timing      |

---

## Foundry Tests

The Foundry suite runs Solidity-native unit and fuzz tests. Fuzz tests run 10,000 random inputs per test by default.

```bash
cd contracts

# Run all tests
forge test

# Verbose output with full traces
forge test -vvv

# Run a specific test suite
forge test --match-contract TrustLedgerTest
forge test --match-contract JurorRegistryTest
forge test --match-contract ReputationRegistryTest
forge test --match-contract PayoutFuzz

# Run a single test by name
forge test --match-test test_HappyPath_CreateAcceptSubmitApprove
forge test --match-test testFuzz_PayoutConservation

# Gas cost report
forge test --gas-report
```

| Suite                          | Tests | Type            |
| ------------------------------ | ----- | --------------- |
| `TrustLedgerTest.t.sol`        | 33    | Unit            |
| `JurorRegistryTest.t.sol`      | 22    | Unit            |
| `ReputationRegistryTest.t.sol` | 11    | Unit            |
| `PayoutFuzz.t.sol`             | 7     | Fuzz (10k runs) |

---

## Linting

```bash
# Run all linters
npm run lint

# Solhint — Solidity style and security rules
npm run lint:sol

# ESLint — TypeScript style rules
npm run lint:ts

# Prettier — check formatting for all files
npm run lint:prettier

# Forge fmt — Solidity formatting
cd contracts && forge fmt --check
```

To auto-fix Prettier formatting:

```bash
npx prettier --write .
```

To auto-fix Forge formatting:

```bash
cd contracts && forge fmt
```

---

## Nexus Code Graph (AI Context)

`nexus-graph` indexes the TypeScript and JavaScript source into a SQLite symbol graph and serves it to Claude Code as an MCP server. This gives Claude token-budgeted context about functions, classes, and their dependencies without reading every file.

The MCP server is configured in `.mcp.json` at the repo root. Claude Code picks it up automatically on session start.

```bash
# Build or refresh the symbol graph (run from repo root)
npm run nexus:index

# Start the MCP server manually (Claude Code auto-starts it via .mcp.json)
npm run nexus:server

# Open a local browser visualization of the code graph
npm run nexus:viz
```

Re-run `nexus:index` after large refactors to keep the graph current. The generated database lives in `.nexus/graph.db` (gitignored).

---

## Frontend Development

The `src/` directory is a standalone Next.js 16 package. It has its own `package.json` and `node_modules` — it is not part of the root npm workspace.

### Install

```bash
cd src
npm install
```

### Environment variables

All frontend env vars are read from the root `.env` file by `next.config.ts` — no `src/.env.local` is needed.

| Variable                               | Description                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Free ID from [cloud.walletconnect.com](https://cloud.walletconnect.com). Already in root `.env`. |
| `NEXT_PUBLIC_TRUSTLEDGER_ADDRESS`      | Auto-resolved from `artifacts/deployed-addresses.json`. Only set manually to override.           |
| `NEXT_BASE_PATH`                       | URL prefix. `NEXT_BASE_PATH=` (empty) serves from root `/`. Already set in root `.env`.          |

### Running the dev server

Start the contracts node and compile first (if interacting with the local chain):

```bash
# repo root — terminal 1
npm run node

# repo root — terminal 2
npm run compile && npm run hardhat:deploy:local
```

Then start the frontend:

```bash
# src/
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Linting

```bash
# from src/
npm run lint          # ESLint + Prettier
npm run lint:ts       # ESLint only
npm run lint:prettier # Prettier only
```

### Building

```bash
# from src/
npm run build    # static export to src/out/
```

The build is also verified automatically in the `frontend` CI job on every push and pull request.

---

## Deploying to Ethereum Sepolia

Requires `SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, and `ETHERSCAN_API_KEY` in `.env`.

### Hardhat

```bash
# Compile then deploy
npm run hardhat:deploy:sepolia

# Or in a single command (also runs foundry:build first)
npm run start:deploy:hardhat
```

Deploys all three contracts, prints addresses to the console, and writes them to
`artifacts/deployed-addresses.json`.

### Foundry (npm scripts)

```bash
# Dry-run — simulate against Sepolia, no broadcast (also runs foundry:build first)
npm run start:deploy:dry-run

# Live deploy — broadcast + Etherscan verification (also runs foundry:build first)
npm run start:deploy:foundry

# Or call the underlying scripts directly
npm run foundry:deploy:sepolia:dry-run
npm run foundry:deploy:sepolia
```

The scripts load `.env` automatically and use the named `sepolia` network configured in
`contracts/foundry.toml` (`[rpc_endpoints]` + `[etherscan]`).

### Foundry (manual)

```bash
# Dry-run simulation
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  -vvvv

# Live deploy with Etherscan verification
forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -vvvv
```

After either deploy, addresses are printed to the console. The Hardhat script also writes them to
`artifacts/deployed-addresses.json`. Foundry saves broadcast receipts to
`contracts/broadcast/Deploy.s.sol/11155111/`.

To get Ethereum Sepolia test ETH, use a Sepolia faucet (Alchemy, Infura, or Google).

---

## Checking Testnet Balance

```bash
npm run hardhat:check-balance
```

Prints the balance of the configured deployer wallet on the connected network.

---

## Git Hooks

Two hooks are enforced automatically via [Husky](https://typicode.github.io/husky/) on every commit.

### pre-commit — linting and formatting

Runs `npm run lint` (ESLint + Solhint) and `npm run lint:prettier` (Prettier format check) before the commit is recorded. If any error is found the commit is aborted. Fix the errors and re-run `git commit`.

### commit-msg — conventional commits

Runs [commitlint](https://commitlint.js.org/) against the commit message using the `@commitlint/config-conventional` ruleset. The message must follow the pattern:

```text
<type>(<optional scope>): <description>
```

Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `revert`.

Examples of valid messages:

```text
feat: add appeal bond refund on ruling change
fix(arbitration): prevent double reveal after deadline
docs: update deploy order in ARCHITECTURE.md
chore: bump hardhat to 2.28.6
```

If the commit message is rejected, amend it with `git commit --amend` and try again.

---

## Code Style

- **Solidity:** `forge fmt` for formatting; `solhint` for rules. No magic numbers — use named constants. Custom errors over `require` strings.
- **TypeScript:** `eslint` + `prettier`. Strict mode. `node:` prefix on built-in imports.
- **Commits:** Follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, etc.). Enforced automatically by the `commit-msg` hook.

---

## Opening a Pull Request

1. Fork the repository and create a branch: `git checkout -b feat/your-feature`.
2. Make changes and ensure all tests pass: `npm run hardhat:test` and `cd contracts && forge test`.
3. Run linters: `npm run lint && npm run lint:prettier`.
4. Push and open a pull request against `main`.
5. CodeRabbit will automatically review the PR. Address any comments before requesting a human review.

For security-related findings, do not open a public PR. Instead, follow the process in [SECURITY.md](../SECURITY.md).

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
