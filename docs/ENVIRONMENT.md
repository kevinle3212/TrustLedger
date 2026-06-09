# Environment

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

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
| `NEXT_PUBLIC_SOLANA_CLUSTER`           | Native Solana support label         | `src/helpers/solana.ts`        |
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

These variables are listed in `.env.example` and `src/.env.local.example`. Keep
those files, `docs/ENVIRONMENT.md`, local ignored env files, and Vercel in sync
whenever a new environment variable is introduced.

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

| Variable                         | Required For                            | Consumed By                         |
| -------------------------------- | --------------------------------------- | ----------------------------------- |
| `HEALTH_CHECK_TOKEN`             | Admin operational health                | `/api/health`                       |
| `HEALTH_CHECK_ALLOWED_IPS`       | Optional health IP allowlist            | `/api/health`                       |
| `ADMIN_API_TOKEN`                | Shared admin fallback token             | `/api/health`, `/api/admin/summary` |
| `ADMIN_SESSION_SECRET`           | Admin session HMAC key                  | `/[locale]/admin`, `/api/admin/*`   |
| `ADMIN_ALLOWED_IPS`              | Admin dashboard IP allowlist            | `/[locale]/admin`, `/api/admin/*`   |
| `ADMIN_WALLET_ADDRESSES`         | Optional admin wallet allowlist         | `/[locale]/admin/sign-in`           |
| `ADMIN_BOOTSTRAP_EMAIL`          | Bootstrap owner email                   | `/[locale]/admin/sign-in`           |
| `ADMIN_BOOTSTRAP_USERNAME`       | Bootstrap owner username                | `/[locale]/admin/sign-in`           |
| `ADMIN_BOOTSTRAP_PASSWORD_HASH`  | Bootstrap owner password hash           | `/[locale]/admin/sign-in`           |
| `ADMIN_BOOTSTRAP_WALLET_ADDRESS` | Optional bootstrap owner wallet binding | `/[locale]/admin/sign-in`           |
| `ADMIN_ACCOUNTS_JSON`            | Additional hashed admin accounts        | `/[locale]/admin/sign-in`           |

Use public `GET /api/health/runtime` for Kubernetes probes and basic runtime
smoke checks. Use `GET /api/health` only from admin monitors with
`Authorization: Bearer <HEALTH_CHECK_TOKEN>` or an allowlisted IP.

Generate admin password hashes with:

```bash
ADMIN_BOOTSTRAP_PASSWORD='replace-with-a-long-password' npm run admin:bootstrap
```

## Rust Admin API Variables

The Rust companion API in `programs/admin-api` is optional, read-only, and
separate from the Next.js admin dashboard. It is useful for operator-side
health, summaries, and future backend workloads that should not live in the
frontend server.

| Variable                      | Required For              | Consumed By                  |
| ----------------------------- | ------------------------- | ---------------------------- |
| `TRUSTLEDGER_ADMIN_API_BIND`  | Rust API bind address     | `programs/admin-api`         |
| `TRUSTLEDGER_ADMIN_API_TOKEN` | Protected Rust API routes | `/admin/summary`             |
| `TRUSTLEDGER_ENV`             | Redacted environment tag  | Rust health and summary JSON |

Local defaults can be inserted without overwriting existing secrets:

```bash
npm run env:sync
```

This command is intentionally manual. Build commands must not create or
overwrite environment state, and `npm run env:sync:vercel` must never run from
build because it mutates remote Vercel configuration.

For Kubernetes, create the token as a Secret and keep
`TRUSTLEDGER_ADMIN_API_BIND=0.0.0.0:4100` in the deployment environment.

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
