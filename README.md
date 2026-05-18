# TrustLedger

A decentralized escrow and dispute resolution protocol for freelance agreements, deployed on Ethereum. Clients lock ETH or ERC-20 tokens; freelancers complete work; disputes are resolved by a staked juror panel using commit-reveal voting.

---

## Documentation

| Document                                       | Description                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)   | System diagram, state machine, payout formulas, storage layout     |
| [docs/CONTRACTS.md](docs/CONTRACTS.md)         | Full public API for all four contracts — functions, events, errors |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)   | Local setup, compiling, testing, linting, deploying to testnet     |
| [docs/DOCKER.md](docs/DOCKER.md)               | Docker prerequisites, services, MetaMask setup, troubleshooting    |
| [docs/PRESENTATION.md](docs/PRESENTATION.md)   | Slide-by-slide presentation notes for the Oregon Blockchain Group  |
| [docs/MISCELLANEOUS.md](docs/MISCELLANEOUS.md) | Glossary, tooling rationale, Chainlink setup, design decisions     |
| [SECURITY.md](SECURITY.md)                     | Vulnerability reporting policy and severity classification         |

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

When a contract is created, a `keccak256` hash of the off-chain agreement document and its IPFS URI are stored on-chain. When the freelancer submits work, a hash of the deliverable and its IPFS URI are stored the same way. Neither party can alter what was agreed to or what was delivered after the fact. Any tampering is immediately detectable by recomputing the hash.

### ECDSA Wallet Binding on Acceptance

The freelancer does not accept a contract by calling a function alone — they must submit an EIP-191 signature over `keccak256(contractId, freelancerAddress)`. The contract recovers the signer on-chain via `ecrecover` and rejects any mismatch. This prevents a third party from accepting a contract on a freelancer's behalf without their private-key authorization.

### Commit-Reveal Voting Prevents Herding

Jurors submit a `keccak256` commitment of their vote before anyone reveals. Votes are hidden during the commit phase so no juror can see the crowd forming and pile on. Only after the commit window closes do jurors reveal their actual numbers. Any deviation from the original commitment is rejected on-chain.

### Verifiable Random Juror Selection — Chainlink VRF

When Chainlink VRF is configured, jurors are selected at dispute-open time using on-chain verifiable randomness — not self-selection. Only pre-selected wallets can participate. When VRF is not configured, jurors self-select from the eligible pool (legacy mode). Both modes use the same commit-reveal flow.

### Partial Completion Rulings and Proportional Payouts

Jurors vote on a completion percentage (0-100), not a binary verdict. The median vote becomes the ruling. The payout formula is proportional: the freelancer's share scales with the ruling, and the arbitration fee burden is split proportionally between both parties — not charged entirely to the freelancer. This prevents winner-takes-all outcomes that neither party finds fair.

### Juror Slashing and On-Chain Reputation

Minority jurors — those whose votes fall more than 20 percentage points from the median — lose 10% of their staked ETH. Jurors who commit but never reveal are slashed the same way. Reputation decays with each minority vote and is tracked permanently on-chain. Jurors who vote accurately earn fee-pool rewards; careless or dishonest jurors lose money.

### Appeals with Escalating Panels

Either party can appeal a ruling within 72 hours by posting a 1.5× bond. The appeal opens a new dispute with double the juror panel (5 → 10 for the first appeal). Original jurors are explicitly blocked from the appeal panel so the second review is independent. If the appeal changes the ruling the bond is returned; if it confirms the original the bond is forfeited.

### Warranty Hold-Back

Clients can configure 5-15% of the payment to be withheld until a warranty period expires. If a defect surfaces after approval but within the warranty window, the client retains negotiating leverage. The hold-back is released to the freelancer automatically once the warranty deadline passes — no further action needed from either party.

### Automatic Release — Anti-Ghosting

After a freelancer submits proof of work, the client has a configurable acceptance window (minimum 48 hours) to approve or dispute. If the client does nothing, the freelancer can claim full payment once the window closes. Clients cannot indefinitely delay payment by simply not responding.

### ETH and ERC-20 Stablecoin Escrow

Escrow can be funded with native ETH or any ERC-20 token (e.g. USDC, DAI). Clients choose at creation time by specifying a token address; `address(0)` means ETH. All payout, hold-back, and dispute logic is token-aware. Stablecoin escrow eliminates price-volatility risk on long-duration agreements.

### Chainlink Price Feed — USD Value Lock

