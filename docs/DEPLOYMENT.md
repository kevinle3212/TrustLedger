# Deployment

TrustLedger's frontend is deployed to [Vercel](https://vercel.com). Vercel handles the build pipeline, edge distribution, and environment variable injection — no static export or custom base path is required.

---

## Prerequisites

- A Vercel account (free tier works)
- The [Vercel CLI](https://vercel.com/docs/cli) installed locally: `npm install -g vercel`
- Write access to the GitHub repository (to add secrets)

---

## One-time Setup

### 1. Link the project to Vercel

From the `src/` directory:

```bash
cd src
vercel link
```

Follow the prompts to log in and connect to your Vercel team/account. This creates a `.vercel/project.json` file — **do not commit it**.

### 2. Retrieve the project IDs

```bash
cat src/.vercel/project.json
```

Note the `orgId` and `projectId` values.

### 3. Generate a Vercel token

1. Go to **Vercel Dashboard → Settings → Tokens**.
2. Click **Create** → give it a name (e.g. `trustledger-ci`) → scope to your team.
3. Copy the token immediately — it is only shown once.

### 4. Add secrets to GitHub

Go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret name         | Value                                           |
| ------------------- | ----------------------------------------------- |
| `VERCEL_TOKEN`      | The token from step 3                           |
| `VERCEL_ORG_ID`     | The `orgId` from `src/.vercel/project.json`     |
| `VERCEL_PROJECT_ID` | The `projectId` from `src/.vercel/project.json` |

### 5. Configure environment variables in Vercel

In the Vercel dashboard under **Project → Settings → Environment Variables**, add:

| Variable                               | Environment        | Notes                                                                      |
| -------------------------------------- | ------------------ | -------------------------------------------------------------------------- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Production/Preview | Free key from [cloud.walletconnect.com](https://cloud.walletconnect.com)   |
| `NEXT_PUBLIC_PINATA_JWT`               | Production/Preview | Pinata JWT for IPFS uploads — see `.env.example` for instructions          |
| `NEXT_BASE_PATH`                       | Production/Preview | Leave unset (served at root `/`); only needed if hosting at a URL sub-path |

`NEXT_PUBLIC_TRUSTLEDGER_ADDRESS` is auto-resolved from `artifacts/deployed-addresses.json` at build time — no manual env var needed unless you want to override it.

---

## Automatic Deploys (CI/CD)

The `.github/workflows/frontend-deploy.yml` workflow deploys to production automatically on every push to `main` that touches `src/**` or `artifacts/deployed-addresses.json`.

The workflow:

1. Runs `vercel pull --environment=production` to sync Vercel env and project config.
2. Runs `vercel build --prod` to build the Next.js app.
3. Runs `vercel deploy --prebuilt --prod` to publish the build to Vercel's edge network.

No manual steps are required after the one-time setup above.

---

## Manual Deploy

To deploy from your local machine without going through CI:

```bash
cd src

# Preview deploy (staging URL)
vercel

# Production deploy
vercel --prod
```

---

## Preview Deployments

Vercel automatically creates a preview URL for every pull request when using the [Vercel GitHub Integration](https://vercel.com/docs/deployments/git/vercel-for-github). Install the integration from the Vercel dashboard to enable this. Preview deployments do not require any changes to the workflow.

---

## Rollback

To revert to a previous deployment:

1. Go to **Vercel Dashboard → Deployments**.
2. Find the deployment you want to restore.
3. Click **⋯ → Promote to Production**.
