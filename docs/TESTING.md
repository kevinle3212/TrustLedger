# Testing

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Install Dependencies](#install-dependencies)
- [Solidity Tests](#solidity-tests)
- [Frontend Tests](#frontend-tests)
- [Current Added Coverage](#current-added-coverage)
- [Linting](#linting)
- [Build Checks](#build-checks)
- [CI Profiles](#ci-profiles)
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

This document explains how to run TrustLedger tests and quality gates. Use it
before opening a PR or debugging a failing GitHub Actions job.

## Install Dependencies

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

```bash
npm install
cd src
npm install
cd ..
```

## Solidity Tests

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

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
`tools/foundry-sandbox.mjs` strips proxy-related environment variables before
invoking `forge`, which avoids macOS system proxy access panics in sandboxed
agent sessions.

Run Hardhat TypeScript/Mocha tests:

```bash
npm run hardhat:test
```

Hardhat forks only when `FORK_URL` is set. Otherwise it uses a fresh in-memory
chain. Foundry owns Solidity `.t.sol` execution; `npm run hardhat:test` runs the
Hardhat Mocha subtask so the same Solidity suites are not double-run through
Hardhat. Use `npm run foundry:gas` for gas reports; `hardhat-gas-reporter` still
peers on Hardhat 2 and is intentionally not installed in the Hardhat 3
toolchain. Use Foundry deploy scripts with `--verify` for explorer verification
because the Hardhat 3 verify plugin currently reintroduces unfixed ethers v5
advisories.

## Frontend Tests

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Run unit tests:

```bash
cd src
npm run test:unit
```

Run the strict locale and visible-copy scanner:

```bash
npm run i18n:scan
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

The Playwright web server binds to `localhost` by default to avoid managed
sandbox failures on direct `127.0.0.1` binds. Set
`PLAYWRIGHT_WEB_SERVER_HOST=127.0.0.1` only when a runner requires IPv4
loopback.

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

Sandboxed agent sessions may block DNS for external wallet metadata endpoints
such as Reown/Web3Modal. Frontend builds must treat those fetch failures as
non-fatal fallback warnings, not application errors. For live wallet-provider
checks that genuinely require network access, run the specific command with an
approved sandbox escalation and keep the command scoped to the frontend test or
build being verified.

## Current Added Coverage

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The current testing sweep added focused frontend tests for:

- Legal document localization and translation prompt guardrails.
- Solana cluster resolution, address-shape validation, and Explorer URLs.
- Home-page interactive contract preview phase selection and CTA advancement.

These tests complement existing wallet, validation, health, oracle, route,
contract-error, and public route checks.

## Linting

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

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
npm run tmp:check
```

Run Python docstring and type checks for the project-owned Python helper
scripts:

```bash
npm run lint:py
```

`npm run lint:py` runs `tools/check-python-docstrings.py` before mypy. The
docstring gate scans only project-owned Python files and excludes vendored
contract libraries, generated outputs, caches, and dependency directories.

## Build Checks

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

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

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The Solidity CI workflow uses `FOUNDRY_PROFILE=ci`, which lowers fuzz runs to
keep CI fast. The default local Foundry profile runs more fuzz cases. The
staging profile keeps production optimizer settings with intermediate fuzz and
invariant coverage.

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
