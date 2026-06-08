# TrustLedger Frontend

This file is a quick entry point for the Next.js frontend package. Read
[Frontend](../docs/FRONTEND.md) for architecture and
[Environment](../docs/ENVIRONMENT.md) for required variables.

## Commands

Run these commands from `src/`.

| Task                 | Command                  |
| -------------------- | ------------------------ |
| Install dependencies | `npm install`            |
| Start dev server     | `npm run dev:frontend`   |
| Build                | `npm run build:frontend` |
| Lint                 | `npm run lint:frontend`  |
| Run Playwright tests | `npm run test:e2e`       |
| Run React Doctor     | `npm run doctor`         |

## Required Local Variables

Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` for WalletConnect relay wallets. Set
contract address variables after deploying locally or to Sepolia. The local
deploy path can write `src/.env.local` with:

```bash
npm run sync:frontend:env
```

The deployed frontend uses Reown AppKit, wagmi, viem, next-intl, Resend, and
Playwright. It does not use a `frontend-deploy.yml` workflow; production
deployment is handled by the root `.github/workflows/deploy.yml` workflow.
