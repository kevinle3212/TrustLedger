# Deployment

TrustLedger has two independently deployable pieces:

- **Contracts** — Solidity contracts deployed to Ethereum Sepolia via Foundry and a GitHub Actions workflow (`deploy.yml`).
- **Frontend** — Next.js app deployed to [Vercel](https://vercel.com) via a separate workflow (`frontend-deploy.yml`).

**Production URL:** [https://trustledger-zeta.vercel.app](https://trustledger-zeta.vercel.app)

The two pipelines are linked: after a successful contract deploy, `deploy.yml` automatically updates the `NEXT_PUBLIC_TRUSTLEDGER_ADDRESS` env var in Vercel and triggers a frontend redeploy. You never need to manually sync an address.

---

## Prerequisites

- A Vercel account (free Hobby tier works)
- The [Vercel CLI](https://vercel.com/docs/cli) installed locally: `npm install -g vercel`
- A funded Ethereum Sepolia wallet (see `.env.example` for faucet links)
- Write access to the GitHub repository (to add secrets and environments)

---

## One-Time Setup

### 1. Link the project to Vercel

From the `src/` directory:

```bash
cd src
vercel link
```

Follow the prompts to log in and connect to your Vercel team/account. This writes `src/.vercel/project.json` — **do not commit it**.

### 2. Retrieve the Vercel project IDs

```bash
cat src/.vercel/project.json
# {"orgId":"team_xxx","projectId":"prj_xxx","projectName":"trustledger"}
```

Note the `orgId` and `projectId` values.

### 3. Generate a Vercel API token

1. Go to **Vercel Dashboard → Settings → Tokens**.
2. Click **Create** → name it (e.g. `trustledger-ci`) → scope to your team.
3. Copy the token — it is shown only once.

### 4. Create the `ethereum-sepolia` GitHub Environment

`deploy.yml` runs inside a GitHub Environment for approval gates and scoped secrets.

1. Go to **GitHub repo → Settings → Environments → New environment**.
2. Name it exactly `ethereum-sepolia`.
3. Add the following secrets to the environment:

| Secret                 | Value                                                     |
| ---------------------- | --------------------------------------------------------- |
| `SEPOLIA_RPC_URL`      | Alchemy or Infura Sepolia endpoint (see `.env.example`)   |
| `DEPLOYER_PRIVATE_KEY` | Private key of your Sepolia deployer wallet — never reuse |
| `ETHERSCAN_API_KEY`    | From [etherscan.io](https://etherscan.io) → My API Keys   |
| `VERCEL_TOKEN`         | The token from step 3                                     |
| `VERCEL_ORG_ID`        | The `orgId` from `src/.vercel/project.json`               |
| `VERCEL_PROJECT_ID`    | The `projectId` from `src/.vercel/project.json`           |

### 5. Add repository-level secrets for the frontend workflow

`frontend-deploy.yml` runs outside any environment, so its Vercel secrets live at the repo level.

Go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret              | Value                                           |
| ------------------- | ----------------------------------------------- |
| `VERCEL_TOKEN`      | Same token from step 3                          |
| `VERCEL_ORG_ID`     | The `orgId` from `src/.vercel/project.json`     |
| `VERCEL_PROJECT_ID` | The `projectId` from `src/.vercel/project.json` |

### 6. Set Vercel environment variables

In the Vercel dashboard under **Project → Settings → Environment Variables**, or via the CLI:

```bash
vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID production
vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID preview
vercel env add NEXT_PUBLIC_TRUSTLEDGER_ADDRESS production
vercel env add NEXT_PUBLIC_TRUSTLEDGER_ADDRESS preview
vercel env add NEXT_PUBLIC_ARBITRATION_ADDRESS production
vercel env add NEXT_PUBLIC_ARBITRATION_ADDRESS preview
vercel env add NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS production
vercel env add NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS preview
```

| Variable                               | Environment        | Notes                                                                                           |
| -------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Production/Preview | Free project ID from [cloud.walletconnect.com](https://cloud.walletconnect.com) — type: App     |
| `NEXT_PUBLIC_TRUSTLEDGER_ADDRESS`      | Production/Preview | Set to `0x000…` initially; `deploy.yml` overwrites it after every contract deploy automatically |
| `NEXT_PUBLIC_ARBITRATION_ADDRESS`      | Production/Preview | Set to `0x000…` initially; `deploy.yml` overwrites it after every contract deploy automatically |
| `NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS`   | Production/Preview | Set to `0x000…` initially; `deploy.yml` overwrites it after every contract deploy automatically |
| `NEXT_PUBLIC_PINATA_JWT`               | Production/Preview | Pinata JWT for IPFS uploads — see `.env.example`                                                |
| `MAGIC_LINK_SECRET`                    | Production/Preview | Random 32-byte hex: `openssl rand -hex 32` — never expose                                       |
| `RESEND_API_KEY`                       | Production/Preview | From [resend.com/api-keys](https://resend.com/api-keys) — never expose                          |
| `RESEND_FROM`                          | Production/Preview | Verified sender address, e.g. `TrustLedger <noreply@yourdomain.com>`                            |
| `NEXT_PUBLIC_APP_URL`                  | Production/Preview | Base URL for magic links, e.g. `https://trustledger-zeta.vercel.app`                            |
| `NEXT_BASE_PATH`                       | Production/Preview | Leave unset to serve from root `/`; only needed for sub-path hosting                            |

> **Why contract address env vars must be set in Vercel:**
> `artifacts/deployed-addresses.json` is gitignored and never reaches the CI checkout. The Vercel build has no access to it. Env vars are the only mechanism for the frontend to know the deployed addresses. `deploy.yml` keeps all three (`TrustLedger`, `Arbitration`, `JurorRegistry`) in sync automatically after every deploy.

---

## Contract Deployment

Contracts are deployed via the manually-triggered `deploy.yml` workflow on GitHub Actions.

### Via GitHub Actions (recommended)

1. Go to **GitHub repo → Actions → Deploy (Ethereum Sepolia)**.
2. Click **Run workflow**.
3. Set the script target (default: `script/Deploy.s.sol:Deploy`) and whether to verify on Etherscan.
4. Click **Run workflow**.

The workflow:

1. Builds and tests the contracts (`forge build` + `forge test`).
2. Runs the Forge deploy script with `--broadcast`.
3. Parses the broadcast output to extract the deployed `TrustLedger` address.
4. Updates `NEXT_PUBLIC_TRUSTLEDGER_ADDRESS` in Vercel via the Vercel API.
5. Triggers `frontend-deploy.yml` to rebuild the frontend with the new address.

### Via local CLI (manual)

Requires a `.env` file with `SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, and `ETHERSCAN_API_KEY`.

```bash
# Foundry — dry run (no broadcast)
npm run start:deploy:dry-run

# Foundry — live deploy with Etherscan verification
npm run start:deploy:foundry

# Hardhat — live deploy
npm run start:deploy:hardhat
```

After a local deploy, update `NEXT_PUBLIC_TRUSTLEDGER_ADDRESS` in Vercel manually and trigger a frontend redeploy:

```bash
vercel env rm NEXT_PUBLIC_TRUSTLEDGER_ADDRESS production
echo "0xYOUR_ADDRESS" | vercel env add NEXT_PUBLIC_TRUSTLEDGER_ADDRESS production
vercel deploy --prod
```

---

## Frontend Deployment

### Automatic (CI/CD)

`frontend-deploy.yml` deploys to production automatically on every push to `main` that touches `src/**` or `.github/workflows/frontend-deploy.yml`. It is also triggered by `deploy.yml` after a contract deploy.

The workflow:

1. `vercel pull --environment=production` — syncs env vars and project config from Vercel.
2. `vercel build --prod` — builds the Next.js app locally in CI with the pulled env vars.
3. `vercel deploy --prebuilt --prod` — uploads the pre-built output to Vercel's edge network without rebuilding on Vercel's servers.

### Manual

```bash
cd src

# Preview deploy (staging URL)
vercel

# Production deploy
vercel --prod

# Or via npm script
npm run deploy:vercel
```

---

## Preview Deployments

Vercel creates a preview URL for every pull request when the [Vercel GitHub Integration](https://vercel.com/docs/deployments/git/vercel-for-github) is installed. Enable it from the Vercel dashboard. Preview deployments use the `Preview` env vars set in step 6 above.

---

## Rollback

To revert the frontend to a previous deployment:

1. Go to **Vercel Dashboard → Deployments**.
2. Find the deployment you want to restore.
3. Click **⋯ → Promote to Production**.

To revert to a previous contract version, redeploy the old commit tag via `deploy.yml` with the script target pointing to the desired version.
