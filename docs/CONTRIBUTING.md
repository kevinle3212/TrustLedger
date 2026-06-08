# Contributing and Local Development

This guide covers everything needed to clone, compile, test, lint, and deploy
TrustLedger locally.

---

## Prerequisites

| Tool             | Version             | Install                                                                                                                                                                      |
| ---------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js          | ≥ 22.0.0            | [nodejs.org](https://nodejs.org) or `nvm install 22`                                                                                                                         |
| npm              | Bundled             | Included with Node.js                                                                                                                                                        |
| Foundry          | Latest              | `curl -L https://foundry.paradigm.xyz \| bash && foundryup`                                                                                                                  |
| Git              | Any                 | [git-scm.com](https://git-scm.com)                                                                                                                                           |
| Python           | ≥ 3.9 _(docs only)_ | [python.org](https://www.python.org) — only needed to preview the docs site locally (`pip install -r requirements-docs.txt`). See [Documentation Site](#documentation-site). |
| rtk _(optional)_ | Latest              | `brew install rtk` — token-optimized Claude Code CLI proxy; see [RTK Setup](#rtk--claude-code-token-proxy) below.                                                            |

The exact tool versions are pinned in the repository root so everyone — local
machines, CI, and editors — runs the same runtime:

- **Node.js** is pinned to `22.22.3` in both `.nvmrc` (read by `nvm` and `fnm`)
  and `.node-version` (read by `nodenv`, `asdf`, `fnm`, and `Volta`). Run
  `nvm use` (no argument) from the project root to switch automatically. Keep
  the two files in sync if you bump Node.
- **Python** is pinned to `3.14.2` in `.python-version` (read by `pyenv`); see
  [Documentation Site](#documentation-site) and the Python type-check step
  (`npm run lint:py`).

> **Note:** These files contain a single bare version line and no comments. Most
> version managers (`nvm`, `fnm`, `Volta`) strip comments, but older readers
> (`nodenv`, `asdf`, `pyenv`) expect a bare version, so keep each file to
> exactly one version line.

When bumping a pinned version:

- **Node.js** — install the new release (`nvm install <version>`), then update
  **both** `.nvmrc` and `.node-version` to match. Keep them in sync with the CI
  `node-version` (`actions/setup-node`) and the `engines.node` range in
  `package.json`, then reinstall dependencies with `npm ci`.
- **Python** — install the new interpreter (`pyenv install <version>`), update
  `.python-version`, keep it in sync with CI (`actions/setup-python`) and the
  interpreter VS Code selects, then reinstall the docs/type-check deps with
  `pip install -r utils/requirements.txt`.

Verify your installation:

```bash
node --version    # v22.x.x or later
npm --version
forge --version   # forge 0.x.x
rtk --version     # rtk X.Y.Z (optional, only if using Claude Code)
```

---

## Clone and Install

```bash
git clone https://github.com/kevinle3212/TrustLedger.git
cd TrustLedger

# Install Node.js dependencies (Hardhat, ethers, TypeChain, ESLint, Prettier)
npm install
```

No `forge install` is needed - Foundry dependencies (`forge-std`,
`openzeppelin-contracts`) are committed directly to `contracts/lib/`.

---

## Environment Setup

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable               | Required for                | Description                                                                                       |
| ---------------------- | --------------------------- | ------------------------------------------------------------------------------------------------- |
| `SEPOLIA_RPC_URL`      | Testnet deploy / fork tests | Ethereum Sepolia RPC endpoint.                                                                    |
| `DEPLOYER_PRIVATE_KEY` | Testnet deploy              | Private key of the deployer wallet. Use a dedicated testnet-only wallet that holds no real funds. |
| `ETHERSCAN_API_KEY`    | Contract verification       | Optional. Needed for `--verify` during deploy.                                                    |
| `FORK_URL`             | Fork integration tests      | Any RPC URL to fork from. Can reuse `SEPOLIA_RPC_URL`. Leave blank to skip fork tests.            |
| `FORK_BLOCK_NUMBER`    | Fork integration tests      | Optional. Pin the fork to a specific block for reproducible results.                              |

**Never commit `.env`.** It is listed in `.gitignore`.

---

## Compile

```bash
# Compile all Solidity contracts and generate TypeScript types (TypeChain)
npm run compile
```

This runs `hardhat compile`, which reads sources from `contracts/src/`, outputs
ABIs and bytecode to `artifacts/`, and generates TypeScript wrappers under
`artifacts/typechain-types/`.

Foundry also compiles independently:

```bash
cd contracts
forge build
```

Both compilers use the same settings: `solc 0.8.24`, `optimizer_runs = 200`.

---

## Local Development

### Option A - Docker (no local toolchain required)

If you have [Docker Desktop](https://www.docker.com/products/docker-desktop/)
installed, this is the fastest path. Node.js and Foundry do not need to be
installed on your machine.

```bash
git clone https://github.com/kevinle3212/TrustLedger.git
cd TrustLedger
git submodule update --init --recursive

docker compose build          # one-time image build (~2-3 min)

docker compose up demo-good    # happy path:   create → accept → submit → approve → payout
docker compose up demo-bad     # dispute flow: create → accept → submit → dispute → vote → ruling
docker compose up demo-jurors     # juror rep:    register → vote → minority slash → before/after table
docker compose up demo-stablecoin # ERC-20 escrow, gas comparison, bidirectional reputation
docker compose up node            # chain only - connect MetaMask to http://localhost:8545
docker compose run test       # full Hardhat + Foundry test suite
```

For the interactive case-scenario runner (7 outcomes including juror and
stablecoin demos), use the local toolchain instead - see
[Option B](#option-b---local-toolchain) below.

The `node` service exposes the chain at `http://localhost:8545` (chain ID
31337). Private keys for all 20 test accounts are printed on startup - import
any of them into MetaMask to interact manually.

---

### Option B - Local toolchain

### 1. Start a local Hardhat chain

```bash
npm run node
```

This starts a local EVM node at `http://127.0.0.1:8545` (chain ID 31337) and
prints 20 funded test accounts with their private keys. Keep this terminal open.

### 2. Deploy contracts

In a second terminal:

```bash
npm run hardhat:deploy:local
```

This deploys `JurorRegistry`, `TrustLedger`, `Arbitration`, and
`ReputationRegistry` (wired via `initReputationRegistry`) in the correct order
and writes their addresses to `artifacts/deployed-addresses.json`. The address
file is consumed automatically by the demo scripts and the frontend
(`next.config.ts`).

**Or do both steps in a single command:**

```bash
npm run start:deploy:local
```

This compiles, starts the local node in the background, waits for it to be
ready, then deploys. The node keeps running after the deploy - stop it with
`pkill -f "hardhat node"` when done.

### 3. Run the demo scripts

#### Interactive scenario runner

The easiest way to run any demo is the interactive scenario runner. It
auto-starts the Hardhat node and deploys contracts if they are not already
running, then prompts you to pick a case scenario by number. After each scenario
completes it loops back to the menu - press `Ctrl+C` to exit. Each step also
prints a plain-language explanation of what is happening on-chain and why:

```bash
npm run demo:run
# or
./scripts/run-demo.sh
```

You can also pass the scenario number directly to skip the menu:

```bash
./scripts/run-demo.sh 1   # Plaintiff (client) wins
./scripts/run-demo.sh 4   # Arbitration ruling in favor of client
```

#### Case scenarios

| #   | Scenario                                   | J1 vote | J2 vote | J3 vote         | Median ruling | Result                                                                     |
| --- | ------------------------------------------ | ------- | ------- | --------------- | ------------- | -------------------------------------------------------------------------- |
| 1   | Plaintiff (client) wins                    | 0%      | 0%      | 0%              | **0%**        | Full refund to client                                                      |
| 2   | Defendant (freelancer) wins                | 100%    | 100%    | 100%            | **100%**      | Full payment to freelancer                                                 |
| 3   | Tie                                        | 50%     | 50%     | 50%             | **50%**       | Split (~0.258 ETH freelancer)                                              |
| 4   | Arbitration ruling, in favor of client     | 0%      | 0%      | 100% (minority) | **0%**        | Refund to client; J3 slashed                                               |
| 5   | Arbitration ruling, in favor of freelancer | 100%    | 100%    | 0% (minority)   | **100%**      | Full payment; J3 slashed                                                   |
| 6   | Juror reputation demo                      | -       | -       | -               | -             | Register 3 jurors, dispute, before/after stake & juror reputation table    |
| 7   | Stablecoin escrow demo                     | -       | -       | -               | -             | ERC-20 escrow, ETH vs token gas comparison, `submitRating` on both parties |

Scenarios 1-5 run the full dispute flow: register jurors → 7-day stake lock (EVM
time-travel) → create escrow → accept → submit proof → dispute → commit-reveal
vote → finalize → execute ruling.

Scenarios 4 and 5 demonstrate the minority slashing system: J3 deviates 100
percentage points from the median, which exceeds the `SEVERE_MINORITY_THRESHOLD`
(30 pts) and triggers a 20% stake slash and -10 reputation penalty.

#### Individual demo scripts

The original scripts are still available if you want to run a specific flow
directly (requires the node and contracts to already be running):

```bash
# Happy path: create → accept → submit → approve → full payout
npm run demo:good

# Dispute flow: create → accept → submit → dispute → 50% ruling → partial payout
npm run demo:bad

# Juror reputation: register → majority/minority vote → slash → before/after table
npm run demo:jurors

# Stablecoin escrow: MockERC20 escrow, gas benchmark vs ETH, bidirectional reputation
npm run demo:stablecoin
```

All demos advance EVM time using `evm_increaseTime` to skip lock periods and
voting windows, so the full flow completes in seconds.

---

## GitHub Models (prompts and examples)

Optional: test [GitHub Models](https://github.com/marketplace/models)
`.prompt.yml` files and Python examples. Full guide:
[GITHUB_MODELS.md](GITHUB_MODELS.md).

```bash
export GITHUB_TOKEN=ghp_your_token   # needs Models access

npm run models:install
npm run models:run                   # Python: summarize, generate, Q&A
npm run models:eval                  # gh models eval on .github/prompts/*.prompt.yml
```

CI runs automatically via `.github/workflows/github-models.yml` when prompt
files change.

---

## Hardhat Tests

The Hardhat test suite covers the full contract surface in TypeScript using
Mocha, Chai, and ethers.js v6 with TypeChain-generated types.

```bash
# Compile (required before first test run or after contract changes)
npm run compile

# Run all 146 Hardhat tests
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

The Foundry suite runs Solidity-native unit, fuzz, and fork integration tests.

```bash
cd contracts

# Run all tests (unit + fuzz; fork tests skip when FORK_URL is unset)
forge test

# Verbose output with full traces
forge test -vvv

# Run a specific test suite
forge test --match-contract TrustLedgerTest
forge test --match-contract JurorRegistryTest
forge test --match-contract ReputationRegistryTest
forge test --match-contract PayoutFuzz
forge test --match-contract FullLifecycleFork   # skips without FORK_URL

# Run a single test by name
forge test --match-test test_HappyPath_CreateAcceptSubmitApprove
forge test --match-test testFuzz_PayoutConservation
forge test --match-test test_Fork_HappyPath_CreateAcceptSubmitApprove

# Gas cost report
forge test --gas-report
```

From the repo root you can also use the npm shortcuts:

```bash
npm run foundry:test            # all tests (unit + fuzz)
npm run foundry:test:staging    # staging profile (2 500 fuzz runs, includes fork tests)
npm run foundry:test:fork       # fork tests only (requires FORK_URL in .env)
```

| Suite                          | Tests | Type                         |
| ------------------------------ | ----- | ---------------------------- |
| `TrustLedgerTest.t.sol`        | 37    | Unit                         |
| `JurorRegistryTest.t.sol`      | 29    | Unit                         |
| `ReputationRegistryTest.t.sol` | 11    | Unit                         |
| `PayoutFuzz.t.sol`             | 7     | Fuzz (10k runs, default)     |
| `FullLifecycleFork.t.sol`      | 4     | Fork integration (needs RPC) |

---

## Linting

```bash
# Run all linters
npm run lint

# Solhint - Solidity style and security rules
npm run lint:sol

# ESLint - TypeScript style rules
npm run lint:ts

# Prettier - check formatting for all files
npm run lint:prettier

# Forge fmt - Solidity formatting
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

## MCP Code Context

`nexus-graph` indexes the TypeScript and JavaScript source into a SQLite symbol
graph and serves it to Claude Code as an MCP server. This gives Claude
token-budgeted context about functions, classes, and their dependencies without
reading every file.

The MCP servers are configured in `.mcp.json` at the repo root. Claude Code
picks them up automatically on session start. The project routes both manual
Nexus indexing and MCP startup through `scripts/nexus-mcp.js`, which patches
around a `tree-sitter-typescript` parser limit that throws `Invalid argument` on
very large TypeScript files such as `test/TrustLedger.test.ts`.

```bash
# Build or refresh the symbol graph (run from repo root)
npm run nexus:index

# Start the MCP server manually (Claude Code auto-starts it via .mcp.json)
npm run nexus:server

# Open a local browser visualization of the code graph
npm run nexus:viz
```

Re-run `nexus:index` after large refactors to keep the graph current. The
generated database lives in `.nexus/graph.db` (gitignored).

Serena is also configured in `.mcp.json` for symbolic code navigation and
editing. For VS Code, use the workspace MCP config in `.vscode/mcp.json`; it
starts Serena with:

```bash
serena start-mcp-server --context=vscode --project ${workspaceFolder}
```

This is intentional. Serena's global VS Code command is:

```bash
serena start-mcp-server --context=vscode
```

That global mode is recommended by Serena for general use, but the Serena docs
note a VS Code bug where global MCP servers cannot activate the project
automatically. The workspace config avoids the bug by passing the project path.
If you use the global VS Code config anyway, start each session by prompting:
`Activate the current dir as project using serena`.

---

## Serena Hooks (Claude Code)

Serena is configured through `.mcp.json` and Claude Code's local settings so
agents are reminded to activate and use Serena for code navigation while
avoiding repeated manual approval prompts for Serena MCP calls.

The expected local config is `.claude/settings.local.json`:

```json
{
    "enabledMcpjsonServers": ["serena", "nexus"],
    "hooks": {
        "PreToolUse": [
            {
                "matcher": "",
                "hooks": [
                    {
                        "type": "command",
                        "command": "serena-hooks remind --client=claude-code"
                    }
                ]
            },
            {
                "matcher": "mcp__serena__*",
                "hooks": [
                    {
                        "type": "command",
                        "command": "serena-hooks auto-approve --client=claude-code"
                    }
                ]
            }
        ],
        "SessionStart": [
            {
                "matcher": "",
                "hooks": [
                    {
                        "type": "command",
                        "command": "serena-hooks activate --client=claude-code"
                    }
                ]
            }
        ],
        "SessionEnd": [
            {
                "matcher": "",
                "hooks": [
                    {
                        "type": "command",
                        "command": "serena-hooks cleanup --client=claude-code"
                    }
                ]
            }
        ]
    }
}
```

Verify the hook binary is installed and exposes the expected commands:

```bash
command -v serena-hooks
serena-hooks --help
```

---

## RTK — Claude Code Token Proxy

[RTK](https://www.rtk-ai.app/) is a CLI proxy that intercepts shell commands
executed by Claude Code and trims their output before it reaches the LLM context
window. On a project like TrustLedger — with frequent `git`, `npm`, and `forge`
operations — it typically reduces token consumption by 60-90%, cutting both cost
and response latency.

### Install

```bash
brew install rtk
```

> **macOS only:** RTK is available in Homebrew core — no tap required. ⚠️ **Name
> collision:** `reachingforthejack/rtk` (Rust Type Kit) is an unrelated package.
> If `rtk gain` shows an unrelated tool, run `which rtk` to confirm you have the
> correct binary from `/opt/homebrew/bin/rtk`.

### Verify

```bash
rtk --version   # should print: rtk X.Y.Z
rtk gain        # should show token savings (0 on first run)
```

### How It Works

Once `rtk` is installed, Claude Code's session hook (defined in
`.claude/settings.json`) automatically routes all shell commands through the
proxy. No manual configuration is required — just install and it is active the
next time a Claude Code session starts.

For this repo, agent shell commands should be explicitly prefixed with `rtk`
(`rtk git status`, `rtk npm run build:frontend`, etc.) so command output stays
compact even when the hook is not active.

```text
git status  →  rtk git status   (Claude only sees the filtered output)
forge test  →  rtk forge test
npm run …   →  rtk npm run …
```

### Useful Commands

| Command              | Description                                               |
| -------------------- | --------------------------------------------------------- |
| `rtk gain`           | Show cumulative token savings for the current session     |
| `rtk gain --history` | Show per-command savings history                          |
| `rtk discover`       | Analyze Claude Code history for missed RTK opportunities  |
| `rtk proxy <cmd>`    | Run a command through RTK manually (useful for debugging) |

RTK is optional — Claude Code works without it — but is strongly recommended for
any contributor who uses Claude Code on this project.

---

## Frontend Development

The `src/` directory is a standalone Next.js 16 package. It has its own
`package.json` and `node_modules` - it is not part of the root npm workspace.

### Install

```bash
cd src
npm install
```

### Environment variables

All frontend env vars are read from the root `.env` file by `next.config.ts` -
no `src/.env.local` is needed.

| Variable                                  | Description                                                                                                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`    | Free ID from [cloud.walletconnect.com](https://cloud.walletconnect.com). Already in root `.env`.                                                                                   |
| `NEXT_PUBLIC_TRUSTLEDGER_ADDRESS`         | Locally: auto-resolved from `artifacts/deployed-addresses.json`. On Vercel: must be set as an env var - `deploy.yml` does this automatically after each contract deploy.           |
| `NEXT_PUBLIC_ARBITRATION_ADDRESS`         | Same as above - resolves from JSON locally, Vercel env var in CI. Auto-updated by `deploy.yml`.                                                                                    |
| `NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS`      | Same as above - resolves from JSON locally, Vercel env var in CI. Auto-updated by `deploy.yml`.                                                                                    |
| `NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS` | Same as above - resolves from JSON locally, Vercel env var in CI. Auto-updated by `deploy.yml`.                                                                                    |
| `NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK`    | First block the reputation page should scan for event history. Resolves from JSON locally and is auto-updated by `deploy.yml` on Vercel.                                           |
| `NEXT_BASE_PATH`                          | URL prefix. `NEXT_BASE_PATH=` (empty) serves from root `/`. Already set in root `.env`.                                                                                            |
| `NEXT_PUBLIC_PINATA_JWT`                  | Pinata JWT for IPFS uploads. Get at [pinata.cloud](https://pinata.cloud) → API Keys.                                                                                               |
| `NEXT_PUBLIC_APP_URL`                     | Base URL for magic links in emails (e.g. `http://localhost:3000`).                                                                                                                 |
| `NEXT_PUBLIC_GITHUB_URL`                  | Source code link shown in the navbar. On Vercel, auto-constructed from `VERCEL_GIT_REPO_OWNER`/`VERCEL_GIT_REPO_SLUG` - no manual config needed. Set in root `.env` for local dev. |
| `MAGIC_LINK_SECRET`                       | Random 32-byte hex secret for HMAC-signing magic link tokens. Generate: `openssl rand -hex 32`. **Never expose.**                                                                  |
| `RESEND_API_KEY`                          | Email delivery key from [resend.com/api-keys](https://resend.com/api-keys). **Never expose.**                                                                                      |
| `RESEND_FROM`                             | Verified sender address (e.g. `TrustLedger <noreply@yourdomain.com>`). Use `onboarding@resend.dev` for local dev.                                                                  |

### Running the dev server

Start the contracts node and compile first (if interacting with the local
chain):

```bash
# repo root - terminal 1
npm run node

# repo root - terminal 2
npm run compile && npm run hardhat:deploy:local
```

Then start the frontend:

```bash
# src/
npm run dev:frontend
```

Open [http://localhost:3000](http://localhost:3000).

### Linting and quality

```bash
# from src/
npm run lint:frontend           # ESLint + Prettier
npm run lint:frontend:ts        # ESLint only
npm run lint:frontend:prettier  # Prettier only
npm run doctor                  # React Doctor full scan (score + verbose findings)
```

[React Doctor](https://react.doctor) scores the frontend on bugs, performance,
accessibility, and maintainability. Run `npm run doctor` after React changes and
ensure the score does not regress before opening a PR.

[React Scan](https://github.com/aidenybai/react-scan) is active automatically in
`NODE_ENV=development` via the `ReactScanMonitor` component in the root layout.
Open the browser overlay to highlight unnecessary re-renders while developing.

### Building

```bash
# from src/
npm run build:frontend    # static export to src/out/
```

The build is also verified automatically in the `frontend` CI job on every push
and pull request.

---

## Deploying to Ethereum Sepolia

Requires `SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, and `ETHERSCAN_API_KEY` in
`.env`.

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
# Dry-run - simulate against Sepolia, no broadcast (also runs foundry:build first)
npm run start:deploy:dry-run

# Live deploy - broadcast + Etherscan verification (also runs foundry:build first)
npm run start:deploy:foundry

# Or call the underlying scripts directly
npm run foundry:deploy:sepolia:dry-run
npm run foundry:deploy:sepolia
```

The scripts load `.env` automatically and use the named `sepolia` network
configured in `contracts/foundry.toml` (`[rpc_endpoints]` + `[etherscan]`).

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

After either deploy, addresses are printed to the console. The Hardhat script
also writes them to `artifacts/deployed-addresses.json`. Foundry saves broadcast
receipts to `contracts/broadcast/Deploy.s.sol/11155111/`.

To get Ethereum Sepolia test ETH, use a Sepolia faucet (Alchemy, Infura, or
Google).

---

## Checking Testnet Balance

```bash
npm run hardhat:check-balance
```

Prints the balance of the configured deployer wallet on the connected network.

---

## Git Hooks

Three hooks are enforced automatically via
[Husky](https://typicode.github.io/husky/) on every commit.

### pre-commit — React Doctor + linting and formatting

Two stages run in sequence:

1. **React Doctor** scans staged React/TypeScript files for bugs, performance
   regressions, accessibility violations, and maintainability issues. Findings
   are printed as warnings; the commit is not blocked unless new regressions
   appear at the `error` level.
2. **Lint and format** — Prettier auto-formats and re-stages all changed files,
   then `npm run lint` (ESLint + Solhint), `npm run lint:frontend` (ESLint on
   `src/`), and `tsc --noEmit` typecheck run. If any step exits with errors the
   commit is aborted. Fix the errors and re-run `git commit`.

### commit-msg - conventional commits

Runs [commitlint](https://commitlint.js.org/) against the commit message using
the `@commitlint/config-conventional` ruleset. The message must follow the
pattern:

```text
<type>(<optional scope>): <description>
```

Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`,
`build`, `ci`, `perf`, `revert`.

Examples of valid messages:

```text
feat: add appeal bond refund on ruling change
fix(arbitration): prevent double reveal after deadline
docs: update deploy order in ARCHITECTURE.md
chore: bump hardhat to 2.28.6
```

If the commit message is rejected, amend it with `git commit --amend` and try
again.

---

## Code Style

- **Solidity:** `forge fmt` for formatting; `solhint` for rules. No magic
  numbers - use named constants. Custom errors over `require` strings.
- **TypeScript:** `eslint` + `prettier`. Strict mode. `node:` prefix on built-in
  imports.
- **Commits:** Follow
  [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`,
  `docs:`, `chore:`, etc.). Enforced automatically by the `commit-msg` hook.

---

## Documentation Site

All Markdown lives in `docs/` and is the single source for two published
targets, both updated automatically on every push to `main`:

| Target      | URL                                               | Workflow                          |
| ----------- | ------------------------------------------------- | --------------------------------- |
| MkDocs site | <https://kevinle3212.github.io/TrustLedger/>      | `.github/workflows/docs.yml`      |
| GitHub Wiki | <https://github.com/kevinle3212/TrustLedger/wiki> | `.github/workflows/wiki-sync.yml` |

### Navigating the published site

The MkDocs site uses the
[Material](https://squidfunk.github.io/mkdocs-material/) theme. Reader-facing
features:

- **Search** — press `/` (or `S`) to focus the search box; it suggests
  completions and highlights matches on the page. Use the "share" result action
  to copy a deep link to a specific search.
- **Light/dark mode** — the sun/moon toggle in the header switches palettes; it
  also follows your OS `prefers-color-scheme` by default.
- **Top tabs + section sidebar** — top-level pages appear as tabs; the left
  sidebar expands the sections within the active page, and the right sidebar is
  the in-page table of contents.
- **Edit / view this page** — the pencil and eye icons (top right of each page)
  jump to the source `.md` on GitHub, so readers can propose fixes directly.
- **Copy code** — every code block has a copy button in its top-right corner.

### Previewing locally

```bash
# From the repo root. Installs MkDocs + the Material theme (pinned).
pip install -r requirements-docs.txt

# Live-reloading preview at http://127.0.0.1:8000
mkdocs serve

# One-off production build into ./site (what CI publishes)
mkdocs build
```

`mkdocs serve` rebuilds on every save, so you can preview edits before pushing.
Run `mkdocs build --strict` to surface broken internal links (note: it also
fails on the known external `../SECURITY.md` / `../LICENSE` links that live
outside `docs/`).

### Updating the docs

- Edit or add files under `docs/`. Register any new page in the `nav:` block of
  `mkdocs.yml` so it appears in the site sidebar.
- Put images and other assets under `docs/assets/` and reference them with a
  relative path (e.g. `assets/logo.png`).
- Commit and push to `main`. The `docs.yml` workflow builds with
  `mkdocs gh-deploy --force` (publishes to the `gh-pages` branch), and
  `wiki-sync.yml` copies `docs/*.md` into the wiki.

### Conventions that keep both targets working

- **Cross-doc links must use the `.md` extension** — e.g.
  `[Architecture](ARCHITECTURE.md)`, not `[Architecture](ARCHITECTURE)`. MkDocs
  only rewrites links that end in `.md`; bare names resolve relative to the
  current page (e.g. `/Home/ARCHITECTURE`) and 404.
- **`Home.md` is the landing page.** It stays named `Home` because that is the
  GitHub Wiki's landing page. `docs/index.html` is a static redirect that points
  the MkDocs site root (`/`) at `/Home/`; it is `*.html` so `wiki-sync` never
  copies it.
- The `gh-pages` branch holds only the built static site. Vercel deployments are
  disabled for it via `git.deploymentEnabled` in `src/vercel.json`.

### Troubleshooting

| Symptom                                                                                 | Likely cause and fix                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A page returns **404** on the live site                                                 | The link omitted the `.md` extension, or the page isn't in the `nav:` block of `mkdocs.yml`. Add `.md` to the link and register the page.                                                                                                                                                                                                                                                                                                             |
| Visiting the site root **`/`** 404s                                                     | `docs/index.html` (the redirect to `/Home/`) didn't publish. Confirm it exists and that GitHub Pages is serving the `gh-pages` branch at `/` (Settings → Pages).                                                                                                                                                                                                                                                                                      |
| New page **doesn't appear** in the sidebar                                              | It isn't listed under `nav:` in `mkdocs.yml`. Add it; pages outside `nav` build but are hidden.                                                                                                                                                                                                                                                                                                                                                       |
| **`mkdocs: command not found`** locally                                                 | The environment isn't set up. Run `pip install -r requirements-docs.txt`.                                                                                                                                                                                                                                                                                                                                                                             |
| Editor flags **`Unresolved tag: !!python/name:...`** in `mkdocs.yml`                    | Expected. Those are valid MkDocs Material emoji tags that generic YAML linters don't recognize; MkDocs parses them fine.                                                                                                                                                                                                                                                                                                                              |
| Changes pushed but the **site didn't update**                                           | `docs.yml` only triggers on changes under `docs/**`, `mkdocs.yml`, or `requirements-docs.txt`. Check the Actions tab for a failed run, or trigger it manually via _workflow_dispatch_.                                                                                                                                                                                                                                                                |
| **Wiki** is out of date                                                                 | `wiki-sync.yml` only copies `*.md` (not `index.html` or assets). Confirm the page is Markdown and the workflow succeeded.                                                                                                                                                                                                                                                                                                                             |
| Deploy fails with **`GH013 ... non_fast_forward`** / `Cannot force-push to this branch` | A branch ruleset is blocking `mkdocs gh-deploy --force` from force-pushing to `gh-pages`. The repo's `force-push` ruleset targets `~ALL` branches, so `gh-pages` must be added to its **exclude** list (Settings → Rules, or `gh api -X PUT repos/<owner>/<repo>/rulesets/<id> -f 'conditions[ref_name][include][]=~ALL' -f 'conditions[ref_name][exclude][]=refs/heads/gh-pages'`). This keeps force-push/deletion protection on every other branch. |

---

## Opening a Pull Request

1. Fork the repository and create a branch: `git checkout -b feat/your-feature`.
2. Make changes and ensure all tests pass: `npm run hardhat:test` and
   `cd contracts && forge test`.
3. Run linters: `npm run lint && npm run lint:prettier`.
4. Push and open a pull request against `main`.
5. CodeRabbit will automatically review the PR. Address any comments before
   requesting a human review.

For security-related findings, do not open a public PR. Instead, follow the
process in [SECURITY.md](../SECURITY.md).

---

## Security

See [SECURITY.md](../SECURITY.md) for the full vulnerability reporting policy,
in-scope contracts, severity classification, and response timeline.

**Do not open public GitHub issues for security vulnerabilities.** Report
privately via the contact in `SECURITY.md`.

TrustLedger is currently pre-mainnet. No contracts hold real user funds. The
codebase targets Ethereum Sepolia (testnet) and is under active development.

### GitHub Security Alert Commands

Three npm scripts surface open security alerts from GitHub without leaving the
terminal. They require `gh` (already authenticated) and `jq`.

| Command                       | Description                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `npm run security`            | Runs both `security:alerts` and `security:dependabot` in sequence.                            |
| `npm run security:alerts`     | Lists open GitHub code-scanning alerts — rule ID, severity, description, file, line, and URL. |
| `npm run security:dependabot` | Lists open Dependabot alerts — package name, severity, advisory summary, and URL.             |

**Output format** — each command returns a compact JSON array so you can pipe it
further or review it directly:

```bash
# Review all open alerts at once
npm run security

# Pipe code-scanning alerts into a pager
npm run security:alerts | less

# Filter to critical Dependabot alerts only
npm run security:dependabot | jq '[.[] | select(.severity == "critical")]'
```

Resolve alerts on a dedicated branch (`fix/security-...`) and open a PR so CI
re-runs the scans and confirms the fix. See the branching guidelines above.

---

## License

This project is licensed under the Apache License 2.0. See [LICENSE](../LICENSE)
for full terms.

---

## Authors

- [Kevin Le](https://www.linkedin.com/in/lekevin1/)
- [Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)
