# Contributing

This document explains how to set up the repository, make changes, and pass the
required checks. Read it before opening a pull request.

## Setup

Install root dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
cd src
npm install
cd ..
```

Create local environment files only when you need deployment, fork tests, wallet
connection, email, notifications, or IPFS:

```bash
cp .env.example .env
```

Read [Environment](ENVIRONMENT.md) before filling secrets.

## Development Workflow

Use small branches and keep generated build output out of commits. The
repository ignores normal build artifacts such as `artifacts/`,
`contracts/out/`, `contracts/cache/`, `src/.next/`, and `src/node_modules/`.

Before opening a PR, run the relevant checks:

```bash
npm run lint
npm run foundry:test
npm run hardhat:test
cd src
npm run build:frontend
npm run test:e2e
```

Run narrower checks while iterating. Read [Testing](TESTING.md) for the full
command list.

## Solidity Style

Solidity is checked by both Solhint and Foundry:

```bash
npm run lint:sol
npm run lint:forge
```

`contracts/foundry.toml` uses Solidity `0.8.24`, optimizer runs `200`,
`via_ir = true`, and `deny = "warnings"`. Keep contract comments useful and
avoid changing logic when a task is only about documentation or NatSpec.

## TypeScript Style

Root TypeScript covers Hardhat config, scripts, and tests:

```bash
npm run lint:ts
```

Frontend TypeScript and formatting run from `src/`:

```bash
cd src
npm run lint:frontend
```

## Markdown Style

Run:

```bash
npm run lint:md
```

Use one H1 at the top of each file, ATX headings, fenced code blocks with
language tags, no bare URLs, and prose lines around 100 characters where
practical.

## Documentation Ownership

Prefer these canonical docs:

- Architecture: [Architecture](ARCHITECTURE.md)
- Contract APIs: [Smart Contracts](SMART-CONTRACTS.md)
- Escrow states: [Escrow Lifecycle](ESCROW-LIFECYCLE.md)
- Arbitration: [Arbitration](ARBITRATION.md)
- Environment variables: [Environment](ENVIRONMENT.md)
- CI and deployment: [CI/CD](CI-CD.md), [Deployment](DEPLOYMENT.md)
- Frontend: [Frontend](FRONTEND.md)

When a fact belongs in a canonical doc, link to that doc instead of copying the
same explanation into another page.
