<p align="center">
  <img
    src="src/public/trustledger-mark.svg"
    alt="TrustLedger logo"
    width="96"
    height="96"
  />
</p>

# TrustLedger

TrustLedger is a decentralized escrow, arbitration, and reputation system for
freelance agreements on EVM chains. It helps a client lock funds, a freelancer
submit work, and both parties resolve approval, warranty, rating, and dispute
outcomes through audited code paths instead of platform custody.

> Status: testnet-focused software. Contracts are unaudited and should not be
> used for production custody until an independent audit and mainnet readiness
> review are complete.

[![CI](https://github.com/kevinle3212/TrustLedger/actions/workflows/ci.yml/badge.svg)](https://github.com/kevinle3212/TrustLedger/actions/workflows/ci.yml)
[![Security](https://github.com/kevinle3212/TrustLedger/actions/workflows/security.yml/badge.svg)](https://github.com/kevinle3212/TrustLedger/actions/workflows/security.yml)
[![Docs](https://github.com/kevinle3212/TrustLedger/actions/workflows/docs.yml/badge.svg)](https://github.com/kevinle3212/TrustLedger/actions/workflows/docs.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

## Table Of Contents

- [Project Overview](#project-overview)
- [Feature Breakdown](#feature-breakdown)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Development Setup](#development-setup)
- [Environment Configuration](#environment-configuration)
- [Authentication Architecture](#authentication-architecture)
- [Database Architecture](#database-architecture)
- [API Architecture](#api-architecture)
- [Smart Contract Architecture](#smart-contract-architecture)
- [Oracle Architecture](#oracle-architecture)
- [Deployment](#deployment)
- [Security](#security)
- [Testing Strategy](#testing-strategy)
- [CI/CD](#cicd)
- [Documentation](#documentation)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [Credits](#credits)

## Project Overview

TrustLedger keeps custody-critical state on-chain while using the frontend and
server routes for workflow clarity, notifications, display data, and developer
ergonomics. The product is designed for mainstream freelancers and clients who
may be new to Web3, so the interface emphasizes plain-language states,
accessible controls, and visible transaction progress.

## Feature Breakdown

| Area           | Capabilities                                                                                                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Escrow         | Freelancer-proposed and client-proposed contracts, ETH or ERC-20 funding, project deadlines, acceptance windows, warranty holds, cancellation, reclaim, and payout.                |
| Arbitration    | Staked juror registry, random juror selection, commit-reveal voting, median ruling, appeals, rewards, and slashing.                                                                |
| Reputation     | Bidirectional ratings, recovery tracking, and frontend reputation history.                                                                                                         |
| Frontend       | Localized Next.js App Router UI, wallet connection, role switching, contract creation, dashboard actions, juror views, FAQ, dark mode, high-contrast mode, and responsive layouts. |
| Backend Routes | Contract aggregation, health checks, magic links, notifications, deadline cron, oracle rates, and oracle status metadata.                                                          |
| Storage        | IPFS links, optional Arweave support, client-side AES-GCM document encryption helpers.                                                                                             |
| Tooling        | Hardhat, Foundry, Jest, Playwright, React Doctor, mypy, Solhint, markdownlint, Prettier, Docker, MkDocs, and GitHub Actions.                                                       |

## Architecture

```mermaid
flowchart TB
    User[Client, freelancer, or juror] --> UI[Next.js app in src]
    UI --> Wallet[Reown AppKit and wagmi]
    Wallet --> Chain[EVM contracts]
    UI --> API[Next.js API routes]
    API --> Services[src/services]
    Services --> Email[Resend email]
    Services --> Oracle[Price provider]
    Services --> Chain
    Chain --> TL[TrustLedger.sol]
    Chain --> ARB[Arbitration.sol]
    Chain --> JR[JurorRegistry.sol]
    Chain --> REP[ReputationRegistry.sol]
```

## Technology Stack

| Layer            | Tools                                                                     |
| ---------------- | ------------------------------------------------------------------------- |
| Frontend         | Next.js 16, React 19, TypeScript, next-intl, Tailwind CSS v4, Sass        |
| Wallet and chain | Reown AppKit, wagmi, viem, Ethereum Sepolia, Arbitrum One, Base, Optimism |
| Backend          | Next.js route handlers, Resend, server-side viem clients                  |
| Contracts        | Solidity 0.8.24, OpenZeppelin, Hardhat, Foundry                           |
| Python           | ReportLab utility generator, GitHub Models scripts, strict mypy           |
| Docs             | MkDocs Material, markdownlint                                             |
| CI/CD            | GitHub Actions, Vercel, Dependabot                                        |

## Repository Structure

```text
.
├── contracts/              Solidity contracts, Foundry config, scripts, tests
├── src/                    Next.js app, API routes, services, frontend tests
├── scripts/                Hardhat deploy/demo scripts and GitHub Models tools
├── test/                   Hardhat TypeScript contract tests
├── types/                  Shared TypeScript domain models
├── utils/                  Python contract-template PDF utility
├── stubs/                  Hand-written Python type stubs
├── docs/                   MkDocs source and architecture guides
├── assets/                 Canonical project assets and placeholders
├── docker/                 Development and CI Docker files
├── tools/                  Local setup and maintenance helpers
├── .github/                Workflows, prompts, Dependabot config
├── .claude/                Claude settings and commands
├── .cursor/                Cursor rules and context
└── .mcp.json               Serena and Nexus MCP server config
```

<details>
<summary>Generated and cache folders</summary>

These folders may appear during local work and should not be edited by hand:
`src/.next/`, `.vercel/output/`, `artifacts/`, `hardhat-cache/`,
`contracts/out/`, `contracts/cache/`, `src/coverage/`, `site/`, `.swc/`,
`src/.swc/`, `.mypy_cache/`, and `__pycache__/`.

Read [SWC And Generated Build Artifacts](docs/SWC.md).

</details>

## Development Setup

### Requirements

| Tool             | Version                                        |
| ---------------- | ---------------------------------------------- |
| Node.js          | `>=22.0.0`                                     |
| npm for frontend | `11.12.1`                                      |
| Python           | `.python-version`                              |
| Foundry          | CI currently pins `v1.5.1` for Solidity checks |

### Install

```bash
bash tools/setup.sh
```

Or install packages manually:

```bash
npm install
cd src
npm install
```

### Common Commands

| Task                      | Command                          |
| ------------------------- | -------------------------------- |
| Compile Hardhat contracts | `npm run compile`                |
| Run Hardhat tests         | `npm run hardhat:test`           |
| Run Foundry tests         | `npm run foundry:test`           |
| Run all typechecks        | `npm run typecheck`              |
| Run root lint             | `npm run lint`                   |
| Run Python mypy           | `npm run lint:py`                |
| Build docs strictly       | `npm run docs:build`             |
| Check local docs links    | `npm run docs:links`             |
| Check external docs links | `npm run docs:links:external`    |
| Start frontend            | `cd src && npm run dev:frontend` |
| Build frontend            | `npm run build:frontend`         |
| Run frontend unit tests   | `npm run test:frontend:unit`     |
| Run React Doctor          | `cd src && npm run doctor`       |

## Environment Configuration

Copy examples before local development:

```bash
cp .env.example .env
cp src/.env.local.example src/.env.local
```

Important groups:

| Group           | Examples                                                                                |
| --------------- | --------------------------------------------------------------------------------------- |
| RPC and deploy  | `SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `ETHERSCAN_API_KEY`                          |
| Frontend public | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PINATA_JWT` |
| Notifications   | `MAGIC_LINK_SECRET`, `RESEND_API_KEY`, `NOTIFICATIONS_SECRET`, `CRON_SECRET`            |
| Oracle          | `ORACLE_PRICE_SOURCE_URL`, `ORACLE_RATE_TTL_MS`                                         |
| Vercel          | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`                                    |

Read [Environment](docs/ENVIRONMENT.md).

## Authentication Architecture

Wallet connection establishes the active address for client-side contract
actions. Magic links support email-assisted acceptance and review flows. The
current implementation is not a full account database. Future off-chain accounts
should use wallet sign-in, short-lived JWTs, and route authorization bound to
the authenticated wallet.

Privileged routes:

- `POST /api/notifications` requires
  `Authorization: Bearer <NOTIFICATIONS_SECRET>`.
- `GET /api/cron/deadline-reminders` requires
  `Authorization: Bearer <CRON_SECRET>`.

## Database Architecture

There is no production database in this repository today. Durable custody and
lifecycle state live in smart contracts. Off-chain data is limited to:

- Environment-backed address-to-email maps for deadline reminders.
- Client-side localStorage for role, theme, contrast, and wallet hints.
- External storage references such as IPFS and Arweave URIs.

Any future database must document data ownership, retention, PII handling,
wallet authorization, and migration strategy before adoption.

## API Architecture

| Route                              | Purpose                                          | Auth               |
| ---------------------------------- | ------------------------------------------------ | ------------------ |
| `GET /api/health`                  | Operational config health.                       | Public             |
| `GET /api/contract/[id]`           | JSON-safe on-chain contract aggregation.         | Public             |
| `POST /api/magic-link/send`        | Send review/acceptance magic link.               | Server env secrets |
| `GET /api/magic-link/verify`       | Verify HMAC magic-link token.                    | Token              |
| `POST /api/notifications`          | Send lifecycle email.                            | Bearer secret      |
| `GET /api/cron/deadline-reminders` | Scan deadlines and send reminders.               | Bearer secret      |
| `GET /api/oracle/rates`            | Fetch supported display exchange rate.           | Public             |
| `GET /api/oracle/status`           | Report oracle provider, TTL, pairs, cache state. | Public             |

## Smart Contract Architecture

| Contract                 | Responsibility                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `TrustLedger.sol`        | Escrow lifecycle, funding, proof submission, approval, disputes, warranty funds, ratings, allowed tokens, pausing. |
| `Arbitration.sol`        | Dispute lifecycle, juror selection, commit-reveal votes, appeals, rewards, slashing.                               |
| `JurorRegistry.sol`      | Juror staking, eligibility, locks, cooldowns, active dispute accounting.                                           |
| `ReputationRegistry.sol` | Rating aggregation, penalties, recovery mode, average score reads.                                                 |

Read [Smart Contracts](docs/SMART-CONTRACTS.md) and
[Arbitration](docs/ARBITRATION.md).

## Oracle Architecture

Oracle rates are display/support data only. `src/services/oracle.ts` validates
an allowlist, fetches a CoinGecko-compatible payload, caches results briefly,
and marks stale cache fallback responses. Read
[Oracle Architecture](docs/ORACLE.md).

## Deployment

The frontend targets Vercel. Contracts can be deployed locally or to configured
networks through Hardhat and Foundry. The manual Sepolia deploy workflow writes
contract addresses into Vercel before triggering a frontend redeploy.

Read [Deployment](docs/DEPLOYMENT.md) and [CI/CD](docs/CI-CD.md).

## Security

TrustLedger treats private keys, bearer secrets, RPC credentials, email tokens,
and deployment credentials as sensitive. Server routes validate request
boundaries and avoid returning secret values. Smart contract changes must
prioritize access control, reentrancy resistance, event coverage, gas awareness,
and audit-ready clarity.

Read [Security](SECURITY.md) and [Security Docs](docs/SECURITY.md).

## Testing Strategy

| Layer             | Tests                                                                |
| ----------------- | -------------------------------------------------------------------- |
| Contracts         | Hardhat TypeScript tests, Foundry unit tests, fuzz tests, fork tests |
| Frontend services | Jest unit tests                                                      |
| Components        | React Testing Library                                                |
| Browser routes    | Playwright desktop and mobile projects                               |
| Python            | Strict mypy                                                          |
| Static analysis   | ESLint, Solhint, Forge lint, markdownlint, Prettier, React Doctor    |

Phase 7 Item 3 remains open until comprehensive cross-layer coverage evidence
satisfies the original scope. Read the
[Coverage Gap Report](docs/reports/coverage-gap-report.md).

## CI/CD

GitHub Actions cover:

- Frontend typecheck, lint, build, and Playwright.
- Root TypeScript lint and typecheck.
- Python mypy.
- Hardhat compile and tests.
- Foundry build, format check, and tests.
- Security scans: Slither, TruffleHog, npm audit, CodeQL, Semgrep.
- Docs build and GitHub Pages publish.
- Dependabot grouping and selected automerge.

## Documentation

- [Frontend README](src/README.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Frontend](docs/FRONTEND.md)
- [Oracle](docs/ORACLE.md)
- [Utilities](docs/UTILITIES.md)
- [Type Stubs](docs/STUBS.md)
- [SWC And Artifacts](docs/SWC.md)
- [Testing](docs/TESTING.md)
- [Environment](docs/ENVIRONMENT.md)
- [Contributing](docs/CONTRIBUTING.md)

## Troubleshooting

| Problem                               | Check                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| WalletConnect QR/mobile pairing fails | Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`.                                          |
| Contract API reads fail               | Set `SEPOLIA_RPC_URL` and deployed contract addresses.                               |
| Magic links fail                      | Set `MAGIC_LINK_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`, and `NEXT_PUBLIC_APP_URL`. |
| Deadline cron sends no email          | Set `CRON_SECRET` and `NOTIFICATION_EMAILS`.                                         |
| Oracle route returns `502`            | Check provider availability and `ORACLE_PRICE_SOURCE_URL`.                           |
| Frontend build cannot find contracts  | Run `npm run sync:frontend:env` after local deploy.                                  |

## FAQ

<details>
<summary>Is TrustLedger production ready?</summary>

No. The project is testnet-focused until contract audit, deployment review,
monitoring, and production incident workflows are complete.

</details>

<details>
<summary>Does the backend control escrow funds?</summary>

No. Escrow custody and lifecycle transitions are enforced by smart contracts.
Backend routes provide aggregation, email, cron, and display data.

</details>

<details>
<summary>Does TrustLedger use a database?</summary>

Not yet. Durable protocol state is on-chain. A future off-chain account database
would require a separate design and security review.

</details>

<details>
<summary>Can oracle prices decide payouts?</summary>

No. Current oracle routes are informational only.

</details>

## Contributing

1. Create a branch.
2. Keep changes scoped.
3. Update docs for behavior, env, scripts, route, contract, or tooling changes.
4. Run the relevant quality gates.
5. Open a pull request and wait for CI.

Do not commit secrets, generated build output, local caches, or unrelated
formatting churn.

## Roadmap

The active roadmap lives in [TODO.md](TODO.md). Do not mark roadmap, Oracle,
phase, milestone, or planning items complete without objective implementation
and validation evidence.

## Credits

TrustLedger was created by Kevin Le with contributions from Kellen Snider and
the Oregon Blockchain Group context that shaped the project.

## License

Apache License 2.0. See [LICENSE](LICENSE) when present or the package metadata
for licensing details.
