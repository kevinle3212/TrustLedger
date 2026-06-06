# TrustLedger - Frontend (`src/`)

> [← Back to root README](../README.md) &nbsp;·&nbsp;
> [Live App](https://trustledger-zeta.vercel.app) &nbsp;·&nbsp; [Docs](../docs/)
> &nbsp;·&nbsp; [Architecture](../docs/ARCHITECTURE.md) &nbsp;·&nbsp;
> [Contracts](../docs/CONTRACTS.md) &nbsp;·&nbsp;
> [GitHub Models](../docs/GITHUB_MODELS.md) &nbsp;·&nbsp;
> [Security](../SECURITY.md)

Next.js 16 dApp for interacting with the TrustLedger smart contracts on Ethereum
Sepolia. Hosted on [Vercel](https://vercel.com) at
**[trustledger-zeta.vercel.app](https://trustledger-zeta.vercel.app)**.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Install](#install)
- [Environment Variables](#environment-variables)
- [Development Server](#development-server)
- [File Layout](#file-layout)
    - [Pages - `app/`](#pages---app)
    - [Components - `components/`](#components---components)
    - [Library - `lib/`](#library---lib)
- [Scripts](#scripts)
- [CI/CD](#cicd)
- [Contract Artifacts](#contract-artifacts)
- [wagmi Integration](#wagmi-integration)
- [Key View Functions](#key-view-functions)
- [Key Events to Index](#key-events-to-index)
- [Security](#security)
- [License](#license)
- [Authors](#authors)

---

## Prerequisites

### Node.js

Node.js is the JavaScript runtime that powers the development server. Version 22
or later is required.

#### macOS / Linux - recommended via nvm (Node Version Manager)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Close and reopen your terminal, then run:

```bash
nvm install 22
node --version    # should print v22.x.x or later
```

#### Windows

Download the LTS installer from [nodejs.org](https://nodejs.org). Run it and
accept all defaults. After it finishes, open a new Command Prompt or PowerShell
and verify:

```bash
node --version
```

### Contracts (for local development)

If you want to connect the frontend to your own local blockchain (instead of
Ethereum Sepolia), you need to compile and deploy the contracts first. That
setup happens from the **repo root** (`TrustLedger/`), not from `src/`. See
[README.md](../README.md#setup) for the step-by-step guide.

For Ethereum Sepolia (the public testnet), the deployed contract address is
already in `artifacts/deployed-addresses.json` - no local setup needed.

---

## Install

Open a terminal and navigate to the `src/` directory inside the repo:

```bash
cd src
npm install
```

`npm install` reads `src/package.json` and downloads all the frontend
dependencies (Next.js, wagmi, Reown AppKit, Tailwind CSS, etc.) into a local
`node_modules/` folder. This takes about 30-60 seconds. You should see a summary
like `added 754 packages` when it finishes.

---

## Environment Variables

All frontend environment variables live in the **root `.env`** file (at
`TrustLedger/.env`), not inside `src/`. You do not need a `src/.env.local` file.

If you haven't copied the example file yet, do this from the repo root:

```bash
# from TrustLedger/ (repo root), not from src/
cp .env.example .env
```

Then open `.env` in any text editor and fill in the values below.

| Variable                                  | Required                   | Description                                                                                                               |
| ----------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`    | Yes, for wallet connection | Free project ID from WalletConnect Cloud - see steps below.                                                               |
| `NEXT_PUBLIC_TRUSTLEDGER_ADDRESS`         | No (auto-detected)         | Deployed `TrustLedger` contract address. Left blank, it is read from `artifacts/deployed-addresses.json` automatically.   |
| `NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS` | No (auto-detected)         | Deployed `ReputationRegistry` address. Same resolution as above. Required for `/reputation` and dashboard rating forms.   |
| `NEXT_BASE_PATH`                          | No                         | URL prefix. Leave empty (`NEXT_BASE_PATH=`) to serve from the root path `/`. The root `.env` already sets this correctly. |

> The email features (magic-link onboarding and contract notifications) use a
> separate group of server-side variables — `MAGIC_LINK_SECRET`,
> `RESEND_API_KEY`, `RESEND_FROM`, `NEXT_PUBLIC_APP_URL`, and (for notifications
> and the deadline cron) `NOTIFICATIONS_SECRET`, `CRON_SECRET`, and
> `NOTIFICATION_EMAILS`. All are documented inline in `.env.example`. They are
> optional for running the dApp UI, but required for sending email.

<details>
<summary>How to get a WalletConnect Project ID</summary>

WalletConnect is the protocol that lets MetaMask, Coinbase Wallet, and other
wallets connect to the site. You need a free project ID to use it.

1. Go to [cloud.walletconnect.com](https://cloud.walletconnect.com) and sign in
   or create a free account.
2. Click **Create Project**.
3. Give it any name (e.g. "TrustLedger"), choose type **App**, and click
   **Create**.
4. Your **Project ID** is shown on the project dashboard - it looks like a long
   string of letters and numbers.
5. Open your root `.env` file and paste it in:

    ```text
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id-here
    ```

> Without this ID, the wallet connect button will appear but may not work
> correctly in all browsers.

</details>

[↑ Back to top](#table-of-contents)

---

## Development Server

### Option A - Connect to Ethereum Sepolia (no local chain needed)

If `artifacts/deployed-addresses.json` already contains a Sepolia address (it
does after the last deploy), you can run the frontend and connect MetaMask to
Sepolia directly:

1. Fill in `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in the root `.env` (see
   above).
2. From `src/`, start the dev server:

    ```bash
    npm run dev:frontend
    ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.
4. In MetaMask, switch your network to **Ethereum Sepolia** and connect your
   wallet.

### Option B - Connect to a local Hardhat chain

Run the frontend against a local blockchain where test ETH is free and instant.

**Terminal 1** - Start the local Hardhat chain from the repo root:

```bash
npm run node
```

You will see 20 test accounts with their private keys printed. Keep this
terminal running.

**Terminal 2** - Compile and deploy contracts from the repo root:

```bash
npm run compile && npm run hardhat:deploy:local
```

This writes the deployed addresses to `artifacts/deployed-addresses.json`. The
frontend reads this file automatically - no env var copy needed.

**Terminal 3** - Start the frontend from `src/`:

```bash
npm run dev:frontend
```

Open [http://localhost:3000](http://localhost:3000). To interact with contracts,
add the local Hardhat network to MetaMask:

| Field           | Value                   |
| --------------- | ----------------------- |
| Network name    | `Hardhat Local`         |
| RPC URL         | `http://127.0.0.1:8545` |
| Chain ID        | `31337`                 |
| Currency symbol | `ETH`                   |

Then import a test account by copying any private key from the Terminal 1 output
into MetaMask.

The page hot-reloads automatically as you edit files under `app/`.

[↑ Back to top](#table-of-contents)

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
| `npm run debug:frontend:files`   | TypeScript trace + CPU profile - outputs `trace/` and `profile.cpuprofile` for compile-time debugging |
| `npm run deploy:vercel`          | Deploy to Vercel production (`vercel --prod`) - requires a linked project (`vercel link` from `src/`) |

GitHub Models scripts (`models:install`, `models:run`, `models:eval`) live in
the **repo root** `package.json`, not in `src/`. See
[docs/GITHUB_MODELS.md](../docs/GITHUB_MODELS.md).

[↑ Back to top](#table-of-contents)

---

## CI/CD

### `ci.yml` - Continuous Integration

Runs on every push and pull request to `main`. The `frontend` job covers this
package.

| Step                 | What it does                                |
| -------------------- | ------------------------------------------- |
| TypeScript typecheck | `npx tsc --noEmit`                          |
| Lint                 | `npm run lint:frontend` (ESLint + Prettier) |
| Build                | `npm run build:frontend`                    |

### `frontend-deploy.yml` - Vercel Deploy

Triggers on push to `main` when `src/**`, `artifacts/deployed-addresses.json`,
or the workflow file itself changes.

Pulls Vercel environment settings, builds with `vercel build --prod`, and
deploys the prebuilt output via `vercel deploy --prebuilt --prod`.

Requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as repository
secrets. See [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) for setup instructions.

### `security.yml` - Dependency Audit

The `frontend-dependencies` job runs `npm audit --omit=dev --audit-level=high`
against `src/package-lock.json` separately from the root audit.

[↑ Back to top](#table-of-contents)

---

## File Layout

```text
src/
├── app/                              # Next.js App Router pages
│   ├── api/
│   │   ├── magic-link/
│   │   │   ├── send/route.ts         # POST - generate & email a magic-link JWT to a freelancer
│   │   │   └── verify/route.ts       # GET  - validate the JWT and return the pre-signed accept payload
│   │   ├── notifications/route.ts    # POST - send a lifecycle email (bearer NOTIFICATIONS_SECRET)
│   │   ├── cron/
│   │   │   └── deadline-reminders/route.ts  # GET - daily cron: email parties about approaching deadlines
│   │   └── contract/
│   │       └── [id]/route.ts         # GET  - server-side aggregation of one on-chain contract
│   ├── arbitration/
│   │   └── [id]/page.tsx             # Dispute detail: commit/reveal voting UI for jurors and parties
│   ├── create/page.tsx               # Create-contract form: escrow amount, deadlines, IPFS upload
│   ├── dashboard/page.tsx            # User dashboard: lists all contracts where user is client or freelancer
│   ├── freelancer/
│   │   └── accept/page.tsx           # Magic-link landing page: freelancer reviews and accepts the contract
│   ├── juror/page.tsx                # Juror portal: register stake, view open disputes, cast commit/reveal votes
│   ├── reputation/page.tsx           # Reputation lookup and post-contract rating submission UI
│   ├── globals.css                   # Tailwind v4 base styles and CSS custom properties
│   ├── layout.tsx                    # Root layout: wraps every page with Providers and Navbar
│   ├── page.tsx                      # Landing page: hero, feature highlights, CTA buttons
│   └── favicon.ico
│
├── components/
│   ├── ConnectButton.tsx            # Wallet connect button (opens the Reown AppKit modal)
│   ├── Navbar.tsx                    # Sticky top nav with the wallet connect button
│   ├── Providers.tsx                 # WagmiProvider + QueryClientProvider + AppKit theme sync
│   └── ThemeToggle.tsx               # Light/dark mode toggle button
│
├── lib/
│   ├── abi.ts                        # TrustLedger / Arbitration / JurorRegistry / ReputationRegistry ABIs + status label map
│   ├── arweave.ts                    # Arweave upload helper - permanent on-chain storage for large artifacts
│   ├── encryption.ts                 # AES-GCM encrypt/decrypt for off-chain document privacy
│   ├── ipfs.ts                       # IPFS upload via Pinata's pinning API; returns CID for on-chain storage
│   ├── magicLink.ts                  # JWT sign/verify helpers for freelancer magic-link onboarding
│   ├── utils.ts                      # Address shortener, ETH formatter, status color map
│   ├── wagmi.ts                      # wagmi config + AppKit modal (chains, address resolver, featured wallets)
│   └── walletIds.ts                  # WalletConnect registry IDs for the AppKit featured-wallet list
│
├── services/                         # External-service integrations (server-only)
│   ├── email.ts                      # Resend wrapper + shared HTML email shell
│   └── notifications.ts              # Lifecycle email templates + pure deadline scanner
│
├── public/                           # Static assets served at the root URL
│   ├── logo.png                      # TrustLedger project logo
│   └── *.svg                         # Next.js default SVGs (file, globe, window, next, vercel)
│
├── proxy.ts                          # Security headers + per-IP API rate limiting (Next 16 proxy)
├── next.config.ts                    # basePath config + root .env injection via env key mapping
├── vercel.json                       # Vercel config: frontend + daily deadline-reminder cron
├── eslint.config.mjs                 # Frontend ESLint 9 flat config
├── postcss.config.mjs                # PostCSS config for Tailwind v4
├── tsconfig.json                     # Frontend TypeScript config (bundler mode)
├── tsconfig.debug.json               # Debug TS config for trace and CPU profile output
└── package.json                      # Frontend-only dependencies and scripts
```

### Pages - `app/`

| Page                                   | Route                              | Description                                                                                                                             |
| -------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `page.tsx`                             | `/`                                | Landing page                                                                                                                            |
| `create/page.tsx`                      | `/create`                          | Propose escrow contract (freelancer) - IPFS upload, deadlines, token selection                                                          |
| `dashboard/page.tsx`                   | `/dashboard`                       | Lists all contracts for the connected wallet                                                                                            |
| `client/accept/page.tsx`               | `/client/accept`                   | Magic-link client flow - verifies token, decrypt-to-view, accept (funds escrow) or reject                                               |
| `arbitration/[id]/page.tsx`            | `/arbitration/:id`                 | Per-dispute view - commit phase, reveal phase, ruling display                                                                           |
| `juror/page.tsx`                       | `/juror`                           | Juror portal - stake registration, eligibility, stake management                                                                        |
| `reputation/page.tsx`                  | `/reputation`                      | Look up cumulative escrow ratings (`ReputationRegistry.averageRating`)                                                                  |
| `api/magic-link/send/route.ts`         | `POST /api/magic-link/send`        | Generates a signed JWT and returns the magic link for the client to email                                                               |
| `api/magic-link/verify/route.ts`       | `GET /api/magic-link/verify`       | Verifies the JWT and returns the contract payload                                                                                       |
| `api/notifications/route.ts`           | `POST /api/notifications`          | Sends one lifecycle email (offer, work, approval, dispute, rating, deadline). Requires `Authorization: Bearer NOTIFICATIONS_SECRET`     |
| `api/cron/deadline-reminders/route.ts` | `GET /api/cron/deadline-reminders` | Daily Vercel Cron: scans on-chain contracts and emails parties about deadlines within 48h. Requires `Authorization: Bearer CRON_SECRET` |
| `api/contract/[id]/route.ts`           | `GET /api/contract/:id`            | Server-side read of one contract via `getContract()`, returned as JSON-safe, gateway-resolved data                                      |

### Components - `components/`

| File                | Description                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `ConnectButton.tsx` | Wallet connect button; opens the Reown AppKit modal (Coinbase, MetaMask, Phantom, Tangem, …)     |
| `Navbar.tsx`        | Sticky navigation bar with the wallet `ConnectButton` and page links                             |
| `Providers.tsx`     | Tree of `WagmiProvider` and `QueryClientProvider`, plus AppKit theme sync - wraps the entire app |
| `ThemeToggle.tsx`   | Light/dark mode toggle button; reads and writes the `theme` class on `<html>`                    |

### Library - `lib/`

| File            | Description                                                                                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `abi.ts`        | Contract ABIs including `REPUTATION_REGISTRY_ABI`; `STATUS_LABELS` for human-readable contract status strings                                                                                                            |
| `arweave.ts`    | Uploads files to Arweave for permanent, immutable storage; returns the transaction ID as a URI                                                                                                                           |
| `encryption.ts` | AES-GCM helpers: `encrypt(data, key)` → ciphertext, `decrypt(ciphertext, key)` → plaintext                                                                                                                               |
| `ipfs.ts`       | Uploads a `File` or `Blob` to IPFS via Pinata (`uploadToPinata`); returns the IPFS CID used as `contractURI` or `proofOfWorkURI`                                                                                         |
| `magicLink.ts`  | `signMagicToken({contractId, clientEmail, clientAddress, …})` / `verifyMagicToken(token)` - HMAC token helpers for the client accept flow                                                                                |
| `utils.ts`      | `shortenAddress`, `formatEth`, `statusColor` - formatting helpers used across pages                                                                                                                                      |
| `wagmi.ts`      | Exports `config` (built by the Reown AppKit wagmi adapter), creates the AppKit modal, and resolves contract addresses (`TRUSTLEDGER_ADDRESS`, `REPUTATION_REGISTRY_ADDRESS`, etc.) from env or `deployed-addresses.json` |
| `walletIds.ts`  | `WALLET_IDS` map of WalletConnect registry IDs and the ordered `FEATURED_WALLET_IDS` list for the AppKit modal (Base, MetaMask, Phantom, Tangem first, then Coinbase, Solflare, Robinhood, Cold, Brave, SoulSwap, …)     |

[↑ Back to top](#table-of-contents)

---

## Contract Artifacts

After `npm run compile` from the repo root:

| Artifact                 | Location                                         |
| ------------------------ | ------------------------------------------------ |
| Contract ABIs            | `artifacts/contracts/src/<Name>.sol/<Name>.json` |
| TypeChain typed wrappers | `artifacts/typechain-types/`                     |
| Deployed addresses       | `artifacts/deployed-addresses.json`              |

The frontend imports ABIs and the resolved address via `src/lib/abi.ts` and
`src/lib/wagmi.ts`. The address is injected by `next.config.ts` at build time -
no runtime fetch needed.

[↑ Back to top](#table-of-contents)

---

## wagmi Integration

**App setup with Reown AppKit** (`src/components/Providers.tsx`):

The AppKit modal is created once as an import side effect in `@/lib/wagmi`
(`createAppKit({ ... })`), so the provider tree only needs wagmi and React
Query. The modal itself is a web component injected into `document.body` — no
extra provider wraps the children.

```tsx
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { config } from "@/lib/wagmi"; // importing this runs createAppKit()

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                {children}
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

[↑ Back to top](#table-of-contents)

---

## Key View Functions

<details>
<summary>Expand - all read-only contract functions used by the frontend</summary>

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

</details>

> Full contract API reference → [docs/CONTRACTS.md](../docs/CONTRACTS.md)

[↑ Back to top](#table-of-contents)

---

## Key Events to Index

<details>
<summary>Expand - all events emitted by the contracts, used for frontend indexing</summary>

| Event                                                      | Contract      | When                            |
| ---------------------------------------------------------- | ------------- | ------------------------------- |
| `ContractProposed(id, client, freelancer, amount)`         | TrustLedger   | Freelancer proposed a contract  |
| `ContractAccepted(id)`                                     | TrustLedger   | Client accepted & funded escrow |
| `ContractRejected(id)`                                     | TrustLedger   | Client rejected the proposal    |
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

</details>

> Full event reference with indexed parameters →
> [docs/CONTRACTS.md](../docs/CONTRACTS.md)

[↑ Back to top](#table-of-contents)

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

---

[↑ Back to top](#table-of-contents) &nbsp;·&nbsp; [← Root README](../README.md)
&nbsp;·&nbsp; [Architecture](../docs/ARCHITECTURE.md) &nbsp;·&nbsp;
[Contracts API](../docs/CONTRACTS.md) &nbsp;·&nbsp;
[Deployment](../docs/DEPLOYMENT.md) &nbsp;·&nbsp;
[Contributing](../docs/CONTRIBUTING.md) &nbsp;·&nbsp; [Security](../SECURITY.md)
