# Environment

This document lists environment variables consumed by TrustLedger contracts,
scripts, workflows, and frontend code. Read it before deploying, running fork
tests, or configuring Vercel.

## Root Deployment And Test Variables

| Variable                  | Required For                   | Consumed By                                                                  | Notes                                 |
| ------------------------- | ------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------- |
| `SEPOLIA_RPC_URL`         | Sepolia deploys and fork tests | `hardhat.config.ts`, `contracts/foundry.toml`, Foundry fork tests, API reads | Ethereum Sepolia chain ID `11155111`. |
| `DEPLOYER_PRIVATE_KEY`    | Deploys                        | `hardhat.config.ts`, deploy scripts, deploy workflow                         | Keep secret.                          |
| `DEPLOYER_PUBLIC_ADDRESS` | Reference only                 | `.env.example`                                                               | Not consumed by source.               |
| `ETHERSCAN_API_KEY`       | Sepolia verification           | `hardhat.config.ts`, `contracts/foundry.toml`, deploy workflow               | Required for `--verify`.              |
| `FORK_URL`                | Hardhat fork tests             | `hardhat.config.ts`                                                          | Optional.                             |
| `FORK_BLOCK_NUMBER`       | Pinned forks                   | `hardhat.config.ts`, Foundry fork tests                                      | Optional.                             |
| `REPORT_GAS`              | Hardhat gas report             | `hardhat.config.ts`                                                          | Set by `npm run hardhat:gas`.         |

## L2 Variables

| Variable                     | Network              | Consumed By                                   | Notes                                  |
| ---------------------------- | -------------------- | --------------------------------------------- | -------------------------------------- |
| `ARBITRUM_RPC_URL`           | Arbitrum One `42161` | `hardhat.config.ts`, `contracts/foundry.toml` | Not Arbitrum Sepolia.                  |
| `BASE_RPC_URL`               | Base `8453`          | `hardhat.config.ts`, `contracts/foundry.toml` | Optional unless deploying to Base.     |
| `OPTIMISM_RPC_URL`           | Optimism `10`        | `hardhat.config.ts`, `contracts/foundry.toml` | Optional unless deploying to Optimism. |
| `ARBISCAN_API_KEY`           | Arbitrum One         | `hardhat.config.ts`, `contracts/foundry.toml` | Explorer verification.                 |
| `BASESCAN_API_KEY`           | Base                 | `hardhat.config.ts`, `contracts/foundry.toml` | Explorer verification.                 |
| `OPTIMISM_ETHERSCAN_API_KEY` | Optimism             | `hardhat.config.ts`, `contracts/foundry.toml` | Explorer verification.                 |

## Frontend Public Variables

These variables are safe to expose to the browser because their names start with
`NEXT_PUBLIC_`. Do not put private keys or bearer tokens in them.

| Variable                               | Required For                        | Consumed By                    |
| -------------------------------------- | ----------------------------------- | ------------------------------ |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect relay wallets         | `src/lib/wagmi.ts`             |
| `NEXT_PUBLIC_SITE_URL`                 | Wallet metadata origin fallback     | `src/lib/wagmi.ts`             |
| `NEXT_PUBLIC_APP_URL`                  | Magic links and wallet origin alias | API routes, `src/lib/wagmi.ts` |
| `NEXT_PUBLIC_GITHUB_URL`               | Navbar source link                  | Frontend components            |
| `NEXT_PUBLIC_PINATA_JWT`               | IPFS uploads                        | Frontend upload code           |
| `NEXT_BASE_PATH`                       | Hosting under a subpath             | `src/next.config.ts`           |

## Frontend Contract Variables

The frontend reads default contract addresses and network-specific contract
addresses. The deploy workflow writes Sepolia values into Vercel after a
successful deploy.

