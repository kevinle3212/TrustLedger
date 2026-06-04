# TrustLedger

<p align="center">
    <img src="assets/TrustLedger.png" alt="TrustLedger" width="120" />
</p>

A decentralized escrow and dispute resolution protocol for freelance agreements,
deployed on Ethereum. Clients lock ETH or ERC-20 tokens; freelancers complete
work; disputes are resolved by a staked juror panel using commit-reveal voting.

**Live App:**
[trustledger-zeta.vercel.app](https://trustledger-zeta.vercel.app) - hosted on
Vercel, deployed automatically on every push to `main`.

> [Live App](https://trustledger-zeta.vercel.app) &nbsp;·&nbsp;
> [Frontend (`src/`)](src/README.md) &nbsp;·&nbsp;
> [Architecture](docs/ARCHITECTURE.md) &nbsp;·&nbsp;
> [Contracts API](docs/CONTRACTS.md) &nbsp;·&nbsp;
> [Deployment](docs/DEPLOYMENT.md) &nbsp;·&nbsp;
> [GitHub Models](docs/GITHUB_MODELS.md) &nbsp;·&nbsp;
> [Contributing](docs/CONTRIBUTING.md) &nbsp;·&nbsp; [Security](SECURITY.md)

---

## Documentation

**Browse online:**
[hosted docs site](https://kevinle3212.github.io/TrustLedger/) (MkDocs Material)
· [GitHub Wiki](https://github.com/kevinle3212/TrustLedger/wiki) — both
auto-published from `docs/` on every push to `main`.

| Document                                       | Description                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)   | System diagram, state machine, payout formulas, storage layout                                                |
| [docs/CONTRACTS.md](docs/CONTRACTS.md)         | Full public API for all four contracts - functions, events, errors                                            |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)   | Local setup, compiling, testing, linting, deploying to testnet                                                |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)       | Vercel deployment setup - secrets, project linking, CI/CD                                                     |
| [docs/DOCKER.md](docs/DOCKER.md)               | Docker prerequisites, services, MetaMask setup, troubleshooting                                               |
| [docs/GITHUB_MODELS.md](docs/GITHUB_MODELS.md) | GitHub Models `.prompt.yml` files, Python SDK examples, and Actions workflow                                  |
| [docs/PRESENTATION.md](docs/PRESENTATION.md)   | Slide-by-slide presentation notes for pitches.                                                                |
| [docs/MISCELLANEOUS.md](docs/MISCELLANEOUS.md) | Glossary, tooling rationale, Chainlink setup, design decisions                                                |
| [SECURITY.md](SECURITY.md)                     | Vulnerability reporting policy and severity classification                                                    |
| [src/README.md](src/README.md)                 | Frontend setup, scripts, file layout, contract artifacts, wagmi integration - **start here for frontend dev** |

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Setup](#setup)
- [Development Scripts](#development-scripts)
- [Testing](#testing)
- [Usage](#usage)
- [Why Hardhat 2.x, Not 3.x](#why-hardhat-2x-not-3x)
- [File Layout](#file-layout)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Code Review and Git Commit Best Practices](#code-review-and-git-commit-best-practices)
- [Security](#security)
- [Authors](#authors)

---

## Features

### On-Chain Proof of Agreement and Deliverable

When a contract is created, a `keccak256` hash of the off-chain agreement
document and its IPFS URI are stored on-chain. When the freelancer submits work,
a hash of the deliverable and its IPFS URI are stored the same way. Neither
party can alter what was agreed to or what was delivered after the fact. Any
tampering is immediately detectable by recomputing the hash.

### ECDSA Wallet Binding on Acceptance

The freelancer does not accept a contract by calling a function alone - they
must submit an EIP-191 signature over
`keccak256(contractId, freelancerAddress)`. The contract recovers the signer
on-chain via `ecrecover` and rejects any mismatch. This prevents a third party
from accepting a contract on a freelancer's behalf without their private-key
authorization.

### Commit-Reveal Voting Prevents Herding

Jurors submit a `keccak256` commitment of their vote before anyone reveals.
Votes are hidden during the commit phase so no juror can see the crowd forming
and pile on. Only after the commit window closes do jurors reveal their actual
numbers. Any deviation from the original commitment is rejected on-chain.

### Verifiable Random Juror Selection - Chainlink VRF

When Chainlink VRF is configured, jurors are selected at dispute-open time using
on-chain verifiable randomness - not self-selection. Only pre-selected wallets
can participate. When VRF is not configured, jurors self-select from the
eligible pool (legacy mode). Both modes use the same commit-reveal flow.

### Partial Completion Rulings and Proportional Payouts

Jurors vote on a completion percentage (0-100), not a binary verdict. The median
vote becomes the ruling. The payout formula is proportional: the freelancer's
share scales with the ruling, and the arbitration fee burden is split
proportionally between both parties - not charged entirely to the freelancer.
This prevents winner-takes-all outcomes that neither party finds fair.

### Juror Slashing and On-Chain Reputation

Minority jurors - those whose votes fall more than 20 percentage points from the
median - lose 10% of their staked ETH. Jurors who commit but never reveal are
slashed the same way. Reputation decays with each minority vote and is tracked
permanently on-chain. Jurors who vote accurately earn fee-pool rewards; careless
or dishonest jurors lose money.

### Appeals with Escalating Panels

Either party can appeal a ruling within 72 hours by posting a 1.5× bond. The
appeal opens a new dispute with double the juror panel (5 → 10 for the first
appeal). Original jurors are explicitly blocked from the appeal panel so the
second review is independent. If the appeal changes the ruling the bond is
returned; if it confirms the original the bond is forfeited.

### Warranty Hold-Back

Clients can configure 5-15% of the payment to be withheld until a warranty
period expires. If a defect surfaces after approval but within the warranty
window, the client retains negotiating leverage. The hold-back is released to
the freelancer automatically once the warranty deadline passes - no further
action needed from either party.

### Automatic Release - Anti-Ghosting

After a freelancer submits proof of work, the client has a configurable
acceptance window (minimum 48 hours) to approve or dispute. If the client does
nothing, the freelancer can claim full payment once the window closes. Clients
cannot indefinitely delay payment by simply not responding.

### ETH and ERC-20 Stablecoin Escrow

Escrow can be funded with native ETH or any ERC-20 token (e.g. USDC, DAI).
Clients choose at creation time by specifying a token address; `address(0)`
means ETH. All payout, hold-back, and dispute logic is token-aware. Stablecoin
escrow eliminates price-volatility risk on long-duration agreements.

### Chainlink Price Feed - USD Value Lock

When a Chainlink ETH/USD feed is configured, the USD equivalent of the escrowed
ETH is recorded on-chain at the moment of contract creation. Both parties can
see - and later verify - the agreed dollar value regardless of subsequent ETH
price moves.

### Bidirectional On-Chain Reputation

After a contract reaches a final state (approved or resolved), both parties can
submit a rating score (1-100) for each other via `submitRating()`. Scores
accumulate permanently on-chain in `ReputationRegistry`. Only `TrustLedger` can
call `rate()` - third parties cannot manipulate scores.

### IPFS Hybrid Storage

Contract documents and proof-of-work artifacts are stored off-chain on IPFS. The
smart contract holds only a 32-byte cryptographic hash and a URI pointer to each
document. This keeps gas costs low while making any tampering immediately
detectable.

### Permissionless Phase Transitions

Phase advances (`advanceToReveal`, `finalizeDispute`, `executeRuling`) are
callable by anyone, not gated to a platform operator. The system progresses
autonomously - no trusted admin is needed to move disputes forward or execute
payouts.

[↑ Back to top](#table-of-contents)

---

## Tech Stack

<details>
<summary>Expand - Full Technology Stack</summary>

| Layer                          | Technology                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| Smart contracts                | Solidity 0.8.24                                                                              |
| Contract testing (unit + fuzz) | Foundry (Forge)                                                                              |
| Contract testing (integration) | Hardhat 2.x + Mocha/Chai                                                                     |
| TypeScript types               | TypeChain (ethers-v6)                                                                        |
| Chain                          | Ethereum Sepolia (testnet)                                                                   |
| Off-chain storage              | IPFS via Pinata (with optional Arweave)                                                      |
| Wallet                         | MetaMask + RainbowKit                                                                        |
| Frontend                       | Next.js 16, React 19, wagmi v2, RainbowKit, viem                                             |
| Backend (planned)              | Node.js, TypeScript, SQL                                                                     |
| Randomness                     | Chainlink VRF v2                                                                             |
| Price feed                     | Chainlink AggregatorV3 (ETH/USD)                                                             |
| Reentrancy guard               | OpenZeppelin ReentrancyGuard v5                                                              |
| Linting                        | Solhint, ESLint 9 (flat config), Prettier, commitlint                                        |
| CI/CD                          | GitHub Actions                                                                               |
| Frontend hosting               | [Vercel](https://vercel.com)                                                                 |
| Security scans                 | Slither, TruffleHog, CodeQL, npm audit                                                       |
| Containerization               | Docker                                                                                       |
| AI code context                | [Nexus Graph](https://github.com/costlineai/nexus-graph) (MCP symbol graph for Claude Code)  |
| Architecture diagrams          | [Excalidraw](https://excalidraw.com)                                                         |
| Developer tooling              | [rtk](https://www.rtk-ai.app/) (token-optimized Claude Code CLI proxy, 60-90% token savings) |

</details>

[↑ Back to top](#table-of-contents)

---

## Architecture

### Contract Overview

| Contract                 | Role                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `TrustLedger.sol`        | Core escrow engine. Manages the full lifecycle: create → accept → submit → approve/dispute. Holds funds and executes payouts. |
| `Arbitration.sol`        | Dispute resolution engine. Manages commit-reveal voting, juror slashing, appeals, and ruling execution.                       |
| `JurorRegistry.sol`      | Juror staking and eligibility. Tracks staked ETH, lock periods, active disputes, and slashing history.                        |
| `ReputationRegistry.sol` | On-chain reputation. Records bidirectional ratings (1-100) between clients and freelancers after each completed contract.     |

```text
TrustLedger  ←──────────────→  Arbitration  ←──→  JurorRegistry
  (escrow)      openDispute()    (disputes)          (jurors)
                executeRuling()
                                     ↕
                              ReputationRegistry
                           (rated via TrustLedger)
```

### Interfaces

<details>
<summary>Expand - All Contract Interfaces and Their Consumers</summary>

| Interface                   | Used By     | Purpose                                               |
| --------------------------- | ----------- | ----------------------------------------------------- |
| `IArbitration.sol`          | TrustLedger | `openDispute()` payable call                          |
| `ITrustLedger.sol`          | Arbitration | `executeRuling()` callback                            |
| `IJurorRegistry.sol`        | Arbitration | Lock/unlock/slash/eligibility                         |
| `IReputationRegistry.sol`   | TrustLedger | `rate()` after contract completion                    |
| `IERC20.sol`                | TrustLedger | `transfer()` / `transferFrom()` for stablecoin escrow |
| `AggregatorV3Interface.sol` | TrustLedger | `latestRoundData()` for ETH/USD price                 |
| `IVRFCoordinator.sol`       | Arbitration | `requestRandomWords()` for juror selection            |

</details>

### Optional One-Time Initializers

<details>
<summary>Expand - Post-Deploy Optional Integrations (Immutable Once Set)</summary>

Three optional integrations are wired in after deployment via one-time setter
functions. Once set they cannot be changed - there is no owner role.

| Function                          | Contract    | Effect                                          |
| --------------------------------- | ----------- | ----------------------------------------------- |
| `initPriceFeed(address)`          | TrustLedger | Enables Chainlink ETH/USD recording at creation |
| `initReputationRegistry(address)` | TrustLedger | Enables post-completion on-chain ratings        |
| `initVrfCoordinator(address)`     | Arbitration | Enables Chainlink VRF juror selection           |

</details>

### Deploy Order - Circular Dependency Resolution

All three contracts have cross-references. Both deploy scripts precompute the
Arbitration address before deployment so no contract needs a mutable setter:

```text
nonce N   →  JurorRegistry  (initialized with precomputed Arbitration address)
nonce N+1 →  TrustLedger    (initialized with precomputed Arbitration address)
nonce N+2 →  Arbitration    (actual deploy - lands at the precomputed address)
```

### Contract Lifecycle

```text
PENDING  →  ACTIVE  →  SUBMITTED  →  APPROVED
                    ↘              ↗
                    DISPUTED  →  RESOLVED
↓
CANCELLED
```

| Status      | Meaning                                                           |
| ----------- | ----------------------------------------------------------------- |
| `PENDING`   | Created; freelancer has not responded yet                         |
| `ACTIVE`    | Accepted; project deadline counting down                          |
| `SUBMITTED` | Proof of work submitted; acceptance window running                |
| `APPROVED`  | Client approved or acceptance window auto-elapsed                 |
| `DISPUTED`  | Dispute opened; in arbitration                                    |
| `RESOLVED`  | Ruling executed; funds distributed                                |
| `CANCELLED` | Freelancer rejected, client cancelled pending, or deadline missed |

### Payout Formula (Partial Rulings)

For a ruling of `pct` (a fraction from 0 to 1, e.g. 0.6 for 60%) on a contract
with `amount` and `arbitrationFeeBps`:

```text
feePool          = amount × arbitrationFeeBps / 10000
earnedAmount     = pct × amount
rawPay           = (2 × earnedAmount) / 3
freelancerFee    = feePool × pct
freelancerPay    = rawPay − freelancerFee
clientRefund     = amount − feePool − freelancerPay
```

The freelancer receives **2/3 of the earned amount** (`pct × amount`) as a gross
payment, then pays their proportional share of the arbitration fee. `pct = 0` →
full refund to client. `pct = 1` → full payout to freelancer. Partial rulings
scale proportionally with no threshold cliffs.

**Worked example** — pct = 0.6, amount = 1000, arbitrationFeeBps = 1500:

```text
feePool       = 1000 × 1500 / 10000  = 150
earnedAmount  = 0.6 × 1000           = 600
rawPay        = (2 × 600) / 3        = 400
freelancerFee = 150 × 0.6            = 90
freelancerPay = 400 − 90             = 310
clientRefund  = (1000 − 150) − 310   = 540
```

[↑ Back to top](#table-of-contents)

---

## Setup

> **Not sure where to start?**
>
> - **Just want to see a demo run?** → Skip to [Docker](#docker) - only Docker
>   Desktop required, no other installs needed.
> - **Want to run scripts or deploy to testnet?** → Follow the
>   [Prerequisites](#prerequisites) and
>   [Local Development](#local-development-hardhat-node) steps below.
> - **Want to use the live website?** → See [src/README.md](src/README.md) for
>   the frontend setup.

---

### Prerequisites

You need three tools installed before anything else. Check if you already have
them, then install any that are missing. A fourth tool, Python, is optional and
only needed for the demo PDF generator and the GitHub Models scripts — see
[Python (Optional, Version 3.14.2)](#4-python-optional-version-3142).

#### 1. Node.js (Version 22 or Later)

Node.js is the JavaScript runtime that powers Hardhat (the local blockchain) and
all the deploy and test scripts. Without it, no `npm run ...` command will work.

**Check if you have it:**

```bash
node --version
npm --version
```

If `node --version` prints `v22.x.x` or higher, skip ahead. If it prints a lower
version or `command not found`, install it:

- **macOS / Linux (recommended - use nvm so you can switch versions easily):**

    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    ```

    Close and reopen your terminal, then run:

    ```bash
    nvm install 22
    nvm use 22
    node --version   # should now print v22.x.x
    ```

    The exact version is pinned to **22.22.3** in [`.nvmrc`](.nvmrc) (the same
    way Python is pinned in [`.python-version`](.python-version)). After cloning
    the repo, run `nvm install` then `nvm use` from the project root with no
    arguments — `nvm` reads `.nvmrc` and selects the pinned version
    automatically, matching CI and the `engines.node` floor in `package.json`.
    The same version is mirrored in [`.node-version`](.node-version) for
    managers that read that file instead (for example `nodenv`, `asdf`, `fnm`,
    and `Volta`); keep the two files in sync if you ever bump Node.

- **Windows:** Download and run the installer from
  [nodejs.org](https://nodejs.org/). Select the version labeled **22.x.x LTS**.

- **Direct download (all platforms):**
  [nodejs.org/en/download](https://nodejs.org/en/download/)

#### 2. Foundry (forge, cast, anvil)

Foundry is the Solidity toolchain. It compiles contracts, runs the Solidity test
suite, and ships `cast` - a command-line wallet utility used to generate
deployer keys.

**Check if you have it:**

```bash
forge --version
```

If it prints a version number, you're good. Otherwise:

**macOS / Linux:**

```bash
curl -L https://foundry.paradigm.xyz | bash
```

This downloads the Foundry installer. After it finishes, close and reopen your
terminal, then run:

```bash
foundryup
```

`foundryup` downloads the latest stable `forge`, `cast`, and `anvil` binaries.
Verify with:

```bash
forge --version   # e.g. forge 0.3.x
cast --version
```

**Windows:** Foundry does not natively support Windows. Use
[WSL 2](https://learn.microsoft.com/en-us/windows/wsl/install) (Windows
Subsystem for Linux) and follow the macOS/Linux steps inside the WSL terminal.

#### 3. Git

Git is required to clone the repository and fetch the smart contract library
dependencies.

**Check if you have it:**

```bash
git --version
```

If it says `git version 2.x.x` you're good. Otherwise download from
[git-scm.com](https://git-scm.com) and run the installer.

#### 4. Python (Optional, Version 3.14.2)

Python is only needed if you run the demo PDF generator
(`utils/generate_contract.py`) or the GitHub Models AI scripts
(`scripts/models/github_models.py`). The core Hardhat, Foundry, and frontend
workflows do not require it. The interpreter version is pinned to **3.14.2** in
[`.python-version`](.python-version), the same way Node is pinned to 22, so
local development, the editor, and the `Python (mypy)` CI job all type-check
against one interpreter.

**Check if you have it:**

```bash
python3 --version
```

If it prints `Python 3.14.2`, skip ahead. Otherwise install that exact version
with [pyenv](https://github.com/pyenv/pyenv) so it does not clash with any
system Python:

```bash
pyenv install 3.14.2     # install the pinned interpreter
```

`pyenv` reads `.python-version` automatically inside this repo, so once 3.14.2
is installed, `python3` resolves to it whenever you are in the project
directory. Then install the Python dependencies and type stubs:

```bash
pip install -r utils/requirements.txt   # reportlab + types-reportlab stubs
```

> The `types-reportlab` stubs let `mypy` (and editors such as VS Code/Pylance)
> resolve the `reportlab` imports. Type-check the Python sources at any time
> with `npm run lint:py`; the same check runs in CI.

---

### Clone the Repository

Open a terminal, navigate to wherever you keep your projects, and run:

```bash
git clone https://github.com/kevinle3212/TrustLedger.git
cd TrustLedger
```

Then pull in the smart contract library dependencies (OpenZeppelin and
forge-std). These are stored as Git submodules - a way of pointing to another
repo from inside this one:

```bash
git submodule update --init --recursive
```

> This is a one-time step. It downloads `contracts/lib/openzeppelin-contracts/`
> and `contracts/lib/forge-std/` which the Solidity compiler needs. If you skip
> it, `forge build` will fail.

---

### Install Node Dependencies

From the project root (the `TrustLedger/` folder you cloned into):

```bash
npm install
```

This reads `package.json` and downloads Hardhat, ethers.js, TypeScript,
TypeChain, linters, and all other Node packages into a local `node_modules/`
folder. Nothing is installed globally on your system. It takes about 30-60
seconds.

---

### Environment Variables

Your `.env` file holds private configuration (API keys, wallet private keys)
that must never be uploaded to GitHub. The `.env.example` file is the safe
public template showing which variables are needed.

**Step 1 - Copy the template:**

```bash
# macOS / Linux
cp .env.example .env

# Windows Command Prompt
copy .env.example .env
```

**Step 2 - Open `.env` in a text editor** (VS Code, Notepad, TextEdit, etc.) and
fill in the values you need. The subsections below walk through how to get each
one.

| Variable                               | Required for            | Notes                                                                                     |
| -------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| `SEPOLIA_RPC_URL`                      | Testnet deploy          | HTTP endpoint to reach Ethereum Sepolia - see below                                       |
| `DEPLOYER_PUBLIC_ADDRESS`              | Testnet deploy          | Your wallet `0x…` address - see below                                                     |
| `DEPLOYER_PRIVATE_KEY`                 | Testnet deploy          | Private key for that wallet - **never share or commit this**                              |
| `ETHERSCAN_API_KEY`                    | Contract verification   | Optional but recommended - see below                                                      |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Frontend wallet connect | Free key - see [src/README.md](src/README.md#getting-a-walletconnect-project-id)          |
| `NEXT_BASE_PATH`                       | Frontend build          | Leave empty (`NEXT_BASE_PATH=`) to serve from root `/`; only set if hosting at a sub-path |

> `.env` is listed in `.gitignore` - Git will never include it in a commit. Only
> you can see it.

#### Getting an RPC URL (Alchemy or Infura)

An RPC URL is a web address that lets your scripts communicate with the Ethereum
Sepolia network. You get one for free from either Alchemy or Infura.

**Alchemy (recommended):**

1. Sign up at [alchemy.com](https://www.alchemy.com/) - a Google or GitHub login
   works.
2. From the dashboard, click **+ Create new app**.
3. Set **Chain** to `Ethereum` and **Network** to `Ethereum Sepolia`. Name it
   anything.
4. Open the app you just created and click **API key** (top right). Copy the
   **HTTPS** URL. It looks like:
   `https://eth-sepolia.g.alchemy.com/v2/abc123yourkey`
5. In your `.env` file, set:

    ```text
    SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/abc123yourkey
    ```

**Infura:**

1. Sign up at [infura.io](https://www.infura.io/).
2. Click **Create new API key** → choose **Web3 API** → name it.
3. Open the key, find the **Sepolia** endpoint, copy the HTTPS URL. It looks
   like: `https://sepolia.infura.io/v3/abc123yourkey`
4. In your `.env` file, set:

    ```text
    SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/abc123yourkey
    ```

#### Creating a Deployer Wallet

You need a wallet address and its private key to pay for and sign deployment
transactions. **Always use a dedicated throwaway wallet - never your main
MetaMask account with real ETH.**

**Option A - Generate one with `cast` (fastest):**

```bash
cast wallet new
```

Output looks like:

```text
Successfully created new keypair.
Address:     0xAbCd1234...
Private key: 0xdeadbeef...
```

Copy both values into `.env`:

```text
DEPLOYER_PUBLIC_ADDRESS=0xAbCd1234...
DEPLOYER_PRIVATE_KEY=0xdeadbeef...
```

**Option B - Create a new account in MetaMask:**

1. Open MetaMask in your browser. Click the circular account icon at the top
   right.
2. Click **Add account or hardware wallet** → **Add a new Ethereum account**.
3. Give it a name like `TrustLedger Deploy` so you can identify it.
4. To get the private key: click the three-dot menu next to the account →
   **Account details** → **Show private key** → enter your MetaMask password →
   copy the key.
5. Copy the wallet address (shown at the top of MetaMask) and the private key
   into `.env`.

#### Getting Testnet ETH (Sepolia Faucet)

Deploying to Sepolia costs a tiny amount of Sepolia ETH. Sepolia ETH is **free
and has no real-world value** - it only works on the Sepolia test network.

1. Copy your deployer wallet address (the `0x…` string).
2. Paste it into any of these faucets and click **Send** / **Request**:
    - [Alchemy Faucet](https://www.alchemy.com/faucets/ethereum-sepolia)
      _(requires Alchemy account)_
    - [Infura Faucet](https://www.infura.io/faucet/sepolia) _(requires Infura
      account)_
    - [Google Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)
      _(requires Google account)_
3. Wait about 30 seconds. You need at least **0.05 ETH** to cover deployment
   gas.

Check your balance at any time:

```bash
npm run hardhat:check-balance
```

#### Getting an Etherscan API Key

Etherscan verification uploads your contract's source code to
[sepolia.etherscan.io](https://sepolia.etherscan.io) so anyone can read and
verify it. This is optional but strongly recommended for any public deployment.

1. Go to [etherscan.io/register](https://etherscan.io/register) and create a
   free account.
2. After logging in, click your username (top right) → **API Keys**.
3. Click **Add** → give it a name → click **Create New API Key**.
4. Copy the key and add it to `.env`:

    ```text
    ETHERSCAN_API_KEY=ABCDEF1234567890...
    ```

---

### Local Development (Hardhat Node)

Running locally spins up a fake Ethereum blockchain on your own computer - no
real ETH, no internet required, and no risk of losing money.

You need **two terminal windows open at the same time**.

**Terminal 1 - Start the local chain and keep it running:**

```bash
npm run node
```

Hardhat starts a local blockchain at `http://127.0.0.1:8545` and prints 20
pre-funded test accounts:

```text
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0x... (10000 ETH)
Private Key: 0x...
...
```

These are fake wallets with fake ETH. Leave this terminal open - closing it
shuts down the chain.

**Terminal 2 - Compile the contracts and deploy them:**

```bash
npm run compile
```

This translates the Solidity `.sol` files into bytecode and generates TypeScript
type definitions (TypeChain). Then deploy:

```bash
npm run hardhat:deploy:local
```

You should see output like:

```text
JurorRegistry deployed to: 0x...
TrustLedger   deployed to: 0x...
Arbitration   deployed to: 0x...
Deployed addresses written to artifacts/deployed-addresses.json
```

**Run the demo scripts (optional):**

```bash
# Happy path: client deposits ETH → freelancer accepts → submits work → client approves → payout
npm run demo:good

# Dispute path: client disputes → jurors vote → ruling executed → partial payout
npm run demo:bad
```

Both demos complete in seconds because they use time-travel (`evm_increaseTime`)
to skip lock periods instantly.

---

### Ethereum Sepolia (Testnet)

Deploying to Sepolia puts the contracts on a public Ethereum test network that
anyone can see and interact with. Requires a funded deployer wallet and an RPC
endpoint - see [Environment Variables](#environment-variables) above.

Make sure your `.env` has `SEPOLIA_RPC_URL`, `DEPLOYER_PUBLIC_ADDRESS`,
`DEPLOYER_PRIVATE_KEY`, and at least 0.05 Sepolia ETH in the wallet, then run:

```bash
npm run hardhat:deploy:sepolia
```

The console prints all three contract addresses and writes them to
`artifacts/deployed-addresses.json`. The frontend reads this file
automatically - no manual copy step needed.

To also verify the source code on Etherscan (requires `ETHERSCAN_API_KEY` in
`.env`):

```bash
npm run start:deploy:hardhat
```

---

### Docker

Docker lets you run demos and tests **without installing Node.js or Foundry**.
Only Docker Desktop is required.

**Install Docker Desktop:**
[docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)

After installing, verify:

```bash
docker --version
docker compose version
```

**One-time setup (do this once after cloning):**

```bash
git submodule update --init --recursive   # fetch contract libraries if not done yet
docker compose build                       # build the image (~2-3 minutes first time)
```

**Run a demo or the test suite:**

```bash
docker compose up demo-good    # happy-path demo
docker compose up demo-bad     # dispute-flow demo
docker compose up node         # local chain only - connect MetaMask to http://localhost:8545
docker compose run test        # full Hardhat + Foundry test suite
```

**Dev container** (live-reloading, mounts your local files):

```bash
docker compose -f docker/docker-compose.dev.yml build
docker compose -f docker/docker-compose.dev.yml up
docker compose -f docker/docker-compose.dev.yml exec dev bash   # open a shell inside
docker compose -f docker/docker-compose.dev.yml down            # tear down
```

See [docs/DOCKER.md](docs/DOCKER.md) for full Docker documentation including
MetaMask connection and troubleshooting.

[↑ Back to top](#table-of-contents)

---

## Development Scripts

<details>
<summary>Hardhat - Local Node, Deploy, Test, Demo</summary>

| Script                           | What it runs                                                    |
| -------------------------------- | --------------------------------------------------------------- |
| `npm run compile`                | Compile Solidity → ABIs + TypeChain types in `artifacts/`       |
| `npm run hardhat:test`           | Run Mocha/Chai integration tests                                |
| `npm run hardhat:gas`            | Run tests with per-function gas usage table                     |
| `npm run node`                   | Local chain on `localhost:8545` with 20 pre-funded accounts     |
| `npm run hardhat:deploy:local`   | Deploy to local node, write `artifacts/deployed-addresses.json` |
| `npm run hardhat:deploy:sepolia` | Deploy to Ethereum Sepolia                                      |
| `npm run hardhat:check-balance`  | Print deployer ETH balance on Ethereum Sepolia                  |
| `npm run demo:good`              | Happy-path demo against a running local node                    |
| `npm run demo:bad`               | Dispute-flow demo against a running local node                  |
| `npm run demo:jurors`            | Juror reputation demo (slash + before/after table)              |
| `npm run demo:stablecoin`        | ERC-20 escrow + gas comparison + reputation                     |
| `npm run demo:scenario`          | Run the scripted multi-scenario walkthrough                     |
| `npm run demo:run`               | Interactive menu (scenarios 1-7)                                |

</details>

<details>
<summary>GitHub Models - Prompts and Python Examples</summary>

See [docs/GITHUB_MODELS.md](docs/GITHUB_MODELS.md).

| Script                         | What it runs                                                       |
| ------------------------------ | ------------------------------------------------------------------ |
| `npm run models:install`       | Install `azure-ai-inference` for `scripts/models/github_models.py` |
| `npm run models:run`           | Run summarize, generate, and Q&A Python scenarios                  |
| `npm run models:run:summarize` | Summarization example only                                         |
| `npm run models:eval`          | `gh models eval` on every `.github/prompts/*.prompt.yml`           |

Requires `GITHUB_TOKEN` with Models access.

</details>

<details>
<summary>Foundry - Compile, Test, Gas, Deploy</summary>

| Script                                   | What it runs                                         |
| ---------------------------------------- | ---------------------------------------------------- |
| `npm run foundry:build`                  | `forge build` - compile contracts via Foundry        |
| `npm run foundry:test`                   | `forge test` - run all Solidity unit and fuzz tests  |
| `npm run foundry:test:fork`              | Run fork integration tests (requires `FORK_URL`)     |
| `npm run foundry:gas`                    | `forge test --gas-report` - per-function gas usage   |
| `npm run foundry:deploy:sepolia:dry-run` | Simulate Sepolia deploy (no broadcast), loads `.env` |
| `npm run foundry:deploy:sepolia`         | Broadcast deploy to Sepolia + Etherscan verification |

</details>

<details>
<summary>Combined One-Shot Scripts</summary>

| Script                         | What it runs                                                            |
| ------------------------------ | ----------------------------------------------------------------------- |
| `npm run start:deploy:local`   | Compile → start local node (background) → deploy to localhost           |
| `npm run start:deploy:dry-run` | Foundry build → simulate Sepolia deploy (no broadcast)                  |
| `npm run start:deploy:hardhat` | Compile → deploy to Ethereum Sepolia via Hardhat.                       |
| `npm run start:deploy:foundry` | Foundry build → deploy to Ethereum Sepolia via Forge + Etherscan verify |

</details>

<details>
<summary>Tooling - Lint, Format, Build</summary>

| Script                  | What it runs                                    |
| ----------------------- | ----------------------------------------------- |
| `npm run lint`          | ESLint (TypeScript) + Solhint (Solidity)        |
| `npm run lint:ts`       | ESLint only                                     |
| `npm run lint:sol`      | Solhint only                                    |
| `npm run lint:prettier` | Prettier format check (read-only)               |
| `npm run lint:py`       | `mypy` type-check of the Python sources         |
| `npm run lint:frontend` | ESLint + Prettier check for the `src/` frontend |

</details>

<details>
<summary>Nexus Code Graph - AI Context for Claude Code</summary>

| Script                 | What it runs                                                             |
| ---------------------- | ------------------------------------------------------------------------ |
| `npm run nexus:index`  | Scan the project and build/refresh the symbol graph in `.nexus/graph.db` |
| `npm run nexus:server` | Start the Nexus MCP server on stdio (used automatically by `.mcp.json`)  |
| `npm run nexus:viz`    | Open a local browser visualization of the symbol graph                   |

The Nexus code graph gives Claude Code token-budgeted symbol and dependency
context via the MCP server defined in `.mcp.json`. Re-run `nexus:index` after
large refactors to keep the graph current.

</details>

<details>
<summary>RTK — Token-Optimized Claude Code CLI Proxy (Recommended)</summary>

[RTK](https://www.rtk-ai.app/) is a CLI proxy that transparently wraps shell
commands executed by Claude Code and strips noise from their output before it
reaches the LLM context window. This typically cuts token usage on shell-heavy
operations (git, npm, forge) by 60-90%, reducing both cost and latency.

**Install (macOS/Linux via Homebrew):**

```bash
brew install rtk
```

**Verify:**

```bash
rtk --version   # rtk X.Y.Z
rtk gain        # show token savings so far
```

> ⚠️ **Name collision:** If `rtk gain` fails or shows an unrelated tool, you may
> have `reachingforthejack/rtk` (Rust Type Kit) installed instead. Check with
> `which rtk`.

**How it works:** Once installed, Claude Code's session hook automatically
rewrites shell commands through the proxy (e.g., `git status` →
`rtk git status`). No configuration required — the hook is already defined in
`.claude/settings.json`.

**Useful commands:**

| Command              | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `rtk gain`           | Show cumulative token savings for this session           |
| `rtk gain --history` | Show per-command savings history                         |
| `rtk discover`       | Analyze Claude Code history for missed RTK opportunities |
| `rtk proxy <cmd>`    | Run a command through RTK manually (for debugging)       |

RTK is optional — Claude Code works without it — but it is strongly recommended
for anyone working on this project with Claude Code.

</details>

[↑ Back to top](#table-of-contents)

---

## How Hardhat and Foundry Are Used

TrustLedger uses both toolchains side by side. They share the same Solidity
source files and compiler settings (`solc 0.8.24`, `optimizer_runs = 200`,
`via_ir = true`) but serve different roles.

### Hardhat - Integration Layer

Hardhat is the TypeScript runtime for everything that crosses the contract
boundary:

- **Local node** (`npm run node`) - an in-process EVM that mimics mainnet, used
  for manual interaction and demo scripts.
- **Deployment scripts** (`scripts/deploy.ts`) - ethers.js + TypeChain deploy
  all three contracts in the correct nonce order and write the resulting
  addresses to `artifacts/deployed-addresses.json` for frontend consumption.
- **Integration tests** (`test/TrustLedger.test.ts`, 146 tests) - multi-wallet
  flows written in TypeScript with full type safety. Tests cover ETH and ERC-20
  escrow, Chainlink mock feeds, VRF mock, full dispute commit-reveal, appeals,
  and reputation. Balance diffs are verified at every payout step using
  ethers.js `BigInt` arithmetic.
- **TypeChain** - after every compile, TypeChain generates TypeScript classes
  for each contract so test code gets compile-time type checking on function
  signatures, arguments, and return values.

### Foundry - Contract-Native Layer

Foundry runs entirely in Solidity, making it faster and more precise for
low-level testing:

- **Unit tests** (`contracts/test/`, 65 tests) - Solidity-native tests using
  `vm.prank`, `vm.warp`, `vm.expectRevert`, and `vm.deal` cheatcodes. No
  JavaScript runtime overhead.
- **Fuzz tests** (`PayoutFuzz.t.sol`, 7 tests × 10,000 runs each) -
  property-based tests that prove payout invariants hold for the full `uint`
  input range. A single fuzz run covers more edge cases than hundreds of
  hand-written unit tests.
- **Gas reporting** (`npm run foundry:gas`) - per-function min/mean/max gas
  costs, used to catch regressions before deployment.
- **Deployment script** (`contracts/script/Deploy.s.sol`) - Forge script that
  precomputes contract addresses using the deployer's nonce, deploys all three
  contracts in order, and asserts the addresses match predictions. Run via
  `npm run foundry:deploy:sepolia`.
- **Formatter** (`forge fmt`) - enforces consistent Solidity style, configured
  in `foundry.toml`.

### Why Both?

<details>
<summary>Expand - Hardhat vs. Foundry Comparison</summary>

| Concern                  | Hardhat                                   | Foundry                            |
| ------------------------ | ----------------------------------------- | ---------------------------------- |
| Multi-wallet integration | Native (ethers.js signers)                | Requires `vm.prank` workarounds    |
| TypeScript / frontend    | Native (TypeChain, wagmi-compatible ABIs) | No TypeScript support              |
| Test speed               | Slower (Node.js + JSON-RPC)               | Faster (native EVM, no IPC)        |
| Fuzz testing             | Requires external tools                   | Built-in, 10k runs per test        |
| Time travel              | `evm_increaseTime` via JSON-RPC           | `vm.warp` - inline, zero overhead  |
| Gas reports              | Plugin-based, less granular               | Per-function, built-in             |
| Solidity deployment      | JS script via ethers.js                   | Native Solidity (`forge script`)   |
| Testnet verification     | `hardhat verify` (Etherscan plugin)       | `forge script --verify` (built-in) |

</details>

[↑ Back to top](#table-of-contents)

---

## Testing

### Hardhat (Mocha/Chai) - Integration Tests

```bash
npm run hardhat:test
```

146 tests in `test/TrustLedger.test.ts`. Covers the full escrow lifecycle for
ETH and ERC-20, Chainlink price feed mock, VRF mock, full dispute flow with
commit-reveal, appeals, and ReputationRegistry. Uses TypeChain typed contract
wrappers.

### Foundry (Forge) - Unit + Fuzz Tests

```bash
npm run foundry:test
# or with traces:
cd contracts && forge test -vvv
```

84 Foundry tests across five suites (the fork suite is skipped unless `FORK_URL`
is set):

<details>
<summary>Expand - Foundry Test Suite Breakdown</summary>

| Suite                    | Count | Type            | Covers                                                                    |
| ------------------------ | ----- | --------------- | ------------------------------------------------------------------------- |
| `TrustLedgerTest`        | 37    | Unit            | Full lifecycle, deadline, warranty, dispute, ruling payouts, reverts      |
| `JurorRegistryTest`      | 29    | Unit            | Register, stake lock, slash, eligibility, active dispute guard            |
| `ReputationRegistryTest` | 11    | Unit            | Constructor, `rate()` access control, score bounds, accumulation          |
| `PayoutFuzz`             | 7     | Fuzz (10k runs) | Payout conservation, formula correctness, buffer factor, hold-back bounds |
| `FullLifecycleFork`      | 4     | Fork            | End-to-end lifecycle against forked state (skipped without `FORK_URL`)    |

</details>

Foundry config (`contracts/foundry.toml`):

- Fuzz: 10,000 random inputs per fuzz test
- Invariant: 256 runs × 500 call depth
- IR pipeline (`via_ir = true`) - handles complex functions without
  stack-too-deep errors

### Linting and Formatting

```bash
# Run all linters
npm run lint

# Solidity formatter
cd contracts && forge fmt --check    # CI check
cd contracts && forge fmt            # auto-fix

# TypeScript formatter
npm run lint:prettier                # check
npx prettier --write .               # auto-fix
```

TypeScript ESLint uses the `strictTypeChecked` + `stylisticTypeChecked` presets
from `typescript-eslint`. Type-aware rules apply across both `tsconfig.json` and
`tsconfig.hardhat.json`.

### TypeScript Configuration

<details>
<summary>Expand - tsconfig Files and Their Roles</summary>

| File                    | Used by                                              | Module system                  |
| ----------------------- | ---------------------------------------------------- | ------------------------------ |
| `tsconfig.json`         | Root project (type-aware ESLint - `src/**` excluded) | NodeNext ESM                   |
| `tsconfig.hardhat.json` | `hardhat.config.ts`, `scripts/`, `test/`             | CommonJS (Hardhat requirement) |
| `src/tsconfig.json`     | Next.js frontend (`src/`)                            | ESNext, bundler resolution     |

The root and Hardhat configs extend `@tsconfig/strictest` with additional flags
(`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`verbatimModuleSyntax`). The frontend config uses its own strict settings
compatible with Next.js and bundler resolution.

</details>

[↑ Back to top](#table-of-contents)

---

## Usage

### For the Backend Developer

The backend is responsible for the parts of the application flow that happen
off-chain:

#### IPFS Uploads Before On-Chain Calls

Before calling `createContract()`, upload the agreement document to IPFS and
pass the resulting CID as `contractURI`. Before calling `submitProofOfWork()`,
upload the deliverable and pass the CID as `proofOfWorkURI`. The Solidity
contract stores the CID and a `keccak256` hash of the file - the backend must
hash the file before upload and pass both values.

#### Magic-Link Freelancer Onboarding

The client submits the contract via the website and a signed magic link is
emailed to the freelancer. The backend generates a single-use JWT containing the
`contractId`, emails it to the freelancer's address, and the frontend uses the
link to pre-fill the `acceptContract()` call. The on-chain acceptance requires a
pre-computed ECDSA signature:

```ts
const inner = ethers.solidityPackedKeccak256(
    ["uint256", "address"],
    [contractId, freelancerAddress],
);
const sig = ethers.Signature.from(
    await wallet.signMessage(ethers.getBytes(inner)),
);
// Call: trustLedger.acceptContract(contractId, sig.v, sig.r, sig.s)
```

#### Deadline Notifications

Subscribe to `ContractCreated` and `ContractAccepted` events. For each active
contract, compare `projectDeadline` (stored in the `EscrowContract` struct via
`getContract(id)`) against the current block time. Send deadline warnings
starting 5 days out in 24-hour increments.

#### Event Indexing

Use an Ethereum JSON-RPC node (Alchemy, Infura) or a dedicated indexer (The
Graph) to subscribe to all contract events. Store indexed data in SQL for fast
frontend queries without repeated on-chain reads. Key tables: contracts,
disputes, jurors, ratings.

### Demo Scripts

Two scripts illustrate the full lifecycle against a running local node:

```bash
# Option A - two terminals
npm run node                   # terminal 1 (keep open)
npm run compile
npm run hardhat:deploy:local   # terminal 2

# Option B - single command (starts node in background)
npm run start:deploy:local

# Happy path - client approves, freelancer receives full 1 ETH
npm run demo:good

# Dispute flow - jurors vote 50%, freelancer receives ~0.258 ETH
npm run demo:bad
```

For MetaMask and Remix IDE manual testing, see `testing/demo-instructions.md`.

[↑ Back to top](#table-of-contents)

---

## Why Hardhat 2.x, Not 3.x

This project pins `hardhat@^2.x` intentionally. Hardhat 3.x was evaluated and
reverted:

<details>
<summary>Expand - Hardhat 2.x vs. 3.x Comparison</summary>

| Concern              | Hardhat 2.x                                                                 | Hardhat 3.x (alpha)                                        |
| -------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **TypeChain**        | Stable first-class plugin                                                   | No stable TypeChain plugin - 3.x overhauled the plugin API |
| **Toolbox**          | `hardhat-toolbox@5` bundles TypeChain + ethers v6 + gas reporter + coverage | 3.x toolbox is separate, incomplete, and still evolving    |
| **ESM/CJS**          | Works with `"module": "CommonJS"` + ts-node CJS override for Node.js 22+    | Defaults to ESM, which breaks the ts-node CJS workaround   |
| **Plugin ecosystem** | `hardhat-gas-reporter`, `solidity-coverage`, Slither all verified           | Several plugins lack 3.x-compatible releases               |
| **Stability**        | Mature, semver-stable                                                       | Alpha - breaking changes between releases disrupt CI       |

</details>

Upgrade once Hardhat 3.x reaches a stable release and TypeChain publishes a
compatible plugin.

[↑ Back to top](#table-of-contents)

---

## File Layout

<details>
<summary>Expand - Full Repository File Tree</summary>

```text
TrustLedger/
├── contracts/                            # Foundry project root (self-contained)
│   ├── foundry.toml                      # Compiler version, optimizer, fuzz runs
│   ├── foundry.lock                      # Locked Foundry dependency versions
│   ├── remappings.txt                    # Solidity import aliases
│   ├── .gas-snapshot                     # Forge gas usage snapshot (committed for CI diff tracking)
│   ├── src/                              # Production contracts
│   │   ├── TrustLedger.sol               # Core escrow engine
│   │   ├── Arbitration.sol               # Commit-reveal dispute resolution
│   │   ├── JurorRegistry.sol             # Juror staking and slashing
│   │   ├── ReputationRegistry.sol        # On-chain bidirectional ratings
│   │   ├── interfaces/
│   │   │   ├── IArbitration.sol
│   │   │   ├── ITrustLedger.sol
│   │   │   ├── IJurorRegistry.sol
│   │   │   ├── IReputationRegistry.sol
│   │   │   ├── IERC20.sol
│   │   │   ├── AggregatorV3Interface.sol
│   │   │   └── IVRFCoordinator.sol
│   │   └── mocks/                        # Test-only contracts (never deployed to prod)
│   │       ├── MockERC20.sol
│   │       ├── MockVRFCoordinator.sol
│   │       └── MockPriceFeed.sol
│   ├── test/
│   │   ├── unit/
│   │   │   ├── TrustLedgerTest.t.sol     # 37 Foundry unit tests
│   │   │   ├── JurorRegistryTest.t.sol   # 29 Foundry unit tests
│   │   │   └── ReputationRegistryTest.t.sol  # 11 Foundry unit tests
│   │   ├── fuzz/
│   │   │   └── PayoutFuzz.t.sol          # 7 fuzz tests (10k runs each)
│   │   └── fork/
│   │       └── FullLifecycleFork.t.sol   # 4 fork integration tests (requires FORK_URL)
│   ├── script/
│   │   └── Deploy.s.sol                  # Foundry deploy script
│   └── lib/                              # Vendored Foundry dependencies (committed)
│       ├── forge-std/
│       └── openzeppelin-contracts/
│
├── src/                                            # Next.js 16 dApp (frontend) - see src/README.md
│   ├── app/
│   │   ├── api/magic-link/
│   │   │   ├── send/route.ts                     # POST - generate and email a magic-link JWT to a freelancer
│   │   │   └── verify/route.ts                   # GET - validate the JWT and return the accept payload
│   │   ├── arbitration/[id]/page.tsx             # Per-dispute commit/reveal voting UI
│   │   ├── create/page.tsx                       # Create escrow contract form
│   │   ├── dashboard/page.tsx                    # User's contract dashboard
│   │   ├── freelancer/accept/page.tsx            # Magic-link freelancer accept landing page
│   │   ├── juror/page.tsx                        # Juror portal - stake, vote, view disputes
│   │   ├── reputation/page.tsx                   # Reputation lookup and post-contract rating UI
│   │   ├── layout.tsx                            # Root layout with Providers + Navbar
│   │   ├── page.tsx                              # Landing page
│   │   ├── globals.css                           # Tailwind v4 base styles + font vars
│   │   └── favicon.ico
│   ├── components/
│   │   ├── Navbar.tsx                            # Sticky nav with RainbowKit connect button
│   │   ├── Providers.tsx                         # WagmiProvider + RainbowKitProvider + QueryClientProvider
│   │   └── ThemeToggle.tsx                       # Light/dark mode toggle button
│   ├── lib/
│   │   ├── abi.ts                                # TrustLedger / Arbitration / JurorRegistry / ReputationRegistry ABIs
│   │   ├── arweave.ts                            # Arweave permanent storage helper
│   │   ├── encryption.ts                         # AES-GCM encrypt/decrypt for off-chain docs
│   │   ├── ipfs.ts                               # IPFS upload via Pinata's pinning API
│   │   ├── magicLink.ts                          # JWT sign/verify for freelancer onboarding
│   │   ├── utils.ts                              # Address/ETH formatters, status colors
│   │   └── wagmi.ts                              # wagmi config + contract address resolver
│   ├── public/                                   # Static assets
│   │   ├── logo.png
│   │   └── *.svg                                 # Next.js default SVGs (file, globe, window, next, vercel)
│   ├── next.config.ts                            # basePath + root .env injection
│   ├── vercel.json                               # Vercel deployment config for the frontend
│   ├── eslint.config.mjs                         # Frontend ESLint flat config
│   ├── postcss.config.mjs                        # PostCSS config for Tailwind v4
│   ├── tsconfig.json                             # Frontend TypeScript config
│   ├── tsconfig.debug.json                       # Debug TS config (trace + CPU profile)
│   ├── package.json                              # Frontend-only dependencies
│   └── README.md                                 # Frontend setup guide -> src/README.md
│
├── test/
│   └── TrustLedger.test.ts               # 146 Hardhat/Mocha integration tests
│
├── scripts/
│   ├── deploy.ts                         # Hardhat deploy (writes artifacts/deployed-addresses.json)
│   ├── check-balance.ts                  # Deployer wallet balance checker
│   ├── docker-demo.sh                    # Docker demo launcher
│   ├── run-demo.sh                       # Interactive scenario runner (auto-starts node + deploy)
│   ├── demo/
│   │   ├── demo-good.ts                  # Happy-path demo script
│   │   ├── demo-bad.ts                   # Dispute-flow demo script
│   │   ├── demo-jurors.ts               # Juror reputation demo
│   │   ├── demo-scenarios.ts            # Interactive multi-scenario runner
│   │   └── demo-stablecoin.ts           # ERC-20 stablecoin escrow demo
│   └── models/                          # GitHub Models AI integration scripts
│       ├── github_models.py      # Python SDK examples (summarize, generate, Q&A)
│       ├── eval-prompts.sh              # Evaluates .github/prompts/*.prompt.yml via gh models eval
│       ├── requirements.txt             # Python dependencies (openai, azure-ai-inference)
│       └── README.md                    # GitHub Models setup and usage guide
│
├── utils/
│   ├── generate_contract.py             # Demo PDF generator (reportlab)
│   └── requirements.txt                 # reportlab + types-reportlab (mypy stubs)
│
├── stubs/                               # Hand-written type stubs for mypy (lint:py)
│   └── azure/                           # Typed slice of the untyped azure-ai-inference SDK
│
├── docker/
│   ├── Dockerfile.dev                    # Dev container (Node + Foundry)
│   ├── docker-compose.dev.yml            # Dev with live volume mount
│   └── Dockerfile.ci                     # CI test runner (compile + both test suites)
│
├── docs/
│   ├── ARCHITECTURE.md                   # System diagram, state machine, payout formulas, storage layout
│   ├── CONTRACTS.md                      # Full public API for all four contracts
│   ├── CONTRIBUTING.md                   # Local setup, testing, linting, deploying
│   ├── DEPLOYMENT.md                     # Vercel deployment - secrets, project linking, CI/CD
│   ├── DOCKER.md                         # Docker prerequisites, services, MetaMask setup
│   ├── GITHUB_MODELS.md                  # GitHub Models prompt files, Python SDK, Actions workflow
│   ├── Home.md                           # Documentation index (mirrored to GitHub Wiki)
│   ├── MISCELLANEOUS.md                  # Glossary, tooling overview, design decisions
│   ├── PRESENTATION.md                   # Slide-by-slide presentation notes
│   └── TESTING.md                        # Test strategy, coverage, and suite descriptions
│
├── assets/
│   └── TrustLedger.png                   # Project logo
│
├── .github/
│   ├── dependabot.yml                    # Dependabot version-update config
│   ├── prompts/                          # GitHub Models .prompt.yml files
│   │   ├── summarize-text.prompt.yml
│   │   ├── generate-text.prompt.yml
│   │   ├── answer-questions.prompt.yml
│   │   └── edge-cases.prompt.yml
│   └── workflows/
│       ├── ci.yml                        # Lint, typecheck, Forge tests + frontend build on every push/PR
│       ├── deploy.yml                    # Manual deploy to Ethereum Sepolia
│       ├── security.yml                  # Slither, TruffleHog, npm audit (root + frontend), CodeQL
│       ├── github-models.yml             # Evaluates .github/prompts/*.prompt.yml on prompt/script changes
│       ├── wiki-sync.yml                 # Auto-sync docs/Home.md to GitHub Wiki on push to main
│       └── dependabot-automerge.yml      # Auto-merge Dependabot security/patch PRs
│
├── .claude/
│   └── commands/
│       └── cleanup-commit.md             # /cleanup-commit agent skill: lint, fix, and commit guide
│
├── .husky/
│   ├── pre-commit                        # Runs lint + prettier check before every commit
│   └── commit-msg                        # Runs commitlint to enforce Conventional Commits format
│
├── .vscode/
│   ├── settings.json                     # Editor settings (Solidity, ESLint flat config, markdownlint)
│   └── extensions.json                   # Recommended VS Code extensions for this project
│
├── tools/
│   └── keep-awake.sh                     # Prevents the machine from sleeping during long local demo runs
│
├── artifacts/                            # Auto-generated - do not edit or commit
│   ├── deployed-addresses.json           # Written by deploy scripts - imported by frontend
│   └── typechain-types/                  # TypeScript contract wrappers
│
├── Dockerfile                            # Root Docker image for running tests and demos
├── docker-compose.yml                    # Compose services: node, demo-*, test
├── hardhat.config.ts                     # Hardhat: compiler, networks, TypeChain, Etherscan
├── commitlint.config.js                  # commitlint ruleset (extends @commitlint/config-conventional)
├── eslint.config.mjs                     # ESLint 9 flat config (strictTypeChecked)
├── tsconfig.json                         # NodeNext ESM (src/)
├── tsconfig.hardhat.json                 # CommonJS (hardhat, scripts, tests)
├── tsconfig.debug.json                   # Debug TS config (trace + CPU profile output)
├── mypy.ini                              # Strict mypy config for the Python sources (lint:py)
├── .prettierrc.json                      # Prettier formatting rules
├── .solhint.json                         # Solhint rules
├── .markdownlint.json                    # markdownlint rules for docs/
├── .markdownlintignore                   # Paths excluded from markdownlint
├── .npmrc                                # npm config (engine-strict, legacy-peer-deps)
├── .nvmrc                                # Pins the Node.js version (22.22.3) for nvm
├── .node-version                         # Same Node pin for nodenv/asdf/fnm/Volta
├── .python-version                       # Pins the Python interpreter (3.14.2) for pyenv
├── .gitattributes                        # Git line-ending and diff settings
├── .gitmodules                           # Foundry submodule declarations (forge-std, openzeppelin)
├── .mcp.json                             # Claude Code MCP server config (nexus-graph)
├── .coderabbit.yaml                      # CodeRabbit AI code review config
├── package.json                          # npm scripts + root dependencies
├── .env.example                          # Environment variable template - safe to commit
├── .env                                  # Actual secrets - NEVER commit this
├── .gitignore                            # Excludes .env, node_modules, build artifacts
├── .dockerignore                         # Excludes secrets/artifacts from Docker images
├── CHANGELOG.md                          # Release history
├── CLAUDE.md                             # Claude Code project instructions and conventions
├── README.md                             # Project overview (this file)
├── TODO.md                               # Open tasks and roadmap items
├── SECURITY.md                           # Vulnerability reporting policy
└── LICENSE                               # Apache-2.0
```

</details>

> **Frontend developer?** The `src/` subtree has its own README with a per-file
> breakdown, env var setup, scripts, and wagmi examples. See
> [src/README.md](src/README.md).

[↑ Back to top](#table-of-contents)

---

## GitHub Actions Workflows

Five workflows live in `.github/workflows/`. All use least-privilege tokens and
concurrency groups to cancel stale runs on new commits.

### `ci.yml` - Continuous Integration

Runs on every push and pull request to `main`.

<details>
<summary>Expand - CI Job Breakdown</summary>

| Job            | What it does                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------- |
| **Frontend**   | `npm ci` (in `src/`), TypeScript typecheck, ESLint + Prettier, `next build`                       |
| **TypeScript** | `npm ci`, `tsc --noEmit`, ESLint + Solhint, Prettier format check                                 |
| **Python**     | `actions/setup-python` (3.14.2 via `.python-version`), install `mypy` + stubs, `npm run lint:py`  |
| **Hardhat**    | `npm ci`, `npm run compile` (TypeChain), `npm run hardhat:test`                                   |
| **Solidity**   | Foundry install, `forge fmt --check`, `forge build --sizes`, `forge test -vvv`, gas snapshot diff |

The Solidity job sets `working-directory: contracts` so all `forge` commands run
from the directory containing `foundry.toml`. The Frontend job sets
`working-directory: src` and uses `src/package-lock.json` for npm cache keying.

</details>

### `deploy.yml` - Manual Deploy to Ethereum Sepolia

Triggered only via **Actions → Run workflow** - never auto-deploys on push.

<details>
<summary>Expand - Required Secrets</summary>

Requires a GitHub Environment named `ethereum-sepolia` with three secrets:

| Secret                 | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `SEPOLIA_RPC_URL`      | RPC endpoint (Alchemy or Infura)               |
| `DEPLOYER_PRIVATE_KEY` | Funded deployer wallet private key             |
| `ETHERSCAN_API_KEY`    | Etherscan API key (only needed when verifying) |

</details>

Broadcast artifacts (contract addresses, transaction receipts) are uploaded as a
workflow artifact and retained for 30 days.

### `github-models.yml` - GitHub Models Prompt Tests

Runs on changes to `.github/prompts/`, `scripts/models/`, or
[docs/GITHUB_MODELS.md](docs/GITHUB_MODELS.md). Uses `actions/ai-inference` and
optional `gh models eval` on each `.prompt.yml`, plus the Python examples in
`scripts/models/github_models.py`. See
[docs/GITHUB_MODELS.md](docs/GITHUB_MODELS.md).

### `security.yml` - Security Scans

Runs on push/PR to `main`, manually via `workflow_dispatch`, and weekly (Mondays
13:00 UTC) to catch CVEs in transitive deps even when no code changes.

<details>
<summary>Expand - Security Scan Jobs</summary>

| Job                    | Tool                         | Catches                                                                                                                                                 |
| ---------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Slither**            | `crytic/slither-action`      | Solidity SAST: reentrancy, uninitialized storage, dangerous low-level calls. Results appear as inline PR comments via SARIF upload to the Security tab. |
| **TruffleHog**         | `trufflesecurity/trufflehog` | Secret scanning across full git history - accidental commits of `.env` values or private keys.                                                          |
| **npm audit**          | built-in                     | CVEs in the npm dependency tree at `high` severity threshold.                                                                                           |
| **Frontend npm audit** | built-in                     | Separate audit of `src/package-lock.json` at `high` severity threshold.                                                                                 |
| **CodeQL**             | `github/codeql-action`       | TypeScript SAST: path traversal, prototype pollution, SSRF, and other CWEs via the `security-extended` query suite.                                     |

</details>

### `frontend-deploy.yml` - Vercel Deploy

Triggers on push to `main` when files under `src/**`,
`artifacts/deployed-addresses.json`, or the workflow file itself change. Also
supports manual `workflow_dispatch`.

<details>
<summary>Expand - Deploy Steps and Required Secrets</summary>

| Step   | What it does                                                                             |
| ------ | ---------------------------------------------------------------------------------------- |
| Pull   | `vercel pull --environment=production` - syncs project settings and env vars from Vercel |
| Build  | `vercel build --prod` - builds the Next.js app using Vercel's build pipeline             |
| Deploy | `vercel deploy --prebuilt --prod` - uploads the prebuilt output to Vercel's edge network |

Requires three repository secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and
`VERCEL_PROJECT_ID`. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for setup
instructions.

</details>

### `dependabot-automerge.yml` - Dependabot Auto-Merge

<details>
<summary>Expand - Auto-Merge Rules</summary>

| Condition                                                  | Action                                  |
| ---------------------------------------------------------- | --------------------------------------- |
| PR has one or more GHSA IDs (security advisory)            | Auto-merge via squash, any semver level |
| Patch bump of a dev-only dependency (no security advisory) | Auto-merge via squash                   |
| Everything else (minor/major, prod deps)                   | Requires manual review                  |

</details>

`--auto` queues the merge and executes only after all required branch protection
checks pass. Enable **auto-merge** in repository Settings → General and
configure required status checks in Settings → Branches.

[↑ Back to top](#table-of-contents)

---

## Code Review and Git Commit Best Practices

### CodeRabbit

[CodeRabbit](https://coderabbit.ai) performs automated AI code review on every
pull request. Configuration lives in `.coderabbit.yaml` at the repo root.

<details>
<summary>Expand - CodeRabbit Review Paths and Focus Areas</summary>

| Path                        | Review focus                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `contracts/src/**/*.sol`    | Reentrancy, access control, pull-over-push pattern, event emissions, unchecked arithmetic |
| `contracts/test/**/*.sol`   | Revert coverage, fuzz tests for unbounded inputs, no hardcoded addresses                  |
| `contracts/script/**/*.sol` | No hardcoded secrets, correct `vm.startBroadcast` scope                                   |
| `**/*.ts`                   | No `any`, missing `await`, unhandled rejections, no hardcoded keys                        |
| `hardhat.config.ts`         | Consistent compiler version and optimizer settings with `foundry.toml`                    |
| `.github/workflows/**`      | Pinned action versions, secrets via `secrets.*` only, least-privilege permissions         |

</details>

Interact with CodeRabbit in any PR comment:

```text
@coderabbitai summary
@coderabbitai review
@coderabbitai help
```

### Git Commit Guidelines

Commit messages are enforced automatically by
[commitlint](https://commitlint.js.org/) via a `commit-msg` git hook. A
non-conforming message will be rejected at commit time with a clear error. Use
[Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add claimWarrantyFunds to release hold-back after warranty period
fix: prevent double-release when acceptanceDeadline and warrantyDeadline coincide
test: add fuzz coverage for partial ruling payout conservation
chore: bump hardhat to 2.28.6
docs: update README with frontend integration guide
style: fix Solhint max-line-length warning in JurorRegistry
```

<details>
<summary>Expand - Commit Type Reference</summary>

| Type       | When to use                                     |
| ---------- | ----------------------------------------------- |
| `feat`     | New feature or function                         |
| `fix`      | Bug fix                                         |
| `test`     | Add or update tests                             |
| `chore`    | Dependency bumps, config changes, build tooling |
| `docs`     | Documentation only                              |
| `style`    | Linting or formatting fixes (no logic change)   |
| `refactor` | Code restructured without behavior change       |

</details>

Keep the subject line under 72 characters. Reference issue numbers in the body
when applicable. Do not include AI tool attribution footers.

To test commitlint without making a real commit:

```bash
# Should pass silently
echo "feat: add escrow timeout mechanism" | npx commitlint

# Should fail with type-empty and subject-empty errors
echo "wip" | npx commitlint

# Test the commit-msg hook directly on a temp file
echo "bad message" > /tmp/test-commit-msg && \
  npx commitlint --edit /tmp/test-commit-msg
```

[↑ Back to top](#table-of-contents)

---

## Testnet vs. Local - Do You Need Faucet Funds?

No. All local development, demos, and tests run entirely on the Hardhat node
inside the container. Hardhat pre-funds all 20 test accounts with 10,000 ETH
each - no external faucet is needed.

Faucet ETH (Ethereum Sepolia) is only required when you deploy to the public
testnet:

```bash
# Requires SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY in .env
npm run hardhat:deploy:sepolia
```

For testnet faucet ETH: use a Sepolia ETH faucet (Alchemy, Infura, or Google).

[↑ Back to top](#table-of-contents)

---

## Security

See [SECURITY.md](SECURITY.md) for the full vulnerability reporting policy,
in-scope contracts, severity classification, and response timeline.

**Do not open public GitHub issues for security vulnerabilities.** Report
privately via the contact in `SECURITY.md`.

TrustLedger is currently pre-mainnet. No contracts hold real user funds. The
codebase targets Ethereum Sepolia (testnet) and is under active development.

[↑ Back to top](#table-of-contents)

---

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE)
for full terms.

---

## Authors

- [Kevin Le](https://www.linkedin.com/in/lekevin1/)
- [Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

---

[↑ Back to top](#table-of-contents) &nbsp;·&nbsp;
[Frontend (`src/`)](src/README.md) &nbsp;·&nbsp;
[Architecture](docs/ARCHITECTURE.md) &nbsp;·&nbsp;
[Contracts API](docs/CONTRACTS.md) &nbsp;·&nbsp;
[Deployment](docs/DEPLOYMENT.md) &nbsp;·&nbsp;
[Contributing](docs/CONTRIBUTING.md) &nbsp;·&nbsp; [Security](SECURITY.md)
