# Deployment

TrustLedger has two independently deployable pieces:

- **Contracts** - Solidity contracts deployed to Ethereum Sepolia via Foundry and a GitHub Actions workflow (`deploy.yml`).
- **Frontend** - Next.js app deployed to [Vercel](https://vercel.com) via Vercel's Git integration (automatic on every push to `main` that touches `src/` or `artifacts/deployed-addresses.json`).

**Production URL:** [https://trustledger-zeta.vercel.app](https://trustledger-zeta.vercel.app)

The two pipelines are linked: after a successful contract deploy, `deploy.yml` automatically updates the contract address env vars in Vercel and triggers a frontend redeploy via the Vercel CLI. You never need to manually sync an address.

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

Follow the prompts to log in and connect to your Vercel team/account. This writes `src/.vercel/project.json` - **do not commit it**.

### 2. Retrieve the Vercel project IDs

```bash
cat src/.vercel/project.json
# {"orgId":"team_xxx","projectId":"prj_xxx","projectName":"trustledger"}
```

Note the `orgId` and `projectId` values.

### 3. Generate a Vercel API token

1. Go to **Vercel Dashboard → Settings → Tokens**.
2. Click **Create** → name it (e.g. `trustledger-ci`) → scope to your team.
3. Copy the token - it is shown only once.

### 4. Create the `ethereum-sepolia` GitHub Environment

`deploy.yml` runs inside a GitHub Environment for approval gates and scoped secrets.

1. Go to **GitHub repo → Settings → Environments → New environment**.
2. Name it exactly `ethereum-sepolia`.
3. Add the following secrets to the environment:

| Secret                 | Value                                                     |
| ---------------------- | --------------------------------------------------------- |
| `SEPOLIA_RPC_URL`      | Alchemy or Infura Sepolia endpoint (see `.env.example`)   |
| `DEPLOYER_PRIVATE_KEY` | Private key of your Sepolia deployer wallet - never reuse |
| `ETHERSCAN_API_KEY`    | From [etherscan.io](https://etherscan.io) → My API Keys   |
| `VERCEL_TOKEN`         | The token from step 3                                     |
| `VERCEL_ORG_ID`        | The `orgId` from `src/.vercel/project.json`               |
| `VERCEL_PROJECT_ID`    | The `projectId` from `src/.vercel/project.json`           |

### 5. Set Vercel environment variables

The frontend reads its configuration entirely from Vercel environment variables - there is no `.env` file on Vercel's build servers. The table below lists every variable, whether it is required, and where to get the value.

#### Required variables

These must be set before the frontend will work correctly in production.

| Variable                                  | Environment        | How to obtain                                                                                                                                                     |
| ----------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`    | Production/Preview | Free project ID from [cloud.walletconnect.com](https://cloud.walletconnect.com) - create a project of type **App**                                                |
| `NEXT_PUBLIC_TRUSTLEDGER_ADDRESS`         | Production/Preview | Set to `0x0000000000000000000000000000000000000000` initially; `deploy.yml` overwrites it automatically after every deploy                                        |
| `NEXT_PUBLIC_ARBITRATION_ADDRESS`         | Production/Preview | Set to `0x0000000000000000000000000000000000000000` initially; `deploy.yml` overwrites it automatically after every deploy                                        |
| `NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS`      | Production/Preview | Set to `0x0000000000000000000000000000000000000000` initially; `deploy.yml` overwrites it automatically after every deploy                                        |
| `NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS` | Production/Preview | Set manually after deploy (or from `artifacts/deployed-addresses.json` locally). Not yet synced by `deploy.yml` (Forge script deploy only three contracts today). |
| `MAGIC_LINK_SECRET`                       | Production/Preview | Random 32-byte hex: `openssl rand -hex 32` - ⚠️ never expose                                                                                                      |
| `RESEND_API_KEY`                          | Production/Preview | From [resend.com/api-keys](https://resend.com/api-keys) - ⚠️ never expose                                                                                         |
| `RESEND_FROM`                             | Production/Preview | Verified sender address in Resend, e.g. `TrustLedger <noreply@yourdomain.com>`                                                                                    |
| `NEXT_PUBLIC_APP_URL`                     | Production/Preview | Your deployment URL, e.g. `https://trustledger-zeta.vercel.app` - used to build magic link URLs in emails                                                         |

#### Optional variables

| Variable                 | Environment        | Notes                                                                                                                         |
| ------------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_PINATA_JWT` | Production/Preview | Pinata JWT for IPFS uploads - see [Obtaining a Pinata JWT](#obtaining-a-pinata-jwt) below. Leave unset to disable the feature |
| `NEXT_PUBLIC_GITHUB_URL` | -                  | **Do not set.** Auto-constructed from `VERCEL_GIT_REPO_OWNER`/`VERCEL_GIT_REPO_SLUG` system vars at build time                |
| `NEXT_BASE_PATH`         | Production/Preview | Leave unset to serve from root `/`; only needed for sub-path hosting                                                          |

> **Why contract address env vars must be set in Vercel:**
> `artifacts/deployed-addresses.json` is gitignored and never reaches the CI checkout. Vercel's build has no access to it. Env vars are the only mechanism the frontend uses to know deployed addresses.
> `deploy.yml` keeps the three core contracts in sync automatically after every Forge deploy; set `NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS` manually until the Forge script deploys `ReputationRegistry` too.

#### Method A - Vercel dashboard (recommended for first-time setup)

1. Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**.
2. For each variable in the table above, click **Add** and fill in:
    - **Key** - the variable name (e.g. `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`)
    - **Value** - the value
    - **Environments** - check **Production** and **Preview** (and **Development** if you want `vercel dev` to pick it up)
3. Click **Save**.
4. Trigger a redeploy to apply the new values: **Deployments → ⋯ → Redeploy**.

#### Method B - Vercel CLI

Run all of the following from the **repo root** (not `src/`). Each command prompts for the value interactively.

```bash
# Required - WalletConnect
vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID production
vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID preview

# Required - contract addresses (set to zero address initially; deploy.yml updates these)
vercel env add NEXT_PUBLIC_TRUSTLEDGER_ADDRESS production
vercel env add NEXT_PUBLIC_TRUSTLEDGER_ADDRESS preview
vercel env add NEXT_PUBLIC_ARBITRATION_ADDRESS production
vercel env add NEXT_PUBLIC_ARBITRATION_ADDRESS preview
vercel env add NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS production
vercel env add NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS preview

# Required - magic link / email
vercel env add MAGIC_LINK_SECRET production
vercel env add RESEND_API_KEY production
vercel env add RESEND_FROM production
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add NEXT_PUBLIC_APP_URL preview

# Optional - IPFS uploads via Pinata
vercel env add NEXT_PUBLIC_PINATA_JWT production
vercel env add NEXT_PUBLIC_PINATA_JWT preview
```

To inspect or update an existing variable:

```bash
vercel env ls                              # list all variables and their environments
vercel env rm NEXT_PUBLIC_APP_URL production   # remove before re-adding with a new value
echo "https://new-url.vercel.app" | vercel env add NEXT_PUBLIC_APP_URL production
```

### Obtaining a Pinata JWT

`NEXT_PUBLIC_PINATA_JWT` powers the **Upload File** tab on the contract creation page (IPFS pinning via Pinata).

1. Go to [app.pinata.cloud](https://app.pinata.cloud) and sign in (or create a free account).
2. In the left sidebar, click **API Keys**.
3. Click **+ New Key**.
4. Under **Key Permissions**, select **Files** scope (sufficient for pinning; no admin access needed).
5. Give the key a name (e.g. `trustledger-frontend`) and click **Create Key**.
6. Copy the **JWT** from the dialog - it is only shown once.
7. Paste it into your environment:
    - **Local dev**: add `NEXT_PUBLIC_PINATA_JWT=<jwt>` to the root `.env` file.
    - **Vercel**: run `vercel env add NEXT_PUBLIC_PINATA_JWT production` and `vercel env add NEXT_PUBLIC_PINATA_JWT preview`, pasting the JWT when prompted.

> **Note:** A Files-scoped JWT can only pin new content - it cannot delete pins or access account settings. It is safe to embed in a public Next.js bundle (`NEXT_PUBLIC_` prefix).

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
4. Updates all three contract address env vars in Vercel via the Vercel API.
5. Runs `vercel deploy --prod` to rebuild the frontend with the new addresses.

### Via local CLI (manual)

Requires a `.env` file with `SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, and `ETHERSCAN_API_KEY`.

```bash
# Foundry - dry run (no broadcast)
npm run start:deploy:dry-run

# Foundry - live deploy with Etherscan verification
npm run start:deploy:foundry

# Hardhat - live deploy
npm run start:deploy:hardhat
```

After a local deploy, update the contract address env vars in Vercel and trigger a frontend redeploy:

```bash
vercel env rm NEXT_PUBLIC_TRUSTLEDGER_ADDRESS production
echo "0xYOUR_ADDRESS" | vercel env add NEXT_PUBLIC_TRUSTLEDGER_ADDRESS production
# Repeat for NEXT_PUBLIC_ARBITRATION_ADDRESS and NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS if redeployed.
vercel deploy --prod
```

---

## Frontend Deployment

### Automatic (Git integration)

Vercel's Git integration deploys to production automatically on every push to `main`. The `ignoreCommand` in `src/vercel.json` skips the build if neither `src/` nor `artifacts/deployed-addresses.json` changed - so contract-only or docs-only pushes don't trigger a frontend build.

`deploy.yml` also triggers a frontend redeploy via `vercel deploy --prod` after updating contract addresses, bypassing the `ignoreCommand` (CLI-triggered deploys always proceed).

### Manual

Run all Vercel CLI commands from the **repo root** (not `src/`).

```bash
# Preview deploy (staging URL)
vercel

# Production deploy
vercel --prod
# or
npm run deploy:vercel
```

> **`.env.local`** is auto-generated by `vercel pull` - never create it manually. This project uses the root `.env` file for local frontend dev (read by `parseRootEnv()` in `next.config.ts`), so pulling env vars into `.env.local` is optional and only needed for `vercel dev`.

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

---

## Other GitHub Actions workflows

| Workflow                                                      | Purpose                                                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [`ci.yml`](../.github/workflows/ci.yml)                       | Lint, compile, Hardhat + Foundry tests, frontend build                                     |
| [`github-models.yml`](../.github/workflows/github-models.yml) | GitHub Models `.prompt.yml` and Python examples - see [GITHUB_MODELS.md](GITHUB_MODELS.md) |
| [`security.yml`](../.github/workflows/security.yml)           | Dependency and code scanning                                                               |
