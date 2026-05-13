# TrustLedger

A Solidity-based smart contract system for secure escrow-based transactions that's built on the Ethereum blockchain.

## Setup

1. Copy the example env file:

    ```bash
    cp .env.example .env
    ```

2. Fill in `.env` based on your target network:

### Local Development (Hardhat node)

When running `npm run node` + `npm run deploy:local` you don't need any external accounts or RPC URLs. Hardhat boots a local chain and provides 20 pre-funded test accounts with known private keys.

Start the node and grab the keys it prints:

```bash
npm run node
```

Hardhat will print output like this on startup:

```txt
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Copy account #0's values into `.env`:

```txt
DEPLOYER_PUBLIC_ADDRESS=0x...  # from Account #0 above
DEPLOYER_PRIVATE_KEY=0x...
```

Leave `ARBITRUM_SEPOLIA_RPC_URL` and `ETHERSCAN_API_KEY` blank — they are not used for local deployments.

Then deploy:

```bash
npm run deploy:local
```

### Arbitrum Sepolia (testnet)

Generate a fresh deployer wallet with `cast` (Foundry, already installed):

```bash
cast wallet new
```

Output:

```txt
Successfully created new keypair.
Address:     0xAbCd...
Private key: 0x1234...
```

Copy those values into `.env`, then fill in the remaining variables:

| Variable                   | Description                              | Where to get it                                                                                                                   |
| -------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ARBITRUM_SEPOLIA_RPC_URL` | RPC endpoint                             | [Alchemy](https://www.alchemy.com) or [Infura](https://www.infura.io) — create a free app and copy the Arbitrum Sepolia HTTPS URL |
| `DEPLOYER_PUBLIC_ADDRESS`  | Address printed by `cast wallet new`     | See above                                                                                                                         |
| `DEPLOYER_PRIVATE_KEY`     | Private key printed by `cast wallet new` | See above. **Never commit this value.**                                                                                           |
| `ETHERSCAN_API_KEY`        | Arbiscan key for contract verification   | [arbiscan.io/register](https://arbiscan.io/register) — free account, then My API Keys                                             |

Fund the deployer wallet with Sepolia ETH before deploying: [Arbitrum Sepolia faucet](https://www.alchemy.com/faucets/arbitrum-sepolia).

`.env` is listed in `.gitignore` and will never be committed.

---

## Development

### npm scripts

| Script                                   | What it runs                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| `npm run compile`                        | Hardhat: compile Solidity → generate ABIs + TypeChain types in `artifacts/`    |
| `npm run hardhat:test`                   | Hardhat: run Mocha/Chai integration tests in `test/`                           |
| `npm run node`                           | Hardhat: spin up a local chain on `localhost:8545` with 20 pre-funded accounts |
| `npm run deploy:local`                   | Hardhat: deploy contracts to the local node                                    |
| `npm run hardhat:deploy:arbitrumSepolia` | Hardhat: deploy to Arbitrum Sepolia testnet                                    |
| `npm run check:balance`                  | Hardhat: print the deployer's ETH balance on Arbitrum Sepolia                  |
| `npm run report:gas`                     | Foundry: run `forge test --gas-report` and print per-function gas usage        |
| `npm run lint`                           | ESLint (TypeScript) + Solhint (Solidity)                                       |
| `npm run lint:ts`                        | ESLint only                                                                    |
| `npm run lint:sol`                       | Solhint only                                                                   |
| `npm run lint:prettier`                  | Prettier format check (read-only)                                              |
| `npm run build`                          | `tsc` — compile `src/` to `dist/`                                              |

### Testing

The project has two independent test suites that must both pass.

**Hardhat (Mocha/Chai) — integration tests:**

```bash
npm run hardhat:test
```

Tests live in `test/`. They compile via `tsconfig.hardhat.json` and connect to an in-memory Hardhat EVM. TypeChain generates typed contract wrappers in `artifacts/typechain-types/` after each compile.

**Foundry (Forge) — unit + fuzz + invariant tests:**

```bash
cd contracts && forge test -vvv
```

Tests live in `contracts/test/`. Foundry config (`contracts/foundry.toml`) sets:

- Fuzz: 10,000 runs per fuzz test
- Invariant: 256 runs × 500 call depth

To see per-function gas costs:

```bash
npm run report:gas
```

### Linting and formatting

The project enforces maximum-strictness TypeScript and consistent Solidity style.

**Run all linters at once:**

```bash
npm run lint
```

**TypeScript — ESLint:**

Configured in `eslint.config.mjs` using the ESLint 9 flat config format. Extends `typescript-eslint`'s `strictTypeChecked` + `stylisticTypeChecked` presets with additional rules for async correctness, explicit return types, and no `any`. Type-aware rules use both `tsconfig.json` (source) and `tsconfig.hardhat.json` (scripts, tests, config).

**TypeScript — Prettier:**

```bash
npm run lint:prettier       # check only
npx prettier --write .      # auto-fix
```

Prettier is the last layer in the ESLint config (`eslint-config-prettier`) so the two tools never conflict.

**Solidity — Solhint:**

```bash
npm run lint:sol
```

Checks `contracts/src/`, `contracts/test/`, and `contracts/script/`.

**Solidity — Forge fmt:**

```bash
cd contracts && forge fmt        # auto-fix
cd contracts && forge fmt --check  # CI check only
```

### TypeScript configuration

The project uses two `tsconfig` files to satisfy different runtime environments:

| File                    | Used by                                  | Module system                  |
| ----------------------- | ---------------------------------------- | ------------------------------ |
| `tsconfig.json`         | `src/` (library output to `dist/`)       | NodeNext ESM                   |
| `tsconfig.hardhat.json` | `hardhat.config.ts`, `scripts/`, `test/` | CommonJS (Hardhat requirement) |

Both extend `@tsconfig/strictest` and layer additional compiler flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, etc.).

### Why Hardhat 2.x, not 3.x

This project pins `hardhat@^2.x` and `@nomicfoundation/hardhat-toolbox@^5.x` intentionally. Hardhat 3.x was evaluated and reverted for the following reasons:

| Concern | Hardhat 2.x | Hardhat 3.x (alpha) |
| ------- | ----------- | ------------------- |
| **TypeChain** | `@typechain/hardhat` has stable, first-class support | No stable TypeChain plugin — 3.x overhauled the plugin API |
| **Toolbox** | `hardhat-toolbox@5` bundles TypeChain + ethers v6 + gas reporter + coverage in one package | 3.x toolbox is separate, incomplete, and still evolving |
| **ESM / CJS** | Works reliably with `"module": "CommonJS"` + `ts-node` CJS override needed for Node.js 25 | Defaults to ESM, which breaks the `ts-node` CJS workaround and would require a larger rearchitecture |
| **Plugin ecosystem** | `hardhat-gas-reporter`, `solidity-coverage`, Slither all verified working | Support varies — several plugins have not published 3.x-compatible releases |
| **Stability** | Mature, semver-stable release line | Alpha — breaking changes between releases disrupt local and CI workflows |

Upgrade to Hardhat 3.x once it reaches a stable release and TypeChain publishes a compatible plugin.

---

## Docker Usage

The Docker setup gives every contributor an identical environment — same Node version, same Foundry version, same compiler — without installing anything on the host beyond Docker itself.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin)

### Dev container (Phase 1)

Build the image and start the Hardhat node:

```bash
# First time, or after package-lock.json changes
docker compose -f docker/docker-compose.dev.yml build

# Start the dev environment (Hardhat node on localhost:8545)
docker compose -f docker/docker-compose.dev.yml up
```

Open a shell inside the container for ad-hoc commands:

```bash
docker compose -f docker/docker-compose.dev.yml exec dev bash
```

Run the test suites from inside the container:

```bash
# Hardhat tests
docker compose -f docker/docker-compose.dev.yml exec dev npm run hardhat:test

# Foundry tests
docker compose -f docker/docker-compose.dev.yml exec dev bash -c "cd contracts && forge test"
```

When you're done, stop and remove the container:

```bash
docker compose -f docker/docker-compose.dev.yml down
```

### CI image (Phase 2)

The `docker/Dockerfile.ci` image compiles contracts and runs both Hardhat and Foundry tests in one hermetic build. It exits non-zero on any failure and can be used to reproduce CI locally before pushing.

Run it locally to reproduce CI exactly:

```bash
docker build --file docker/Dockerfile.ci --tag trustledger-ci .
```

### File layout

```txt
.dockerignore               — prevents secrets/artifacts from leaking into images
docker/
  Dockerfile.dev            — dev environment (Node + Foundry binaries)
  docker-compose.dev.yml    — dev with live volume mount
  Dockerfile.ci             — CI test runner (compile + hardhat:test + forge test)
.github/
  workflows/
    ci.yml                        — lint, typecheck, and Forge tests on every push/PR
    deploy.yml                    — manual deploy to Arbitrum Sepolia
    security.yml                  — Slither, TruffleHog, npm audit, and CodeQL scans
    dependabot-automerge.yml      — auto-merge Dependabot security and dev-patch PRs
```

> **Note:** `docker/Dockerfile.backend` and `docker/docker-compose.yml` (full local stack with PostgreSQL) are defined in `testing/DOCKER_ROADMAP.md` Phase 3 and will be added once the `backend/` directory is scaffolded.

---

## GitHub Actions Workflows

Four workflows live in `.github/workflows/`. All use least-privilege tokens and concurrency groups to cancel stale runs.

### `ci.yml` — Continuous Integration

Runs on every push and pull request to `main`. Cancels in-progress runs when a new commit lands.

| Job            | What it does                                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **TypeScript** | Installs deps (`npm ci`), runs `tsc --noEmit`, ESLint + Solhint (`npm run lint`), and Prettier format check                |
| **Solidity**   | Installs Foundry, runs `forge fmt --check`, `forge build --sizes`, `forge test -vvv`, and a non-blocking gas snapshot diff |

The Solidity job sets `working-directory: contracts` so all `forge` commands run from the directory that contains `foundry.toml`.

### `deploy.yml` — Manual Deploy to Arbitrum Sepolia

Triggered only via **Actions → Run workflow** — never auto-deploys on push.

**Inputs:**

| Input    | Default                            | Description                                                |
| -------- | ---------------------------------- | ---------------------------------------------------------- |
| `script` | `script/Deploy.s.sol:DeployScript` | Forge script target (`path:Contract`)                      |
| `verify` | `true`                             | Whether to verify the contract on Arbiscan after broadcast |

The job requires a GitHub Environment named `arbitrum-sepolia` with three secrets:

| Secret                     | Description                                            |
| -------------------------- | ------------------------------------------------------ |
| `ARBITRUM_SEPOLIA_RPC_URL` | RPC endpoint (Alchemy or Infura)                       |
| `DEPLOYER_PRIVATE_KEY`     | Funded deployer wallet private key                     |
| `ETHERSCAN_API_KEY`        | Arbiscan API key (only needed when `verify` is `true`) |

Broadcast artifacts (contract addresses, transaction receipts) are uploaded as a workflow artifact and retained for 30 days.

### `security.yml` — Security Scans

Runs on push/PR to `main`, manually via `workflow_dispatch`, and on a weekly cron (Mondays 13:00 UTC) to catch CVEs in transitive deps even when no commits land.

| Job                  | Tool                                                                          | What it catches                                                                                                                                                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Slither**          | [`crytic/slither-action`](https://github.com/crytic/slither-action)           | Solidity SAST: reentrancy, uninitialized storage, dangerous low-level calls, etc. Results appear as inline PR comments via SARIF upload to the GitHub Security tab. Currently `continue-on-error: true` — flip to `false` once false positives are triaged. |
| **TruffleHog**       | [`trufflesecurity/trufflehog`](https://github.com/trufflesecurity/trufflehog) | Secret scanning across full git history: accidental commits of `.env` values, deployer private keys, or API keys.                                                                                                                                           |
| **Dependency audit** | `npm audit`                                                                   | CVEs in the npm dependency tree (Hardhat, ethers, etc.). Scans prod deps only at `high` severity threshold. Currently `continue-on-error: true`.                                                                                                            |
| **CodeQL**           | [`github/codeql-action`](https://github.com/github/codeql-action)             | TypeScript SAST: path traversal, prototype pollution, SSRF, and other CWEs via the `security-extended` query suite. Free for public repos.                                                                                                                  |

### `dependabot-automerge.yml` — Dependabot Auto-merge

Triggers on every Dependabot pull request. Only the `dependabot[bot]` actor can reach the merge step.

| Condition                                                  | Action                                  |
| ---------------------------------------------------------- | --------------------------------------- |
| PR has one or more GHSA IDs (security advisory)            | Auto-merge via squash, any semver level |
| Patch bump of a dev-only dependency (no security advisory) | Auto-merge via squash                   |
| Everything else (minor/major, prod deps)                   | No action — requires manual review      |

`--auto` means the merge is queued and executes only after all required branch protection checks pass. You must enable **auto-merge** in repository Settings → General and set up required status checks (the `CI` jobs) in Settings → Branches for this to hold.

---

## Code Review — CodeRabbit

[CodeRabbit](https://coderabbit.ai) performs automated AI code review on every pull request. Configuration lives in `.coderabbit.yaml` at the repo root (free plan).

### What it does

- Posts a high-level PR summary and a file-by-file walkthrough as a PR comment
- Leaves inline review comments on individual lines
- Responds to `@coderabbitai` mentions in PR comments for follow-up questions

### Review focus per directory

| Path                        | Review focus                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `contracts/src/**/*.sol`    | Reentrancy, access control, pull-over-push pattern, event emissions, unchecked arithmetic |
| `contracts/test/**/*.sol`   | Revert coverage, fuzz tests for unbounded inputs, no hardcoded addresses                  |
| `contracts/script/**/*.sol` | No hardcoded secrets, correct `vm.startBroadcast` scope                                   |
| `**/*.ts`                   | No `any`, missing `await`, unhandled rejections, no hardcoded keys                        |
| `hardhat.config.ts`         | Consistent compiler version and optimizer settings with `foundry.toml`                    |
| `.github/workflows/**`      | Pinned action versions, secrets via `secrets.*` only, least-privilege permissions         |

Vendored directories (`contracts/lib/`, `contracts/out/`, `node_modules/`, etc.) are excluded from review via `path_filters`.

### Interacting with CodeRabbit

Comment on any PR to ask follow-up questions or request a re-review:

```md
@coderabbitai summary
@coderabbitai review
@coderabbitai help
```

---

## Authors

- Kevin Le
- Kellen Snider
