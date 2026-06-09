# Testing

This document explains how to run TrustLedger tests and quality gates. Use it
before opening a PR or debugging a failing GitHub Actions job.

## Install Dependencies

```bash
npm install
cd src
npm install
cd ..
```

## Solidity Tests

Run all Foundry tests:

```bash
npm run foundry:test
```

Run the staging Foundry profile:

```bash
npm run foundry:test:staging
```

Run Foundry fork tests:

```bash
npm run foundry:test:fork
```

The default fork command is sandbox-safe and skips live RPC execution unless it
is explicitly enabled. Run live fork tests with:

```bash
npm run foundry:test:fork:live
```

Live Foundry fork tests read `SEPOLIA_RPC_URL` and `FORK_BLOCK_NUMBER` directly.
Set `SEPOLIA_RPC_URL` before running fork tests that require live Sepolia state.

Run Hardhat tests:

```bash
npm run hardhat:test
```

Run Hardhat tests with gas reporting:

```bash
npm run hardhat:gas
```

Hardhat forks only when `FORK_URL` is set. Otherwise it uses a fresh in-memory
chain.

## Frontend Tests

Run unit tests:

```bash
cd src
npm run test:unit
```

Install the Chromium browser used by Playwright:

```bash
cd src
npm run install:playwright
```

Run Playwright E2E tests:

```bash
cd src
npm run test:e2e
```

Run the interactive Playwright UI:

```bash
cd src
npm run test:e2e:ui
```

Run headed browser tests:

```bash
cd src
npm run test:e2e:headed
```

## Linting

Run all root lint checks:

```bash
npm run lint
```

Run frontend lint checks:

```bash
npm run lint:frontend
```

Run Solidity lint checks:

```bash
npm run lint:sol
npm run lint:forge
```

Run markdown lint checks:

```bash
npm run lint:md
```

Run ignored log Markdown checks:

```bash
npm run lint:logs
```

Run log retention checks:

```bash
npm run logs:check
```

Run Python type checks for the model helper scripts:

```bash
npm run lint:py
```

## Build Checks

Compile Hardhat contracts:

```bash
npm run compile
```

Build Foundry contracts:

```bash
npm run foundry:build
```

Build the frontend:

```bash
cd src
npm run build:frontend
```

## CI Profiles

The Solidity CI workflow uses `FOUNDRY_PROFILE=ci`, which lowers fuzz runs to
keep CI fast. The default local Foundry profile runs more fuzz cases. The
staging profile keeps production optimizer settings with intermediate fuzz and
invariant coverage.