When a Chainlink ETH/USD feed is configured, the USD equivalent of the escrowed ETH is recorded on-chain at the moment of contract creation. Both parties can see — and later verify — the agreed dollar value regardless of subsequent ETH price moves.

### Bidirectional On-Chain Reputation

After a contract reaches a final state (approved or resolved), both parties can submit a rating score (1-100) for each other via `submitRating()`. Scores accumulate permanently on-chain in `ReputationRegistry`. Only `TrustLedger` can call `rate()` — third parties cannot manipulate scores.

### IPFS Hybrid Storage

Contract documents and proof-of-work artifacts are stored off-chain on IPFS. The smart contract holds only a 32-byte cryptographic hash and a URI pointer to each document. This keeps gas costs low while making any tampering immediately detectable.

### Permissionless Phase Transitions

Phase advances (`advanceToReveal`, `finalizeDispute`, `executeRuling`) are callable by anyone, not gated to a platform operator. The system progresses autonomously — no trusted admin is needed to move disputes forward or execute payouts.

---

## Tech Stack

| Layer                          | Technology                                |
| ------------------------------ | ----------------------------------------- |
| Smart contracts                | Solidity 0.8.24                           |
| Contract testing (unit + fuzz) | Foundry (Forge)                           |
| Contract testing (integration) | Hardhat 2.x + Mocha/Chai                  |
| TypeScript types               | TypeChain (ethers-v6)                     |
| Chain                          | Ethereum Sepolia (testnet)                |
| Off-chain storage              | IPFS via Web3.Storage                     |
| Wallet                         | MetaMask + RainbowKit                     |
| Frontend (planned)             | React, wagmi, viem, RainbowKit            |
| Backend (planned)              | Node.js, TypeScript, SQL                  |
| Randomness                     | Chainlink VRF v2                          |
| Price feed                     | Chainlink AggregatorV3 (ETH/USD)          |
| Reentrancy guard               | OpenZeppelin ReentrancyGuard v5           |
| Linting                        | Solhint, ESLint 9 (flat config), Prettier |
| CI/CD                          | GitHub Actions                            |
| Security scans                 | Slither, TruffleHog, CodeQL, npm audit    |
| Containerization               | Docker                                    |

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

| Interface                   | Used By     | Purpose                                               |
| --------------------------- | ----------- | ----------------------------------------------------- |
| `IArbitration.sol`          | TrustLedger | `openDispute()` payable call                          |
| `ITrustLedger.sol`          | Arbitration | `executeRuling()` callback                            |
| `IJurorRegistry.sol`        | Arbitration | Lock/unlock/slash/eligibility                         |
| `IReputationRegistry.sol`   | TrustLedger | `rate()` after contract completion                    |
| `IERC20.sol`                | TrustLedger | `transfer()` / `transferFrom()` for stablecoin escrow |
| `AggregatorV3Interface.sol` | TrustLedger | `latestRoundData()` for ETH/USD price                 |
| `IVRFCoordinator.sol`       | Arbitration | `requestRandomWords()` for juror selection            |

### Optional One-Time Initializers

Three optional integrations are wired in after deployment via one-time setter functions. Once set they cannot be changed — there is no owner role.

| Function                          | Contract    | Effect                                          |
| --------------------------------- | ----------- | ----------------------------------------------- |
| `initPriceFeed(address)`          | TrustLedger | Enables Chainlink ETH/USD recording at creation |
| `initReputationRegistry(address)` | TrustLedger | Enables post-completion on-chain ratings        |
| `initVrfCoordinator(address)`     | Arbitration | Enables Chainlink VRF juror selection           |

### Deploy Order — Circular Dependency Resolution

All three contracts have cross-references. Both deploy scripts precompute the Arbitration address before deployment so no contract needs a mutable setter:

```text
nonce N   →  JurorRegistry  (initialized with precomputed Arbitration address)
nonce N+1 →  TrustLedger    (initialized with precomputed Arbitration address)
nonce N+2 →  Arbitration    (actual deploy — lands at the precomputed address)
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

For a ruling of `pct`% on a contract with `amount` and `arbitrationFeeBps`:

```text
feePool          = amount × arbitrationFeeBps / 10000
rawPay           = (2 × pct × amount) / 300
freelancerFee    = feePool × pct / 100
freelancerPay    = rawPay − freelancerFee
clientRefund     = amount − feePool − freelancerPay
```

`0%` → full refund to client. `100%` → full payout to freelancer. Partial rulings scale proportionally with no threshold cliffs.

---

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 22
- [Foundry](https://book.getfoundry.sh/getting-started/installation) — `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (optional, for containerized dev)

