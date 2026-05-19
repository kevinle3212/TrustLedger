# TrustLedger - Frontend

Next.js 16 static dApp for interacting with the TrustLedger smart contracts on Ethereum Sepolia.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Install](#install)
- [Environment Variables](#environment-variables)
- [Development Server](#development-server)
- [Scripts](#scripts)
- [CI/CD](#cicd)
- [Contract Artifacts](#contract-artifacts)
- [wagmi Integration](#wagmi-integration)
- [Key View Functions](#key-view-functions)
- [Key Events to Index](#key-events-to-index)

---

## Prerequisites

### Node.js

Node.js is the JavaScript runtime that powers the development server. Version 22 or later is required.

#### macOS / Linux — recommended via nvm (Node Version Manager)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Close and reopen your terminal, then run:

```bash
nvm install 22
node --version    # should print v22.x.x or later
```

#### Windows

Download the LTS installer from [nodejs.org](https://nodejs.org). Run it and accept all defaults. After it finishes, open a new Command Prompt or PowerShell and verify:

```bash
node --version
```

### Contracts (for local development)

If you want to connect the frontend to your own local blockchain (instead of Ethereum Sepolia), you need to compile and deploy the contracts first. That setup happens from the **repo root** (`TrustLedger/`), not from `src/`. See [README.md](../README.md#setup) for the step-by-step guide.

For Ethereum Sepolia (the public testnet), the deployed contract address is already in `artifacts/deployed-addresses.json` — no local setup needed.

---

## Install

Open a terminal and navigate to the `src/` directory inside the repo:

```bash
cd src
npm install
```

`npm install` reads `src/package.json` and downloads all the frontend dependencies (Next.js, wagmi, RainbowKit, Tailwind CSS, etc.) into a local `node_modules/` folder. This takes about 30-60 seconds. You should see a summary like `added 754 packages` when it finishes.

---

## Environment Variables

All frontend environment variables live in the **root `.env`** file (at `TrustLedger/.env`), not inside `src/`. You do not need a `src/.env.local` file.

If you haven't copied the example file yet, do this from the repo root:

```bash
# from TrustLedger/ (repo root), not from src/
cp .env.example .env
```

Then open `.env` in any text editor and fill in the values below.

| Variable                               | Required                   | Description                                                                                                               |
| -------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Yes, for wallet connection | Free project ID from WalletConnect Cloud — see steps below.                                                               |
| `NEXT_PUBLIC_TRUSTLEDGER_ADDRESS`      | No (auto-detected)         | Deployed `TrustLedger` contract address. Left blank, it is read from `artifacts/deployed-addresses.json` automatically.   |
| `NEXT_BASE_PATH`                       | No                         | URL prefix. Leave empty (`NEXT_BASE_PATH=`) to serve from the root path `/`. The root `.env` already sets this correctly. |

### Getting a WalletConnect Project ID

WalletConnect is the protocol that lets MetaMask, Coinbase Wallet, and other wallets connect to the site. You need a free project ID to use it.

1. Go to [cloud.walletconnect.com](https://cloud.walletconnect.com) and sign in or create a free account.
2. Click **Create Project**.
3. Give it any name (e.g. "TrustLedger"), choose type **App**, and click **Create**.
4. Your **Project ID** is shown on the project dashboard — it looks like a long string of letters and numbers.
5. Open your root `.env` file and paste it in:

    ```text
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id-here
    ```

> Without this ID, the wallet connect button will appear but may not work correctly in all browsers.

---

## Development Server

### Option A — Connect to Ethereum Sepolia (no local chain needed)

If `artifacts/deployed-addresses.json` already contains a Sepolia address (it does after the last deploy), you can run the frontend and connect MetaMask to Sepolia directly:

1. Fill in `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in the root `.env` (see above).
2. From `src/`, start the dev server:

    ```bash
    npm run dev:frontend
    ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.
4. In MetaMask, switch your network to **Ethereum Sepolia** and connect your wallet.

### Option B — Connect to a local Hardhat chain

Run the frontend against a local blockchain where test ETH is free and instant.

**Terminal 1** — Start the local Hardhat chain from the repo root:

```bash
npm run node
```

You will see 20 test accounts with their private keys printed. Keep this terminal running.

**Terminal 2** — Compile and deploy contracts from the repo root:

```bash
npm run compile && npm run hardhat:deploy:local
```

This writes the deployed addresses to `artifacts/deployed-addresses.json`. The frontend reads this file automatically — no env var copy needed.

**Terminal 3** — Start the frontend from `src/`:

```bash
npm run dev:frontend
```

Open [http://localhost:3000](http://localhost:3000). To interact with contracts, add the local Hardhat network to MetaMask:

| Field           | Value                   |
| --------------- | ----------------------- |
| Network name    | `Hardhat Local`         |
| RPC URL         | `http://127.0.0.1:8545` |
| Chain ID        | `31337`                 |
| Currency symbol | `ETH`                   |

Then import a test account by copying any private key from the Terminal 1 output into MetaMask.

The page hot-reloads automatically as you edit files under `app/`.

---

## Scripts

| Script                           | What it runs                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `npm run dev:frontend`           | Next.js dev server with hot reload                                                                    |
| `npm run build:frontend`         | Production build (`next build`, static export to `out/`)                                              |
| `npm run start:frontend`         | Serve the production build locally                                                                    |
| `npm run lint:frontend`          | ESLint + Prettier format check                                                                        |
| `npm run lint:frontend:ts`       | ESLint only (targets `app/`, `lib/`, `components/`)                                                   |
| `npm run lint:frontend:prettier` | Prettier format check (targets `app/`, `lib/`, `components/`, `next.config.ts`)                       |
| `npm run debug:frontend:files`   | TypeScript trace + CPU profile — outputs `trace/` and `profile.cpuprofile` for compile-time debugging |

---

## CI/CD

### `ci.yml` - Continuous Integration

Runs on every push and pull request to `main`. The `frontend` job covers this package.

| Step                 | What it does                                |
| -------------------- | ------------------------------------------- |
| TypeScript typecheck | `npx tsc --noEmit`                          |
| Lint                 | `npm run lint:frontend` (ESLint + Prettier) |
| Build                | `npm run build:frontend`                    |

### `frontend-deploy.yml` - Vercel Deploy

Triggers on push to `main` when `src/**`, `artifacts/deployed-addresses.json`, or the workflow file itself changes.

Pulls Vercel environment settings, builds with `vercel build --prod`, and deploys the prebuilt output via `vercel deploy --prebuilt --prod`.

Requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as repository secrets. See [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) for setup instructions.

### `security.yml` - Dependency Audit

The `frontend-dependencies` job runs `npm audit --omit=dev --audit-level=high` against `src/package-lock.json` separately from the root audit.

---

## Contract Artifacts

After `npm run compile` from the repo root:

| Artifact                 | Location                                         |
| ------------------------ | ------------------------------------------------ |
| Contract ABIs            | `artifacts/contracts/src/<Name>.sol/<Name>.json` |
| TypeChain typed wrappers | `artifacts/typechain-types/`                     |
| Deployed addresses       | `artifacts/deployed-addresses.json`              |

The frontend imports ABIs and the resolved address via `src/lib/abi.ts` and `src/lib/wagmi.ts`. The address is injected by `next.config.ts` at build time — no runtime fetch needed.

---

## wagmi Integration

**App setup with RainbowKit** (`src/components/Providers.tsx`):

```tsx
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { config } from "@/lib/wagmi";
import "@rainbow-me/rainbowkit/styles.css";

export function Providers({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(() => new QueryClient());

	return (
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>
				<RainbowKitProvider theme={darkTheme({ accentColor: "#6366f1" })}>
					{children}
				</RainbowKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	);
}
```

**Read and write contracts with wagmi hooks:**

```tsx
import { useReadContract, useWriteContract } from "wagmi";
import { TRUSTLEDGER_ABI } from "@/lib/abi";
import { TRUSTLEDGER_ADDRESS } from "@/lib/wagmi";

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

---

## Key View Functions

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
| `ReputationRegistry` | `averageRating(address)`       | `(numerator, denominator)` - divide for average |

---

## Key Events to Index

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
