# TrustLedger

TrustLedger is a decentralized freelance escrow, reputation, and arbitration
platform for EVM chains. Its mission is to make remote work agreements easier to
fund, verify, dispute, and rate without relying on a centralized escrow
operator.

## Vision

TrustLedger keeps payment custody and dispute-critical state on-chain while
moving user experience, notifications, indexing, and analytics into auditable
off-chain services. The project is preparing for mainnet, but the contracts
remain unaudited and should be treated as testnet software until a third-party
audit is complete.

## Architecture

| Layer      | Responsibility                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Frontend   | `src/` Next.js 16 app with React 19, next-intl, wagmi, viem, Reown AppKit, IPFS helpers, email/API routes, Jest, and Playwright. |
| Backend    | Next.js API routes for contract reads, magic links, notifications, deadline cron, and oracle rates.                              |
| Blockchain | Solidity contracts under `contracts/src/`, tested with Hardhat and Foundry.                                                      |
| Tooling    | ESLint flat configs, Prettier, markdownlint, solhint, forge fmt/lint, Husky hooks, Docker, MkDocs, and GitHub Actions.           |

## Repository Structure

```text
contracts/      Solidity contracts, Foundry config, scripts, and tests
src/            Next.js frontend and backend API routes
scripts/        Hardhat deployment/demo scripts and JS tooling
test/           Hardhat tests
types/          Shared TypeScript domain types
docs/           Architecture, operations, testing, and report docs
assets/         Canonical project assets
docker/         Development and CI Docker files
tools/          Local setup and maintenance helpers
```

## Trust Model

Escrow funds, state transitions, arbitration outcomes, juror staking, and
ratings are enforced by contracts. The frontend and API routes improve
ergonomics but do not own custody. Off-chain services are trusted only for
non-custodial data such as notifications, exchange-rate display data, magic
links, and future profile records.

## Security Model

Wallet signatures prove address ownership. Contract authorization is enforced
on-chain. Server routes validate inputs, gate privileged email/cron actions with
bearer secrets, avoid exposing non-`NEXT_PUBLIC_*` secrets to the browser, and
return JSON-safe payloads. Read [SECURITY.md](SECURITY.md) for the threat model,
incident process, and security checklist.

## Contracts

| Contract                 | Purpose                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `TrustLedger.sol`        | Escrow proposals, funding, work submission, approval, disputes, warranty holds, payouts, and ratings. |
| `Arbitration.sol`        | Juror selection, commit-reveal voting, appeals, juror rewards, and slashing.                          |
| `JurorRegistry.sol`      | Juror staking, eligibility, locks, cooldowns, and reputation.                                         |
| `ReputationRegistry.sol` | Rating storage and recovery tracking.                                                                 |

## Reputation And Oracle Systems

Reputation is on-chain through `ReputationRegistry.sol` and surfaced in the
frontend dashboards. The Phase 6 oracle endpoint is now available at
`GET /api/oracle/rates?base=eth&quote=usd`; it validates an allowlist, fetches
server-side price data, caches briefly, and marks stale fallback responses.
Oracle data is display/supporting data only until a future audited on-chain
oracle integration is designed.

## Authentication And Authorization

The current app uses wallet connection plus a magic-link helper flow. Planned
off-chain accounts should use EIP-712 wallet sign-in and short-lived JWTs.
Privileged routes use bearer secrets:

- `NOTIFICATIONS_SECRET` for `POST /api/notifications`.
- `CRON_SECRET` for `GET /api/cron/deadline-reminders`.

## Deployment Architecture

The frontend is intended for Vercel. Contracts can be deployed locally, to
Sepolia through Hardhat/Foundry, and to configured mainnet EVM networks after
addresses are added. Arbitrum Sepolia is not currently configured and must not
be treated as a confirmed deployment target.

## Local Development

Requirements:

- Node.js `>=22.0.0`
- npm `11.12.1` for `src/`
- Foundry
- Python for model/document helper scripts

Install:

```bash
bash tools/setup.sh
```

Common commands:

| Task                      | Command                          |
| ------------------------- | -------------------------------- |
| Compile Hardhat contracts | `npm run compile`                |
| Run Hardhat tests         | `npm run hardhat:test`           |
| Run Foundry tests         | `npm run foundry:test`           |
| Run root lint             | `npm run lint`                   |
| Run typecheck             | `npm run typecheck`              |
| Start frontend            | `cd src && npm run dev:frontend` |
| Build frontend            | `npm run build:frontend`         |
| Run frontend unit tests   | `npm run test:frontend:unit`     |

## Testing Strategy

Hardhat covers TypeScript contract workflows. Foundry covers Solidity unit,
fuzz, fork, and gas-sensitive paths. Jest covers frontend components, utilities,
and service logic. Playwright covers public route and browser flows. Phase 7
Item 3 remains open until comprehensive cross-layer coverage is proven; read
[Coverage Gap Report](docs/reports/coverage-gap-report.md).

## CI/CD And Hooks

GitHub Actions run frontend typecheck/lint/build/E2E, root TypeScript lint and
typecheck, Python mypy, Hardhat tests, Foundry build/test, docs, deployment, and
security workflows. Husky hooks run formatting, lint, typecheck, unit tests,
E2E, and contract checks with explicit progress output.

## Observability And Monitoring

Current observability includes structured API responses, CI evidence, React
Doctor, explicit oracle stale flags, and `GET /api/health` for deployment smoke
checks. Production readiness should add an external alert sink, RPC uptime
checks, on-chain event monitoring, and privacy-respecting analytics before
mainnet.

## Performance Considerations

The project uses Next/SWC defaults, TypeScript incremental build info, Docker
ignore files, forge profiles, npm cache in CI, and bounded cron/oracle reads.
See [Audit Report](docs/reports/audit-report.md) for cache, SWC, Docker, and
build-performance findings.

## Documentation

- [Frontend Guide](src/README.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Smart Contracts](docs/SMART-CONTRACTS.md)
- [Escrow Lifecycle](docs/ESCROW-LIFECYCLE.md)
- [Arbitration](docs/ARBITRATION.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Testing](docs/TESTING.md)
- [Environment](docs/ENVIRONMENT.md)
- [CI/CD](docs/CI-CD.md)
- [Contributing](docs/CONTRIBUTING.md)
- [Dependency Health](docs/reports/dependency-health-report.md)

## Roadmap

The active roadmap is tracked in [TODO.md](TODO.md). Do not mark roadmap,
Oracle, phase, or milestone items complete without objective implementation and
validation evidence.

## Contribution Workflow

Work on a branch, keep diffs scoped, update docs with behavior/tooling changes,
run the local quality gates, and open a pull request so CI can verify the full
matrix. Never commit secrets or generated build artifacts.

## Troubleshooting

- WalletConnect relay wallets need `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`.
- Contract API routes need `SEPOLIA_RPC_URL` and deployed contract addresses.
- Notification routes need `NOTIFICATIONS_SECRET`, `CRON_SECRET`, and email
  provider configuration.
- `npm audit` requires external access to the npm audit service and may be
  blocked in restricted environments.

## License

TrustLedger is licensed under the Apache License 2.0.