Install dependencies:

```bash
npm install
```

### Environment Variables

```bash
cp .env.example .env
```

Fill in `.env` based on your target:

| Variable                  | Required for          | Description                                                                   |
| ------------------------- | --------------------- | ----------------------------------------------------------------------------- |
| `SEPOLIA_RPC_URL`         | Testnet deploy        | Alchemy or Infura Ethereum Sepolia HTTPS endpoint                             |
| `DEPLOYER_PUBLIC_ADDRESS` | Testnet deploy        | The `0x…` address of your deployer wallet                                     |
| `DEPLOYER_PRIVATE_KEY`    | Testnet deploy        | Raw hex private key — **never commit this value**                             |
| `ETHERSCAN_API_KEY`       | Contract verification | Etherscan API key from [etherscan.io/myapikey](https://etherscan.io/myapikey) |

`.env` is in `.gitignore` and will never be committed. Use a dedicated testnet-only wallet; never use a wallet that holds real funds.

### Local Development (Hardhat Node)

```bash
# Terminal 1 — start local chain (keep open)
npm run node
```

Hardhat prints 20 pre-funded test accounts with addresses and private keys on startup. Use those for local testing. Account #0 is the deployer.

```bash
# Terminal 2 — compile and deploy
npm run compile
npm run hardhat:deploy:local
```

Deployed addresses are written to `artifacts/deployed-addresses.json` automatically.

### Ethereum Sepolia (Testnet)

Generate a fresh throwaway wallet with `cast` (included with Foundry):

```bash
cast wallet new
```

Copy the address and private key into `.env`. Fund the address from an [Ethereum Sepolia faucet](https://alchemy.com/faucets/ethereum-sepolia), then:

```bash
npm run hardhat:deploy:sepolia
```

Deployed addresses are printed to the console and written to `artifacts/deployed-addresses.json`.

### Docker

The Docker setup gives every contributor an identical environment without installing Node or Foundry on the host.

**Dev container:**

```bash
# Build image (first time or after package-lock.json changes)
docker compose -f docker/docker-compose.dev.yml build

# Start the dev environment (Hardhat node on localhost:8545)
docker compose -f docker/docker-compose.dev.yml up

# Open a shell inside the container
docker compose -f docker/docker-compose.dev.yml exec dev bash

# Run tests from inside the container
docker compose -f docker/docker-compose.dev.yml exec dev npm run hardhat:test
docker compose -f docker/docker-compose.dev.yml exec dev bash -c "cd contracts && forge test"

# Tear down
docker compose -f docker/docker-compose.dev.yml down
```

**CI image** (reproduces what GitHub Actions runs):

```bash
docker build --file docker/Dockerfile.ci --tag trustledger-ci .
```

---

## Development Scripts

### Hardhat

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

### Foundry

| Script                                   | What it runs                                         |
| ---------------------------------------- | ---------------------------------------------------- |
| `npm run foundry:build`                  | `forge build` — compile contracts via Foundry        |
| `npm run foundry:test`                   | `forge test` — run all Solidity unit and fuzz tests  |
| `npm run foundry:gas`                    | `forge test --gas-report` — per-function gas usage   |
| `npm run foundry:deploy:sepolia:dry-run` | Simulate Sepolia deploy (no broadcast), loads `.env` |
| `npm run foundry:deploy:sepolia`         | Broadcast deploy to Sepolia + Etherscan verification |

### Combined (One-Shot)

| Script                         | What it runs                                                            |
| ------------------------------ | ----------------------------------------------------------------------- |
| `npm run start:deploy:local`   | Compile → start local node (background) → deploy to localhost           |
| `npm run start:deploy:dry-run` | Foundry build → simulate Sepolia deploy (no broadcast)                  |
| `npm run start:deploy:hardhat` | Compile → deploy to Ethereum Sepolia via Hardhat.                       |
| `npm run start:deploy:foundry` | Foundry build → deploy to Ethereum Sepolia via Forge + Etherscan verify |

### Tooling

| Script                  | What it runs                             |
| ----------------------- | ---------------------------------------- |
| `npm run lint`          | ESLint (TypeScript) + Solhint (Solidity) |
| `npm run lint:ts`       | ESLint only                              |
| `npm run lint:sol`      | Solhint only                             |
| `npm run lint:prettier` | Prettier format check (read-only)        |
| `npm run build`         | `tsc` — compile `src/` to `dist/`        |

---

## How Hardhat and Foundry Are Used

TrustLedger uses both toolchains side by side. They share the same Solidity source files and
compiler settings (`solc 0.8.24`, `optimizer_runs = 200`, `via_ir = true`) but serve different
roles.

### Hardhat — integration layer

Hardhat is the TypeScript runtime for everything that crosses the contract boundary:

- **Local node** (`npm run node`) — an in-process EVM that mimics mainnet, used for manual
  interaction and demo scripts.
- **Deployment scripts** (`scripts/deploy.ts`) — ethers.js + TypeChain deploy all three contracts
  in the correct nonce order and write the resulting addresses to `artifacts/deployed-addresses.json`
  for frontend consumption.
- **Integration tests** (`test/TrustLedger.test.ts`, 73 tests) — multi-wallet flows written in
  TypeScript with full type safety. Tests cover ETH and ERC-20 escrow, Chainlink mock feeds, VRF
  mock, full dispute commit-reveal, appeals, and reputation. Balance diffs are verified at every
  payout step using ethers.js `BigInt` arithmetic.
- **TypeChain** — after every compile, TypeChain generates TypeScript classes for each contract so
  test code gets compile-time type checking on function signatures, arguments, and return values.

### Foundry — contract-native layer

Foundry runs entirely in Solidity, making it faster and more precise for low-level testing:

- **Unit tests** (`contracts/test/`, 65 tests) — Solidity-native tests using `vm.prank`,
  `vm.warp`, `vm.expectRevert`, and `vm.deal` cheatcodes. No JavaScript runtime overhead.
- **Fuzz tests** (`PayoutFuzz.t.sol`, 7 tests × 10,000 runs each) — property-based tests that
  prove payout invariants hold for the full `uint` input range. A single fuzz run covers more edge
  cases than hundreds of hand-written unit tests.
- **Gas reporting** (`npm run foundry:gas`) — per-function min/mean/max gas costs, used to catch
  regressions before deployment.
- **Deployment script** (`contracts/script/Deploy.s.sol`) — Forge script that precomputes contract
  addresses using the deployer's nonce, deploys all three contracts in order, and asserts the
  addresses match predictions. Run via `npm run foundry:deploy:sepolia`.
- **Formatter** (`forge fmt`) — enforces consistent Solidity style, configured in `foundry.toml`.

### Why both?

| Concern                  | Hardhat                                   | Foundry                            |
| ------------------------ | ----------------------------------------- | ---------------------------------- |
| Multi-wallet integration | Native (ethers.js signers)                | Requires `vm.prank` workarounds    |
| TypeScript / frontend    | Native (TypeChain, wagmi-compatible ABIs) | No TypeScript support              |
| Test speed               | Slower (Node.js + JSON-RPC)               | Faster (native EVM, no IPC)        |
| Fuzz testing             | Requires external tools                   | Built-in, 10k runs per test        |
| Time travel              | `evm_increaseTime` via JSON-RPC           | `vm.warp` — inline, zero overhead  |
| Gas reports              | Plugin-based, less granular               | Per-function, built-in             |
| Solidity deployment      | JS script via ethers.js                   | Native Solidity (`forge script`)   |
| Testnet verification     | `hardhat verify` (Etherscan plugin)       | `forge script --verify` (built-in) |

---

## Testing

### Hardhat (Mocha/Chai) — Integration Tests

```bash
npm run hardhat:test
```

73 tests in `test/TrustLedger.test.ts`. Covers the full escrow lifecycle for ETH and ERC-20,
Chainlink price feed mock, VRF mock, full dispute flow with commit-reveal, appeals, and
ReputationRegistry. Uses TypeChain typed contract wrappers.

### Foundry (Forge) — Unit + Fuzz Tests

```bash
npm run foundry:test
# or with traces:
cd contracts && forge test -vvv
```

73 Foundry tests across four suites:

| Suite                    | Count | Type            | Covers                                                                    |
| ------------------------ | ----- | --------------- | ------------------------------------------------------------------------- |
| `TrustLedgerTest`        | 33    | Unit            | Full lifecycle, deadline, warranty, dispute, ruling payouts, reverts      |
| `JurorRegistryTest`      | 22    | Unit            | Register, stake lock, slash, eligibility, active dispute guard            |
| `ReputationRegistryTest` | 11    | Unit            | Constructor, `rate()` access control, score bounds, accumulation          |
| `PayoutFuzz`             | 7     | Fuzz (10k runs) | Payout conservation, formula correctness, buffer factor, hold-back bounds |

Foundry config (`contracts/foundry.toml`):

- Fuzz: 10,000 random inputs per fuzz test
- Invariant: 256 runs × 500 call depth
- IR pipeline (`via_ir = true`) — handles complex functions without stack-too-deep errors

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

TypeScript ESLint uses the `strictTypeChecked` + `stylisticTypeChecked` presets from `typescript-eslint`. Type-aware rules apply across both `tsconfig.json` and `tsconfig.hardhat.json`.

### TypeScript Configuration

| File                    | Used by                                  | Module system                  |
| ----------------------- | ---------------------------------------- | ------------------------------ |
| `tsconfig.json`         | `src/` (SDK output to `dist/`)           | NodeNext ESM                   |
| `tsconfig.hardhat.json` | `hardhat.config.ts`, `scripts/`, `test/` | CommonJS (Hardhat requirement) |

Both extend `@tsconfig/strictest` with additional flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`).

---

## Usage

### For the Frontend Developer

After `npm run compile` and `npm run hardhat:deploy:local`, the following are available:

| Artifact                 | Location                                         |
| ------------------------ | ------------------------------------------------ |
| Contract ABIs            | `artifacts/contracts/src/<Name>.sol/<Name>.json` |
| TypeChain typed wrappers | `artifacts/typechain-types/`                     |
| Deployed addresses       | `artifacts/deployed-addresses.json`              |

**Install wallet integration packages:**

```bash
npm install @rainbow-me/rainbowkit wagmi viem @tanstack/react-query
```

**App setup with RainbowKit:**

```tsx
import { RainbowKitProvider, ConnectButton } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { hardhat, sepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

const config = getDefaultConfig({
	appName: "TrustLedger",
	projectId: "YOUR_WALLETCONNECT_PROJECT_ID",
	chains: [hardhat, sepolia],
});

export function App() {
	return (
		<WagmiProvider config={config}>
			<QueryClientProvider client={new QueryClient()}>
				<RainbowKitProvider>
					<ConnectButton />
				</RainbowKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	);
}
```

**Read and write contracts with wagmi hooks:**

```tsx
import { useReadContract, useWriteContract } from "wagmi";

// Read escrow state
const { data: escrow } = useReadContract({
	address: TRUSTLEDGER_ADDRESS,
	abi: TRUSTLEDGER_ABI,
	functionName: "getContract",
	args: [contractId],
});

// Write a transaction
const { writeContract } = useWriteContract();
writeContract({
	address: TRUSTLEDGER_ADDRESS,
	abi: TRUSTLEDGER_ABI,
	functionName: "approveWork",
	args: [contractId],
});
```

**Key view functions:**

| Contract             | Function                       | Returns                                         |
| -------------------- | ------------------------------ | ----------------------------------------------- |
| `TrustLedger`        | `getContract(id)`              | Full `EscrowContract` struct                    |
| `TrustLedger`        | `nextId()`                     | Total number of contracts created               |
| `Arbitration`        | `getDispute(disputeId)`        | Full `Dispute` struct                           |
| `Arbitration`        | `getJurors(disputeId)`         | Array of juror addresses                        |
| `Arbitration`        | `isMajority(disputeId, juror)` | Whether juror voted with majority               |
| `JurorRegistry`      | `getJuror(address)`            | Full `JurorInfo` struct                         |
| `JurorRegistry`      | `getJurorList()`               | All registered juror addresses                  |
| `JurorRegistry`      | `eligibleJurorCount()`         | Count of currently eligible jurors              |
| `JurorRegistry`      | `isEligible(address)`          | Whether an address can currently vote           |
| `ReputationRegistry` | `averageRating(address)`       | `(numerator, denominator)` — divide for average |

**Key events to index:**

| Event                                                      | Contract      | When                            |
| ---------------------------------------------------------- | ------------- | ------------------------------- |
| `ContractCreated(id, client, freelancer, amount)`          | TrustLedger   | New escrow created              |
| `ContractAccepted(id)`                                     | TrustLedger   | Freelancer accepted             |
| `ContractRejected(id)`                                     | TrustLedger   | Freelancer rejected             |
| `ProofSubmitted(id, hash, uri)`                            | TrustLedger   | Proof of work uploaded          |
| `WorkApproved(id)`                                         | TrustLedger   | Client approved                 |
| `WorkDisputed(id, arbitrationId)`                          | TrustLedger   | Dispute opened                  |
| `FundsReleased(id, to, amount)`                            | TrustLedger   | Funds transferred out of escrow |
| `ContractCancelled(id)`                                    | TrustLedger   | Contract cancelled              |
| `WarrantyFundsClaimed(id, freelancer, amount)`             | TrustLedger   | Warranty hold-back released     |
| `RulingExecuted(id, completionPct)`                        | TrustLedger   | Arbitration ruling applied      |
| `RatingSubmitted(id, rater, score)`                        | TrustLedger   | Post-contract rating submitted  |
| `DisputeOpened(disputeId, contractId, client, freelancer)` | Arbitration   | Dispute created                 |
| `VoteCommitted(disputeId, juror)`                          | Arbitration   | Juror submitted commitment      |
| `VoteRevealed(disputeId, juror, completionPct)`            | Arbitration   | Juror revealed vote             |
| `DisputeFinalized(disputeId, ruling)`                      | Arbitration   | Median ruling computed          |
| `Appealed(disputeId, appealer, bond)`                      | Arbitration   | Appeal filed                    |
| `Registered(juror, stake)`                                 | JurorRegistry | New juror registered            |
| `Slashed(juror, amount)`                                   | JurorRegistry | Juror stake slashed             |

### For the Backend Developer

The backend is responsible for the parts of the application flow that happen off-chain:

#### IPFS uploads before on-chain calls

Before calling `createContract()`, upload the agreement document to IPFS and pass the resulting CID as `contractURI`. Before calling `submitProofOfWork()`, upload the deliverable and pass the CID as `proofOfWorkURI`. The Solidity contract stores the CID and a `keccak256` hash of the file — the backend must hash the file before upload and pass both values.

#### Magic-link freelancer onboarding

The client submits the contract via the website and a signed magic link is emailed to the freelancer. The backend generates a single-use JWT containing the `contractId`, emails it to the freelancer's address, and the frontend uses the link to pre-fill the `acceptContract()` call. The on-chain acceptance requires a pre-computed ECDSA signature:

```ts
const inner = ethers.solidityPackedKeccak256(
	["uint256", "address"],
	[contractId, freelancerAddress],
);
const sig = ethers.Signature.from(await wallet.signMessage(ethers.getBytes(inner)));
// Call: trustLedger.acceptContract(contractId, sig.v, sig.r, sig.s)
```

#### Deadline notifications

Subscribe to `ContractCreated` and `ContractAccepted` events. For each active contract, compare `projectDeadline` (stored in the `EscrowContract` struct via `getContract(id)`) against the current block time. Send deadline warnings starting 5 days out in 24-hour increments.

#### Event indexing

Use an Ethereum JSON-RPC node (Alchemy, Infura) or a dedicated indexer (The Graph) to subscribe to all contract events. Store indexed data in SQL for fast frontend queries without repeated on-chain reads. Key tables: contracts, disputes, jurors, ratings.

### Demo Scripts

Two scripts illustrate the full lifecycle against a running local node:

```bash
# Option A — two terminals
npm run node                   # terminal 1 (keep open)
npm run compile
npm run hardhat:deploy:local   # terminal 2

# Option B — single command (starts node in background)
npm run start:deploy:local

# Happy path — client approves, freelancer receives full 1 ETH
npm run demo:good

# Dispute flow — jurors vote 50%, freelancer receives ~0.258 ETH
npm run demo:bad
```

For MetaMask and Remix IDE manual testing, see `testing/demo-instructions.md`.

---

## Why Hardhat 2.x, Not 3.x

This project pins `hardhat@^2.x` intentionally. Hardhat 3.x was evaluated and reverted:

| Concern              | Hardhat 2.x                                                                 | Hardhat 3.x (alpha)                                        |
| -------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **TypeChain**        | Stable first-class plugin                                                   | No stable TypeChain plugin — 3.x overhauled the plugin API |
| **Toolbox**          | `hardhat-toolbox@5` bundles TypeChain + ethers v6 + gas reporter + coverage | 3.x toolbox is separate, incomplete, and still evolving    |
| **ESM/CJS**          | Works with `"module": "CommonJS"` + ts-node CJS override for Node.js 22+    | Defaults to ESM, which breaks the ts-node CJS workaround   |
| **Plugin ecosystem** | `hardhat-gas-reporter`, `solidity-coverage`, Slither all verified           | Several plugins lack 3.x-compatible releases               |
| **Stability**        | Mature, semver-stable                                                       | Alpha — breaking changes between releases disrupt CI       |

Upgrade once Hardhat 3.x reaches a stable release and TypeChain publishes a compatible plugin.

---

## File Layout

```text
TrustLedger/
├── contracts/                            # Foundry project root (self-contained)
│   ├── foundry.toml                      # Compiler version, optimizer, fuzz runs
│   ├── remappings.txt                    # Solidity import aliases
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
│   │   │   ├── TrustLedgerTest.t.sol     # 33 Foundry unit tests
│   │   │   ├── JurorRegistryTest.t.sol   # 22 Foundry unit tests
│   │   │   └── ReputationRegistryTest.t.sol  # 11 Foundry unit tests
│   │   └── fuzz/
│   │       └── PayoutFuzz.t.sol          # 7 fuzz tests (10k runs each)
│   ├── script/
│   │   └── Deploy.s.sol                  # Foundry deploy script
│   └── lib/                              # Vendored Foundry dependencies (committed)
│       ├── forge-std/
│       └── openzeppelin-contracts/
│
├── src/
│   └── index.ts                          # SDK entry point (reserved for tooling)
│
├── test/
│   └── TrustLedger.test.ts               # 73 Hardhat/Mocha integration tests
│
├── scripts/
│   ├── deploy.ts                         # Hardhat deploy (writes artifacts/deployed-addresses.json)
│   ├── check-balance.ts                  # Deployer balance checker
│   └── demo/
│       ├── demo-good.ts                  # Happy-path demo script
│       └── demo-bad.ts                   # Dispute-flow demo script
│
├── docker/
│   ├── Dockerfile.dev                    # Dev container (Node + Foundry)
│   ├── docker-compose.dev.yml            # Dev with live volume mount
│   └── Dockerfile.ci                     # CI test runner (compile + both test suites)
│
├── .github/
│   └── workflows/
│       ├── ci.yml                        # Lint, typecheck, Forge tests on every push/PR
│       ├── deploy.yml                    # Manual deploy to Ethereum Sepolia
│       ├── security.yml                  # Slither, TruffleHog, npm audit, CodeQL
│       └── dependabot-automerge.yml      # Auto-merge Dependabot security/patch PRs
│
├── artifacts/                            # Auto-generated — do not edit or commit
│   ├── deployed-addresses.json           # Written by deploy scripts — import in frontend
│   └── typechain-types/                  # TypeScript contract wrappers
│
├── hardhat.config.ts                     # Hardhat: compiler, networks, TypeChain, Etherscan
├── tsconfig.json                         # NodeNext ESM (src/)
├── tsconfig.hardhat.json                 # CommonJS (hardhat, scripts, tests)
├── eslint.config.mjs                     # ESLint 9 flat config (strictTypeChecked)
├── .prettierrc.json                      # Prettier formatting rules
├── .solhint.json                         # Solhint rules
├── package.json                          # npm scripts + dependencies
├── .env.example                          # Environment variable template — safe to commit
├── .env                                  # Actual secrets — NEVER commit this
├── .gitignore                            # Excludes .env, node_modules, build artifacts
├── .dockerignore                         # Excludes secrets/artifacts from Docker images
├── .coderabbit.yaml                      # CodeRabbit AI code review config
├── SECURITY.md                           # Vulnerability reporting policy
└── LICENSE                               # Apache-2.0
```

---

## GitHub Actions Workflows

Four workflows live in `.github/workflows/`. All use least-privilege tokens and concurrency groups to cancel stale runs on new commits.

### `ci.yml` — Continuous Integration

Runs on every push and pull request to `main`.

| Job            | What it does                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------- |
| **TypeScript** | `npm ci`, `tsc --noEmit`, ESLint + Solhint, Prettier format check                                 |
| **Solidity**   | Foundry install, `forge fmt --check`, `forge build --sizes`, `forge test -vvv`, gas snapshot diff |

The Solidity job sets `working-directory: contracts` so all `forge` commands run from the directory containing `foundry.toml`.

### `deploy.yml` — Manual Deploy to Ethereum Sepolia

Triggered only via **Actions → Run workflow** — never auto-deploys on push.

Requires a GitHub Environment named `ethereum-sepolia` with three secrets:

| Secret                 | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `SEPOLIA_RPC_URL`      | RPC endpoint (Alchemy or Infura)               |
| `DEPLOYER_PRIVATE_KEY` | Funded deployer wallet private key             |
| `ETHERSCAN_API_KEY`    | Etherscan API key (only needed when verifying) |

Broadcast artifacts (contract addresses, transaction receipts) are uploaded as a workflow artifact and retained for 30 days.

### `security.yml` — Security Scans

Runs on push/PR to `main`, manually via `workflow_dispatch`, and weekly (Mondays 13:00 UTC) to catch CVEs in transitive deps even when no code changes.

| Job            | Tool                         | Catches                                                                                                                                                 |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Slither**    | `crytic/slither-action`      | Solidity SAST: reentrancy, uninitialized storage, dangerous low-level calls. Results appear as inline PR comments via SARIF upload to the Security tab. |
| **TruffleHog** | `trufflesecurity/trufflehog` | Secret scanning across full git history — accidental commits of `.env` values or private keys.                                                          |
| **npm audit**  | built-in                     | CVEs in the npm dependency tree at `high` severity threshold.                                                                                           |
| **CodeQL**     | `github/codeql-action`       | TypeScript SAST: path traversal, prototype pollution, SSRF, and other CWEs via the `security-extended` query suite.                                     |

### `dependabot-automerge.yml` — Dependabot Auto-Merge

| Condition                                                  | Action                                  |
| ---------------------------------------------------------- | --------------------------------------- |
| PR has one or more GHSA IDs (security advisory)            | Auto-merge via squash, any semver level |
| Patch bump of a dev-only dependency (no security advisory) | Auto-merge via squash                   |
| Everything else (minor/major, prod deps)                   | Requires manual review                  |

`--auto` queues the merge and executes only after all required branch protection checks pass. Enable **auto-merge** in repository Settings → General and configure required status checks in Settings → Branches.

---

## Code Review and Git Commit Best Practices

### CodeRabbit

[CodeRabbit](https://coderabbit.ai) performs automated AI code review on every pull request. Configuration lives in `.coderabbit.yaml` at the repo root.

| Path                        | Review focus                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `contracts/src/**/*.sol`    | Reentrancy, access control, pull-over-push pattern, event emissions, unchecked arithmetic |
| `contracts/test/**/*.sol`   | Revert coverage, fuzz tests for unbounded inputs, no hardcoded addresses                  |
| `contracts/script/**/*.sol` | No hardcoded secrets, correct `vm.startBroadcast` scope                                   |
| `**/*.ts`                   | No `any`, missing `await`, unhandled rejections, no hardcoded keys                        |
| `hardhat.config.ts`         | Consistent compiler version and optimizer settings with `foundry.toml`                    |
| `.github/workflows/**`      | Pinned action versions, secrets via `secrets.*` only, least-privilege permissions         |

Interact with CodeRabbit in any PR comment:

```text
@coderabbitai summary
@coderabbitai review
@coderabbitai help
```

### Git Commit Guidelines

Commit messages are enforced automatically by [commitlint](https://commitlint.js.org/) via a `commit-msg` git hook. A non-conforming message will be rejected at commit time with a clear error. Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add claimWarrantyFunds to release hold-back after warranty period
fix: prevent double-release when acceptanceDeadline and warrantyDeadline coincide
test: add fuzz coverage for partial ruling payout conservation
chore: bump hardhat to 2.28.6
docs: update README with frontend integration guide
lint: fix Solhint max-line-length warning in JurorRegistry
```

| Type       | When to use                                     |
| ---------- | ----------------------------------------------- |
| `feat`     | New feature or function                         |
| `fix`      | Bug fix                                         |
| `test`     | Add or update tests                             |
| `chore`    | Dependency bumps, config changes, build tooling |
| `docs`     | Documentation only                              |
| `lint`     | Linting or formatting fixes                     |
| `refactor` | Code restructured without behavior change       |

Keep the subject line under 72 characters. Reference issue numbers in the body when applicable. Do not include AI tool attribution footers.

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

---

## Testnet vs. Local — Do You Need Faucet Funds?

No. All local development, demos, and tests run entirely on the Hardhat node inside the container. Hardhat pre-funds all 20 test accounts with 10,000 ETH each — no external faucet is needed.

Faucet ETH (Ethereum Sepolia) is only required when you deploy to the public testnet:

```bash
# Requires SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY in .env
npm run hardhat:deploy:sepolia
```

For testnet faucet ETH: use a Sepolia ETH faucet (Alchemy, Infura, or Google).

---

## Security

See [SECURITY.md](SECURITY.md) for the full vulnerability reporting policy, in-scope contracts, severity classification, and response timeline.

**Do not open public GitHub issues for security vulnerabilities.** Report privately via the contact in `SECURITY.md`.

TrustLedger is currently pre-mainnet. No contracts hold real user funds. The codebase targets Ethereum Sepolia (testnet) and is under active development.

---

## Authors

- Kevin Le
- Kellen Snider
