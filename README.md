# TrustLedger

TrustLedger is a decentralized freelance escrow and arbitration protocol for EVM
chains. Use this README for repository setup, common commands, and links into
the detailed documentation.

## What Is Implemented

TrustLedger currently includes four primary Solidity contracts, a Next.js
frontend, deployment scripts, demo scripts, and GitHub Actions workflows for CI,
deployment, docs, security, and frontend checks.

| Area        | Implementation                                                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Escrow      | `TrustLedger.sol` manages proposals, funding, work submission, approval, disputes, rulings, warranty holds, and ratings.          |
| Arbitration | `Arbitration.sol` selects jurors, runs commit-reveal voting, supports appeals, pays majority jurors, and slashes minority jurors. |
| Jurors      | `JurorRegistry.sol` tracks juror stake, eligibility, locks, cooldowns, reputation, and slashing.                                  |
| Reputation  | `ReputationRegistry.sol` stores ratings and recovery progress after low ratings.                                                  |
| Frontend    | `src/` is a Next.js 16 app using React 19, Reown AppKit, wagmi, viem, next-intl, Resend, IPFS, and Playwright.                    |
| Networks    | Source config supports local Hardhat, Ethereum Sepolia, Arbitrum One, Base, and Optimism.                                         |

> **TODO:** Arbitrum Sepolia is not configured in `hardhat.config.ts`,
> `contracts/foundry.toml`, `.env.example`, or `.github/workflows/deploy.yml` as
> of 2026-06-08. Do not treat Arbitrum Sepolia deployment as confirmed until
> config is added.

## Requirements

- Node.js `>=22.0.0`
- npm `11.12.1` for the frontend package
- Foundry for Solidity builds and tests
- Python for GitHub Models helper scripts
- A `.env` file based on `.env.example` when deploying, forking, emailing, or
  using wallet connection features

## Install

```bash
npm install
cd src
npm install
cd ..
```

## Common Commands

| Task                                    | Command                            |
| --------------------------------------- | ---------------------------------- |
| Compile with Hardhat                    | `npm run compile`                  |
| Run Hardhat tests                       | `npm run hardhat:test`             |
| Run Foundry tests                       | `npm run foundry:test`             |
| Run Foundry fork tests                  | `npm run foundry:test:fork`        |
| Run all root lint checks                | `npm run lint`                     |
| Start local Hardhat chain               | `npm run node`                     |
| Deploy to local Hardhat                 | `npm run hardhat:deploy:local`     |
| Deploy to Ethereum Sepolia with Foundry | `npm run foundry:deploy:sepolia`   |
| Start frontend dev server               | `cd src && npm run dev:frontend`   |
| Build frontend                          | `cd src && npm run build:frontend` |
| Run frontend Playwright tests           | `cd src && npm run test:e2e`       |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Smart Contracts](docs/SMART-CONTRACTS.md)
- [Escrow Lifecycle](docs/ESCROW-LIFECYCLE.md)
- [Arbitration](docs/ARBITRATION.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Testing](docs/TESTING.md)
- [Security Architecture](docs/SECURITY.md)
- [Environment Variables](docs/ENVIRONMENT.md)
- [CI/CD](docs/CI-CD.md)
- [Contributing](docs/CONTRIBUTING.md)
- [Frontend](docs/FRONTEND.md)
- [TypeScript SDK](docs/TYPESCRIPT-SDK.md)
- [Wallets](docs/WALLETS.md)
- [Docker](docs/DOCKER.md)
- [GitHub Models](docs/GITHUB_MODELS.md)
- [Demo Guide](docs/DEMO.md)
- [Presentation Notes](docs/PRESENTATION.md)
- [FAQ](docs/FAQ.md)
- [Miscellaneous Notes](docs/MISCELLANEOUS.md)

## Security

Read [SECURITY.md](SECURITY.md) for vulnerability reporting. Read
[docs/SECURITY.md](docs/SECURITY.md) for contract security architecture, access
control, and known risk areas.

## License

TrustLedger is licensed under the Apache License 2.0.
