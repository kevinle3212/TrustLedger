# Environment

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Configuration Beyond `.env`](#configuration-beyond-env)
- [Root Deployment And Test Variables](#root-deployment-and-test-variables)
- [L2 Variables](#l2-variables)
- [Frontend Public Variables](#frontend-public-variables)
- [Server-Side Storage Variables](#server-side-storage-variables)
- [Frontend Contract Variables](#frontend-contract-variables)
- [Email And Notification Variables](#email-and-notification-variables)
- [AI Summary And Account Variables](#ai-summary-and-account-variables)
- [Off-Chain Database And TOTP Variables](#off-chain-database-and-totp-variables)
- [Privacy Analytics Variables](#privacy-analytics-variables)
- [Admin And Health Variables](#admin-and-health-variables)
- [Rust Admin API Variables](#rust-admin-api-variables)
- [Oracle Variables](#oracle-variables)
- [Vercel Variables](#vercel-variables)
- [Reference-Only Variables](#reference-only-variables)
- [Authors and Contributors](#authors-and-contributors)
- [Legal](#legal)

<!-- docs-toc:end -->

> **Kevin K. Le** ([LinkedIn](https://linkedin.com/in/lekevin1)) — Founder,
> Founding Engineer, and Current Lead Engineer; Software Engineer at the Oregon
> Blockchain Group, University of Oregon.
>
> **Kellen Snider** — Founding Engineer; Software Engineer at the Oregon
> Blockchain Group, University of Oregon. His vision, ideas, and dedication
> during TrustLedger's Ethereum development were invaluable to the codebase we
> build on today.
>
> See [`CREDITS.md`](CREDITS.md).

This document lists environment variables consumed by TrustLedger contracts,
scripts, workflows, and frontend code. Read it before deploying, running fork
tests, or configuring Vercel.

## Configuration Beyond `.env`

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`.env`, `src/.env.local`, and deployment secrets are only part of the setup. A
complete operator or maintainer environment also needs these non-env
configuration surfaces kept current:

| Surface                           | Required For                                 | Configure / Verify                                                                                                                                                                                                                |
| --------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node and npm                      | All JavaScript, Hardhat, docs, and frontend  | Node `22.x` and npm `11.12.1`; use `bash tools/setup.sh` or the package manager noted in `package.json`.                                                                                                                          |
| Foundry                           | Solidity build, tests, deploys, verification | Install `forge`, `cast`, and `anvil`; run `npm run foundry:build` and `npm run foundry:test`.                                                                                                                                     |
| Contract vendors                  | Solidity imports and tests                   | OpenZeppelin is pinned as `contracts/lib/openzeppelin-contracts` and also listed in root `package.json` for Hardhat imports. `forge-std` is vendored at `contracts/lib/forge-std`, not installed through npm.                     |
| Git submodules / vendored code    | Clean clone reproducibility                  | Run `git submodule update --init --recursive`; do not add `forge-std` to root `package.json` unless Foundry imports are intentionally migrated away from vendored libs.                                                           |
| SWC cache                         | Next.js builds in restricted environments    | Run `npm run swc:populate` before frontend builds and push-time checks.                                                                                                                                                           |
| Gitleaks                          | Local and CI secret scanning                 | Install `gitleaks`; run `npm run secrets:check` and `npm run secrets:gitleaks:staged`. CI workflows that call these scripts must install the pinned Gitleaks binary first.                                                        |
| GitHub CLI authentication         | `security:alerts` and `security:dependabot`  | Install `gh`, authenticate with repo security-alert access, and keep `jq` installed for the package scripts that call the GitHub API.                                                                                             |
| GitHub Actions repository secrets | CI deploys and security automation           | Configure `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, deployment RPC keys, explorer keys, and any workflow-only provider tokens in GitHub Secrets.                                                                      |
| GitHub repository settings        | Server-side safety                           | Enable the ruleset in [GitHub Rulesets](GITHUB-RULESETS.md), secret scanning, push protection, Dependabot alerts, and CodeQL/code scanning alerts.                                                                                |
| Vercel project settings           | Production frontend and API routes           | Link the project, set all required public and server-only environment variables, configure the production domain, and confirm cron authorization.                                                                                 |
| Email provider dashboard          | Magic links and lifecycle notifications      | Verify sender domain, SPF/DKIM/DMARC, suppression handling, rate limits, and provider API keys.                                                                                                                                   |
| WalletConnect/Reown dashboard     | Wallet modal relay                           | Create and configure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` for the production domain.                                                                                                                                            |
| IPFS / storage provider           | Contract files and proof uploads             | Configure Pinata or the selected provider, review token scope, and rotate any exposed upload token.                                                                                                                               |
| Request timeout policy            | UI responsiveness and API reliability        | Keep external fetches and RPC transports bounded through `src/lib/fetchTimeout.ts` and explicit viem `http()` timeouts. Do not add provider calls that can wait indefinitely.                                                     |
| Local repository location         | File watching, rebuilds, and local tooling   | Keep working clones outside `~/Desktop`, `~/Documents`, iCloud Drive, Dropbox, OneDrive, Google Drive, Box Drive, network shares, and external drives. Prefer `~/Development/TrustLedger`.                                        |
| Browser automation fallback       | UI validation and performance profiling      | Prefer the Codex in-app browser when available. If `iab` cannot be acquired, use installed Playwright with explicit user approval for the local Chromium process and document that fallback in the run notes.                     |
| Ollama and Continue local AI      | Local coding assistance                      | Install Ollama, pull `qwen3:8b`, and configure Continue with either `http://127.0.0.1:11434` for same-machine use or a trusted LAN host such as `http://192.168.12.181:11434`. See [Utilities](UTILITIES.md#ollama-and-continue). |
| Monitoring provider               | Production operations                        | Configure uptime, logs, alert routing, cost/error dashboards, and health-check bearer tokens.                                                                                                                                     |
| Docker and Kubernetes             | Container deploys                            | Set `k8s/configmap.yaml`, generate ignored `k8s/secret.yaml`, build images, and run Docker storage checks after heavy sessions.                                                                                                   |
| External audit package            | Mainnet readiness                            | Provide auditor scope, engagement details, final report, accepted/rejected findings, and remediation evidence before mainnet.                                                                                                     |

When a new package script depends on external state, update this table and the
owning docs in the same change. For example, scripts that call `gh api` must
document the required GitHub CLI authentication and permissions here, not only
inside `package.json`.

TrustLedger request paths must fail closed and visibly: RPC reads, AI summaries,
oracle prices, email providers, IPFS uploads, and collaboration relay calls use
short explicit timeouts. When adding a new provider integration, route it
through the shared timeout helper or an equivalent provider-native timeout and
return a structured error instead of leaving the browser in a permanent loading
state.

## Root Deployment And Test Variables

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Variable                  | Required For                   | Consumed By                                                                  | Notes                                 |
| ------------------------- | ------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------- |
| `SEPOLIA_RPC_URL`         | Sepolia deploys and fork tests | `hardhat.config.ts`, `contracts/foundry.toml`, Foundry fork tests, API reads | Ethereum Sepolia chain ID `11155111`. |
| `DEPLOYER_PRIVATE_KEY`    | Deploys                        | `hardhat.config.ts`, deploy scripts, deploy workflow                         | Keep secret.                          |
| `DEPLOYER_PUBLIC_ADDRESS` | Reference only                 | `.env.example`                                                               | Not consumed by source.               |
| `ETHERSCAN_API_KEY`       | Sepolia verification           | `contracts/foundry.toml`, deploy workflow                                    | Required for Foundry `--verify`.      |
| `FORK_URL`                | Hardhat fork tests             | `hardhat.config.ts`                                                          | Optional.                             |
| `FORK_BLOCK_NUMBER`       | Pinned forks                   | `hardhat.config.ts`, Foundry fork tests                                      | Optional.                             |

## L2 Variables

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Variable                     | Network              | Consumed By                                   | Notes                                  |
| ---------------------------- | -------------------- | --------------------------------------------- | -------------------------------------- |
| `ARBITRUM_RPC_URL`           | Arbitrum One `42161` | `hardhat.config.ts`, `contracts/foundry.toml` | Not Arbitrum Sepolia.                  |
| `BASE_RPC_URL`               | Base `8453`          | `hardhat.config.ts`, `contracts/foundry.toml` | Optional unless deploying to Base.     |
| `OPTIMISM_RPC_URL`           | Optimism `10`        | `hardhat.config.ts`, `contracts/foundry.toml` | Optional unless deploying to Optimism. |
| `ARBISCAN_API_KEY`           | Arbitrum One         | `contracts/foundry.toml`                      | Explorer verification.                 |
| `BASESCAN_API_KEY`           | Base                 | `contracts/foundry.toml`                      | Explorer verification.                 |
| `OPTIMISM_ETHERSCAN_API_KEY` | Optimism             | `contracts/foundry.toml`                      | Explorer verification.                 |

## Frontend Public Variables

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

These variables are safe to expose to the browser because their names start with
`NEXT_PUBLIC_`. Do not put private keys or bearer tokens in them.

| Variable                               | Required For                                          | Consumed By                                  |
| -------------------------------------- | ----------------------------------------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect relay wallets                           | `src/lib/wagmi.ts`                           |
| `NEXT_PUBLIC_SITE_URL`                 | Wallet metadata origin fallback                       | `src/lib/wagmi.ts`                           |
| `NEXT_PUBLIC_APP_URL`                  | Magic links and wallet origin alias                   | API routes, `src/lib/wagmi.ts`               |
| `NEXT_PUBLIC_GITHUB_URL`               | Navbar source link and public GitHub analytics source | Frontend components, `/api/analytics/github` |
| `NEXT_PUBLIC_DOCS_URL`                 | Navbar Docs link (beside GitHub); hidden when unset   | `src/components/Navbar.tsx`                  |
| `NEXT_PUBLIC_SOLANA_CLUSTER`           | Native Solana support label                           | `src/helpers/solana.ts`                      |
| `NEXT_PUBLIC_SOLANA_PROGRAM_ID`        | SOL escrow submission                                 | `src/lib/solanaEscrow.ts`                    |
| `NEXT_BASE_PATH`                       | Hosting under a subpath                               | `src/next.config.ts`                         |

## Server-Side Storage Variables

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Variable     | Required For                  | Consumed By                        |
| ------------ | ----------------------------- | ---------------------------------- |
| `PINATA_JWT` | Server-side IPFS file pinning | `/api/ipfs/pin`, `src/lib/ipfs.ts` |

`PINATA_JWT` is a bearer credential and must be stored only in ignored local env
files and deployment secret stores. Never use a `NEXT_PUBLIC_` prefix for Pinata
credentials because Next.js inlines those values into the browser bundle.

## Frontend Contract Variables

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

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

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Variable                  | Required For                 | Consumed By                        |
| ------------------------- | ---------------------------- | ---------------------------------- |
| `MAGIC_LINK_SECRET`       | Freelancer email magic links | `src/lib/magicLink.ts`, API routes |
| `EMAIL_PROVIDER`          | Email provider selection     | `src/services/email.ts`            |
| `EMAIL_FROM`              | Provider-agnostic sender     | `src/services/email.ts`            |
| `RESEND_API_KEY`          | Resend delivery              | `src/services/email.ts`            |
| `RESEND_FROM`             | Resend sender fallback       | `src/services/email.ts`            |
| `BREVO_API_KEY`           | Brevo delivery               | `src/services/email.ts`            |
| `BREVO_FROM`              | Brevo sender fallback        | `src/services/email.ts`            |
| `POSTMARK_SERVER_TOKEN`   | Postmark delivery            | `src/services/email.ts`            |
| `POSTMARK_FROM`           | Postmark sender fallback     | `src/services/email.ts`            |
| `POSTMARK_MESSAGE_STREAM` | Optional Postmark stream     | `src/services/email.ts`            |
| `NOTIFICATIONS_SECRET`    | Protected notification API   | `/api/notifications`               |
| `CRON_SECRET`             | Vercel deadline cron         | `/api/cron/deadline-reminders`     |
| `NOTIFICATION_EMAILS`     | Stopgap address-to-email map | Deadline reminder service          |

`EMAIL_PROVIDER=log` is local-development only. It logs the intended recipient
and subject without sending external email. Production should use `resend`,
`brevo`, or `postmark` with provider credentials stored only in deployment
secrets.

## AI Summary And Account Variables

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

All AI features route through the provider-agnostic `@/core/ai` layer; call
sites never name a vendor. Configure one provider and the contract-summary
service (`/api/contract/[id]/summary`) and `/api/ai/complete` both use it.

| Variable              | Required For                            | Consumed By          |
| --------------------- | --------------------------------------- | -------------------- |
| `AI_ENABLED`          | Master switch (`false` forces off)      | `src/core/ai/config` |
| `AI_PROVIDER_KIND`    | `openai-compatible` or `gemini`         | `src/core/ai/config` |
| `AI_BASE_URL`         | API base (required for openai-compat)   | `src/core/ai/config` |
| `AI_API_KEY`          | Provider key/token                      | `src/core/ai/config` |
| `AI_DEFAULT_MODEL`    | Default model id                        | `src/core/ai/config` |
| `AI_DEFAULT_PROVIDER` | Default provider registry name          | `src/core/ai/config` |
| `AI_PROVIDERS_JSON`   | Advanced multi-provider config          | `src/core/ai/config` |
| `AI_ROUTES_JSON`      | Per-task provider/model routing         | `src/core/ai/config` |
| `OPENROUTER_API_KEY`  | OpenRouter fallback provider            | `src/core/ai/config` |
| `OPENROUTER_BASE_URL` | OpenRouter API base override            | `src/core/ai/config` |
| `AI_FALLBACK_MODEL`   | Fallback model id (default a free tier) | `src/core/ai/config` |

| Variable                 | Required For             | Consumed By                        |
| ------------------------ | ------------------------ | ---------------------------------- |
| `ACCOUNT_SESSION_SECRET` | Account session HMAC     | `src/services/offchainAccounts.ts` |
| `AUTH_JWT_SECRET`        | Account session fallback | `src/services/offchainAccounts.ts` |

Leave the `AI_*` provider vars unset (built-in `disabled` placeholder) until the
selected managed inference provider has data-use controls enabled and monitoring
is ready. The summary service sends minimized public contract metadata only; it
never sends encrypted document bodies, private keys, seed phrases, session keys,
or unrelated wallet history.

## Off-Chain Database And TOTP Variables

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Variable              | Required For                                  | Consumed By                                                  |
| --------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`        | Pooled Prisma connection (Neon)               | `src/prisma/schema.prisma`, `src/lib/db/`                    |
| `DIRECT_URL`          | Direct (non-pooled) connection for migrations | `src/prisma/schema.prisma`, `src/scripts/vercel-migrate.mjs` |
| `TOTP_ENCRYPTION_KEY` | Encrypting stored TOTP secrets                | `src/services/totp.ts`                                       |

`TOTP_ENCRYPTION_KEY` is a 32-byte base64 secret. Generate one with
`openssl rand -base64 32`. Production MUST set it: if unset, the service falls
back to a random per-process key, which is development-only, since secrets do
not survive a process restart. `DIRECT_URL` is required in production so
`npm run vercel:migrate` can apply migrations; read [Deployment](DEPLOYMENT.md)
for the full migration-automation gating.

## Privacy Analytics Variables

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Variable                                | Required For                     | Consumed By                           |
| --------------------------------------- | -------------------------------- | ------------------------------------- |
| `TRUSTLEDGER_ANALYTICS_ENABLED`         | Server aggregate event collector | `/api/analytics/events`               |
| `NEXT_PUBLIC_PRIVACY_ANALYTICS_ENABLED` | Browser page-view/error beacon   | `src/components/PrivacyAnalytics.tsx` |
| `TRUSTLEDGER_ANALYTICS_RETENTION_DAYS`  | Aggregate event retention window | `src/services/trafficAnalytics.ts`    |

Keep both enable flags set to `false` until privacy notice, legal review, and
operator alert routing are ready. The server endpoint honors Do Not Track and
Global Privacy Control, strips query strings, and does not store wallet
addresses, raw IP addresses, raw user agents, emails, documents, session keys,
or private wallet material.

Set `NEXT_PUBLIC_GITHUB_URL` to a public GitHub repository URL when the public
status page should show repository activity. `/api/analytics/github` verifies
the GitHub repository is public before returning commit, pull request, language,
star, fork, and code-change totals. If GitHub reports the repository as private,
missing, or inaccessible, the public status page omits the GitHub section
entirely. `GITHUB_TOKEN` is optional and server-only; use it only to raise
GitHub API rate limits for public metadata reads.

## Admin And Health Variables

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

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
ADMIN_BOOTSTRAP_EMAIL='owner@example.com' \
ADMIN_BOOTSTRAP_USERNAME='owner' \
ADMIN_BOOTSTRAP_PASSWORD='replace-with-a-long-password' \
npm run admin:bootstrap
```

## Rust Admin API Variables

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

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

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Variable                  | Required For          | Consumed By                               | Notes                                                |
| ------------------------- | --------------------- | ----------------------------------------- | ---------------------------------------------------- |
| `ORACLE_PRICE_SOURCE_URL` | Optional price source | `/api/oracle/rates`, `/api/oracle/status` | Defaults to CoinGecko simple price-compatible shape. |
| `ORACLE_RATE_TTL_MS`      | Optional cache tuning | `src/services/oracle`                     | Defaults to `60000`; capped at `3600000`.            |

## Vercel Variables

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Variable            | Required For    | Consumed By                    |
| ------------------- | --------------- | ------------------------------ |
| `VERCEL_TOKEN`      | Deploy workflow | `.github/workflows/deploy.yml` |
| `VERCEL_ORG_ID`     | Deploy workflow | `.github/workflows/deploy.yml` |
| `VERCEL_PROJECT_ID` | Deploy workflow | `.github/workflows/deploy.yml` |

## Reference-Only Variables

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Variable            | Status                                                        |
| ------------------- | ------------------------------------------------------------- |
| `INFURA_API_KEY`    | Reference only; use it to construct RPC URLs.                 |
| `PINATA_API_KEY`    | Listed for legacy/future use; not consumed by current source. |
| `PINATA_API_SECRET` | Listed for legacy/future use; not consumed by current source. |

## Authors and Contributors

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **Kevin K. Le** — Founder, Founding Engineer, and Current Lead Engineer
  ([LinkedIn](https://www.linkedin.com/in/lekevin1))
- **Kellen Snider** — Founding Engineer
  ([LinkedIn](https://www.linkedin.com/in/kellen-snider-683396256/))

See [`CREDITS.md`](CREDITS.md) for the complete acknowledgement list.

## Legal

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

This document is part of TrustLedger, an open-source decentralized escrow and
arbitration protocol. Use of this software and documentation is subject to the
[Terms and Conditions](TERMS_AND_CONDITIONS.md),
[Privacy Policy](PRIVACY_POLICY.md), and [Risk Disclosure](RISK_DISCLOSURE.md).
See [`LEGAL.md`](LEGAL.md) for the full compliance and licensing overview.
