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
DEPLOYER_PUBLIC_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
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

| Variable | Description | Where to get it |
| --- | --- | --- |
| `ARBITRUM_SEPOLIA_RPC_URL` | RPC endpoint | [Alchemy](https://www.alchemy.com) or [Infura](https://www.infura.io) — create a free app and copy the Arbitrum Sepolia HTTPS URL |
| `DEPLOYER_PUBLIC_ADDRESS` | Address printed by `cast wallet new` | See above |
| `DEPLOYER_PRIVATE_KEY` | Private key printed by `cast wallet new` | See above. **Never commit this value.** |
| `ETHERSCAN_API_KEY` | Arbiscan key for contract verification | [arbiscan.io/register](https://arbiscan.io/register) — free account, then My API Keys |

Fund the deployer wallet with Sepolia ETH before deploying: [Arbitrum Sepolia faucet](https://www.alchemy.com/faucets/arbitrum-sepolia).

---

`.env` is listed in `.gitignore` and will never be committed.

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

The `docker/Dockerfile.ci` image compiles contracts and runs both Hardhat and Foundry tests in one hermetic build. It is used by the GitHub Actions workflow (`.github/workflows/test.yml`) and exits non-zero on any failure.

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
    ci.yml                  — GitHub Actions: lint, typecheck, and Forge tests on every push/PR
    deploy.yml              — manual deploy to Arbitrum Sepolia
    security.yml            — Slither, TruffleHog, npm audit, and CodeQL scans
```

> **Note:** `docker/Dockerfile.backend` and `docker/docker-compose.yml` (full local stack with PostgreSQL) are defined in `testing/DOCKER_ROADMAP.md` Phase 3 and will be added once the `backend/` directory is scaffolded.

---

## GitHub Actions Workflows

Three workflows live in `.github/workflows/`. All use least-privilege tokens (`contents: read`) and concurrency groups to cancel stale runs.

### `ci.yml` — Continuous Integration

Runs on every push and pull request to `main`. Cancels in-progress runs when a new commit lands.

| Job | What it does |
| --- | --- |
| **TypeScript** | Installs deps (`npm ci`), runs `tsc --noEmit`, ESLint + Solhint (`npm run lint`), and Prettier format check |
| **Solidity** | Installs Foundry, runs `forge fmt --check`, `forge build --sizes`, `forge test -vvv`, and a non-blocking gas snapshot diff |

The Solidity job sets `working-directory: contracts` so all `forge` commands run from the directory that contains `foundry.toml`.

### `deploy.yml` — Manual Deploy to Arbitrum Sepolia

Triggered only via **Actions → Run workflow** — never auto-deploys on push.

**Inputs:**

| Input | Default | Description |
| --- | --- | --- |
| `script` | `script/Deploy.s.sol:DeployScript` | Forge script target (`path:Contract`) |
| `verify` | `true` | Whether to verify the contract on Arbiscan after broadcast |

The job requires a GitHub Environment named `arbitrum-sepolia` with three secrets:

| Secret | Description |
| --- | --- |
| `ARBITRUM_SEPOLIA_RPC_URL` | RPC endpoint (Alchemy or Infura) |
| `DEPLOYER_PRIVATE_KEY` | Funded deployer wallet private key |
| `ETHERSCAN_API_KEY` | Arbiscan API key (only needed when `verify` is `true`) |

Broadcast artifacts (contract addresses, transaction receipts) are uploaded as a workflow artifact and retained for 30 days.

### `security.yml` — Security Scans

Runs on push/PR to `main`, manually via `workflow_dispatch`, and on a weekly cron (Mondays 13:00 UTC) to catch CVEs in transitive deps even when no commits land.

| Job | Tool | What it catches |
| --- | --- | --- |
| **Slither** | [`crytic/slither-action`](https://github.com/crytic/slither-action) | Solidity SAST: reentrancy, uninitialized storage, dangerous low-level calls, etc. Results appear as inline PR comments via SARIF upload to the GitHub Security tab. Currently `continue-on-error: true` — flip to `false` once false positives are triaged. |
| **TruffleHog** | [`trufflesecurity/trufflehog`](https://github.com/trufflesecurity/trufflehog) | Secret scanning across full git history: accidental commits of `.env` values, deployer private keys, or API keys. |
| **Dependency audit** | `npm audit` | CVEs in the npm dependency tree (Hardhat, ethers, etc.). Scans prod deps only at `high` severity threshold. Currently `continue-on-error: true`. |
| **CodeQL** | [`github/codeql-action`](https://github.com/github/codeql-action) | TypeScript SAST: path traversal, prototype pollution, SSRF, and other CWEs via the `security-extended` query suite. Free for public repos. |

---

## Authors

- Kevin Le
- Kellen Snider