| Variable Group                            | Purpose                                                   |
| ----------------------------------------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_TRUSTLEDGER_ADDRESS`         | Default TrustLedger address.                              |
| `NEXT_PUBLIC_ARBITRATION_ADDRESS`         | Default Arbitration address.                              |
| `NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS`      | Default JurorRegistry address.                            |
| `NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS` | Default ReputationRegistry address.                       |
| `NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK`    | Default deployment block.                                 |
| `*_SEPOLIA`                               | Sepolia-specific address and deploy block variables.      |
| `*_ARBITRUM`                              | Arbitrum One-specific address and deploy block variables. |
| `*_BASE`                                  | Base-specific address and deploy block variables.         |
| `*_OPTIMISM`                              | Optimism-specific address and deploy block variables.     |
| `NEXT_PUBLIC_USDC_ADDRESS_SEPOLIA`        | Optional Sepolia USDC override.                           |
| `NEXT_PUBLIC_USDC_ADDRESS_ARBITRUM`       | Optional Arbitrum One USDC override.                      |
| `NEXT_PUBLIC_USDC_ADDRESS_BASE`           | Optional Base USDC override.                              |
| `NEXT_PUBLIC_USDC_ADDRESS_OPTIMISM`       | Optional Optimism USDC override.                          |

> **TODO:** The contract address variables and USDC override variables are
> declared in `src/env.d.ts` and consumed by `src/lib/wagmi.ts`, but
> `.env.example` does not list them as of 2026-06-08.

## Email And Notification Variables

| Variable               | Required For                 | Consumed By                        |
| ---------------------- | ---------------------------- | ---------------------------------- |
| `MAGIC_LINK_SECRET`    | Freelancer email magic links | `src/lib/magicLink.ts`, API routes |
| `RESEND_API_KEY`       | Email delivery               | `src/services/email.ts`            |
| `RESEND_FROM`          | Email sender address         | `src/services/email.ts`            |
| `NOTIFICATIONS_SECRET` | Protected notification API   | `/api/notifications`               |
| `CRON_SECRET`          | Vercel deadline cron         | `/api/cron/deadline-reminders`     |
| `NOTIFICATION_EMAILS`  | Stopgap address-to-email map | Deadline reminder service          |

## Admin And Health Variables

| Variable                   | Required For                 | Consumed By   |
| -------------------------- | ---------------------------- | ------------- |
| `HEALTH_CHECK_TOKEN`       | Admin operational health     | `/api/health` |
| `HEALTH_CHECK_ALLOWED_IPS` | Optional health IP allowlist | `/api/health` |
| `ADMIN_API_TOKEN`          | Shared admin fallback token  | `/api/health` |

Use public `GET /api/health/runtime` for Kubernetes probes and basic runtime
smoke checks. Use `GET /api/health` only from admin monitors with
`Authorization: Bearer <HEALTH_CHECK_TOKEN>` or an allowlisted IP.

## Oracle Variables

| Variable                  | Required For          | Consumed By                               | Notes                                                |
| ------------------------- | --------------------- | ----------------------------------------- | ---------------------------------------------------- |
| `ORACLE_PRICE_SOURCE_URL` | Optional price source | `/api/oracle/rates`, `/api/oracle/status` | Defaults to CoinGecko simple price-compatible shape. |
| `ORACLE_RATE_TTL_MS`      | Optional cache tuning | `src/services/oracle`                     | Defaults to `60000`; capped at `3600000`.            |

## Vercel Variables

| Variable            | Required For    | Consumed By                    |
| ------------------- | --------------- | ------------------------------ |
| `VERCEL_TOKEN`      | Deploy workflow | `.github/workflows/deploy.yml` |
| `VERCEL_ORG_ID`     | Deploy workflow | `.github/workflows/deploy.yml` |
| `VERCEL_PROJECT_ID` | Deploy workflow | `.github/workflows/deploy.yml` |

## Reference-Only Variables

| Variable            | Status                                                        |
| ------------------- | ------------------------------------------------------------- |
| `INFURA_API_KEY`    | Reference only; use it to construct RPC URLs.                 |
| `PINATA_API_KEY`    | Listed for legacy/future use; not consumed by current source. |
| `PINATA_API_SECRET` | Listed for legacy/future use; not consumed by current source. |
