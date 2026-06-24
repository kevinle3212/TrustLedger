# Credits

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Authors and Contributors](#authors-and-contributors)
- [Core Technologies](#core-technologies)
- [Frontend Libraries](#frontend-libraries)
    - [Wallet and Chain](#wallet-and-chain)
    - [Data Fetching and State](#data-fetching-and-state)
    - [UI and Visualisation](#ui-and-visualisation)
    - [Internationalisation](#internationalisation)
    - [Theming](#theming)
    - [Email](#email)
    - [Storage](#storage)
- [Smart-Contract Libraries](#smart-contract-libraries)
- [Rust and Solana Program](#rust-and-solana-program)
- [Python Utilities and AI](#python-utilities-and-ai)
    - [Contract PDF Generation (`utils/`)](#contract-pdf-generation-utils)
    - [GitHub Models AI Integration (`scripts/models/`)](#github-models-ai-integration-scriptsmodels)
    - [Analytics Generation (`scripts/analytics/`)](#analytics-generation-scriptsanalytics)
    - [Type Checking](#type-checking)
    - [Documentation Build](#documentation-build)
- [Tooling and Quality](#tooling-and-quality)
    - [Linting and Formatting](#linting-and-formatting)
    - [Testing](#testing)
    - [React Health](#react-health)
    - [Smart-Contract Quality](#smart-contract-quality)
    - [Security Scanning](#security-scanning)
    - [Commit and Release Hygiene](#commit-and-release-hygiene)
    - [Type Generation](#type-generation)
    - [Dependency Management](#dependency-management)
    - [Environment and Secrets](#environment-and-secrets)
    - [Code Intelligence](#code-intelligence)
- [DevOps and Infrastructure](#devops-and-infrastructure)
- [License](#license)
- [Legal](#legal)

<!-- docs-toc:end -->

TrustLedger is a full-stack decentralized escrow, arbitration, and reputation
system. It was originally built on Ethereum and now supports Solana and USDC,
with commit-reveal arbitration, Chainlink VRF juror selection, and on-chain
reputation on Sepolia.

> This file acknowledges the people, technologies, and resources that make the
> project possible. AI agents and automation pipelines should read
> [`AGENT-CONTEXT.md`](AGENT-CONTEXT.md) before beginning any work to understand
> the role-specific constraints, commands, and quality gates that govern this
> codebase.

---

## Authors and Contributors

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **Kevin K. Le** — Founder, Founding Engineer, and Current Lead Engineer
  ([LinkedIn](https://www.linkedin.com/in/lekevin1))

    Kevin co-founded TrustLedger alongside Kellen Snider and has led engineering
    from the project's inception through every phase of development since. As a
    Software Engineer at the Oregon Blockchain Group at the University of
    Oregon, he has driven TrustLedger beyond its Ethereum foundation — expanding
    the system to Solana and USDC support, building commit-reveal arbitration,
    Chainlink VRF juror selection, and on-chain reputation, and maintaining the
    full-stack platform to production as its sole contributor past the founding
    phase.

- **Kellen Snider** — Founder and Founding Engineer
  ([LinkedIn](https://www.linkedin.com/in/kellen-snider-683396256/))

    Kellen co-founded TrustLedger and served as Founding Engineer during the
    project's Ethereum development phase. As a Software Engineer at the Oregon
    Blockchain Group at the University of Oregon, his architectural thinking,
    relentless attention to detail, and dedication to building trustworthy
    smart-contract infrastructure were instrumental in establishing the
    foundation this project stands on. TrustLedger would not exist in its
    current form without him.

Automated dependency maintenance is handled by
[Dependabot](https://docs.github.com/en/code-security/dependabot).

---

## Core Technologies

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[Next.js](https://nextjs.org) 16** (App Router) — React meta-framework
  providing file-based routing, React Server Components, API route handlers,
  image optimisation, and the Vercel deployment integration. All pages use the
  App Router; no Pages Router code exists.
- **[React](https://react.dev) 19** — UI runtime. Uses the latest concurrent
  features, `use` hooks, and server-component patterns.
- **[TypeScript](https://www.typescriptlang.org) 6** — strict, type-safe
  language for all frontend, Hardhat, and tooling code. Configured via
  `@tsconfig/strictest` with no `any` escape hatches.
- **[Tailwind CSS](https://tailwindcss.com) v4** — utility-first CSS framework
  used as the single source of design tokens (colour, spacing, typography).
  Processed via `@tailwindcss/postcss`.
- **[Sass](https://sass-lang.com)** — supplementary SCSS for global styles and
  animations not expressible in Tailwind utilities.
- **[Solidity](https://soliditylang.org) 0.8.24** — smart-contract language.
  Compiled with `via_ir = true`, `optimizer_runs = 200`, and
  `deny = "warnings"`.
- **[Foundry](https://getfoundry.sh)** — primary smart-contract toolchain:
  `forge build`, `forge test`, `forge script`, `forge lint`, `forge fmt`. Fuzz
  suite runs 10 000 iterations with a fixed seed.
- **[Hardhat](https://hardhat.org) v3** — secondary toolchain used for
  TypeScript deployment scripts, local Hardhat Network node, and Mocha
  integration tests via `@nomicfoundation/hardhat-mocha`.

---

## Frontend Libraries

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

### Wallet and Chain

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[wagmi](https://wagmi.sh) v2** — React hooks for EVM wallet connection,
  contract reads/writes, and chain switching. The primary interface between the
  UI and on-chain state.
- **[viem](https://viem.sh) v2** — low-level, type-safe Ethereum client. Handles
  ABI encoding, RPC calls, and signature verification. Used both client-side
  (with wagmi) and server-side (in API route handlers).
- **[Reown AppKit](https://reown.com/appkit)** (`@reown/appkit`,
  `@reown/appkit-adapter-wagmi`) — wallet connection modal (successor to
  WalletConnect's Web3Modal). Supports MetaMask, WalletConnect, Coinbase Wallet,
  and others.
- **[@solana/web3.js](https://solana-labs.github.io/solana-web3.js/) v1** —
  JavaScript SDK for Solana RPC interaction and transaction construction, used
  by the Solana escrow integration.

### Data Fetching and State

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[@tanstack/react-query](https://tanstack.com/query) v5** — server-state
  caching, background refetching, and optimistic updates. All on-chain data
  queries flow through React Query.

### UI and Visualisation

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[recharts](https://recharts.org) v3** — composable charting library built on
  D3. Used in the analytics dashboard. Code-split via Next.js `dynamic()` to
  keep the main bundle lean.

### Internationalisation

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[next-intl](https://next-intl.dev) v4** — locale routing, message
  formatting, and server-component i18n for the App Router. All user-facing
  strings live in `messages/`.

### Theming

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[next-themes](https://github.com/pacocoursey/next-themes) v0.4** —
  flicker-free dark/light theme switching with system preference detection.

### Email

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[Resend](https://resend.com) v6** — transactional email API. Used by the
  magic-link and notification API routes.

### Storage

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[Arweave](https://www.arweave.org)** — permanent, decentralised document
  storage. Contract documents can optionally be archived to Arweave after
  on-chain creation.

---

## Smart-Contract Libraries

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[OpenZeppelin Contracts](https://openzeppelin.com/contracts) v5** —
  industry-standard audited base contracts. TrustLedger uses `Ownable`,
  `Pausable`, `ReentrancyGuard`, `IERC20`, and `IERC20Metadata`. Vendored under
  `contracts/lib/openzeppelin-contracts/` via Foundry and installed as an npm
  package (`@openzeppelin/contracts`) for Hardhat.
- **[forge-std](https://github.com/foundry-rs/forge-std)** — Foundry's standard
  testing library. Provides `Test`, `Vm`, `console`, script base contracts, and
  common assertion helpers. Vendored under `contracts/lib/forge-std/`.
- **[Chainlink VRF](https://chain.link/vrf)** — verifiable random function used
  for provably fair juror selection. The `VRFConsumerBaseV2` interface is
  vendored directly in `contracts/src/interfaces/` to avoid an npm dependency on
  the full Chainlink suite.
- **[AggregatorV3Interface](https://docs.chain.link/data-feeds)** (Chainlink
  Data Feeds) — price-feed interface vendored in
  `contracts/src/interfaces/AggregatorV3Interface.sol`. Used by the oracle layer
  to read ETH/USD prices on Sepolia.

---

## Rust and Solana Program

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The Solana escrow program lives in `programs/solana-escrow/` and is compiled
with `cargo build-sbf`. All unsafe code is forbidden at the crate level.

- **[solana-program](https://docs.rs/solana-program) v4** — core Solana on-chain
  program SDK: account info, instruction handling, and system program
  cross-program invocations.
- **[solana-sdk-ids](https://docs.rs/solana-sdk-ids) v3** — canonical program ID
  constants (system program, token program, etc.).
- **[solana-system-interface](https://docs.rs/solana-system-interface) v3** —
  typed bindings for the Solana System Program instructions (create account,
  transfer lamports) with the `bincode` feature enabled.

**Rust toolchain constraints:**

- Minimum Rust version: 1.89 (declared in `Cargo.toml`).
- All Clippy lints are denied at `pedantic` level. `unwrap_used`, `expect_used`,
  and `panic` are individually denied. Write explicit error handling with `?`.
- `missing_docs` is denied — all public items must have doc comments.

---

## Python Utilities and AI

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Python is used for three purposes: contract PDF generation, GitHub Models AI
integration, and analytics generation.

### Contract PDF Generation (`utils/`)

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[ReportLab](https://www.reportlab.com) 4.4.10** — PDF layout and rendering
  engine. Used by `utils/generate_contract.py` to produce `sample-contract.pdf`,
  a dummy freelance service agreement used in TrustLedger demos. The PDF is
  uploaded to IPFS and its keccak256 hash is stored on-chain as `contractHash`.
- **[types-reportlab](https://pypi.org/project/types-reportlab/)** — PEP 561
  type stubs for ReportLab, enabling mypy and Pylance to resolve types.

### GitHub Models AI Integration (`scripts/models/`)

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[azure-ai-inference](https://pypi.org/project/azure-ai-inference/)** — Azure
  AI Inference SDK. Provides `ChatCompletionsClient` and message types for
  calling the GitHub Models inference endpoint
  (`https://models.github.ai/inference`).
- **[azure-core](https://pypi.org/project/azure-core/)** — Azure SDK core
  utilities: `AzureKeyCredential` and `HttpResponseError`.
- Requires `GITHUB_TOKEN` with models access. Run via `npm run models:run` or
  the `github-models.yml` workflow.

### Analytics Generation (`scripts/analytics/`)

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[NumPy](https://numpy.org) 2.4** — numerical array operations.
- **[pandas](https://pandas.pydata.org) 2.3** — tabular data manipulation and
  aggregation for wallet analytics.
- **[Matplotlib](https://matplotlib.org) 3.10** — static chart generation.
- **[Seaborn](https://seaborn.pydata.org) 0.13** — statistical visualisation
  built on Matplotlib.
- **[Plotly](https://plotly.com/python/) 6.5** — interactive HTML charts.
- **[Bokeh](https://bokeh.org) 3.8** — interactive web-based visualisations.
- **[SciPy](https://scipy.org) 1.16** — scientific computing (statistical
  distributions, signal processing).
- **[SymPy](https://www.sympy.org) 1.14** — symbolic mathematics.

### Type Checking

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[mypy](https://mypy-lang.org)** — strict static type checker for all Python
  scripts (`utils/generate_contract.py`, `scripts/models/github_models.py`,
  `scripts/analytics/generate_wallet_analytics.py`). Run via `npm run lint:py`.

### Documentation Build

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[MkDocs](https://www.mkdocs.org) ≥1.6, <2** — static site generator that
  transforms `docs/*.md` into the GitHub Pages site at
  `https://kevinle3212.github.io/TrustLedger`.
- **[Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) ≥9.6,
  <9.7** — Material Design theme with search, navigation tabs, code annotations,
  and dark mode. Run `npm run docs:build` (enforces `--strict`).

---

## Tooling and Quality

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

### Linting and Formatting

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[ESLint](https://eslint.org) v9/v10** — JavaScript and TypeScript linting.
  The root workspace uses flat config (`eslint.config.mjs`) at v10; the frontend
  uses v9 with `eslint-config-next`. Both run at zero-warning tolerance.
- **[typescript-eslint](https://typescript-eslint.io) v8** — TypeScript-aware
  ESLint rules. Enables type-informed linting across all TS files.
- **[Prettier](https://prettier.io) v3** — opinionated code formatter. Covers
  TypeScript, JavaScript, JSON, YAML, Markdown, and SCSS. Run with
  `npm run lint:prettier` or `npm run fix:prettier`.
- **[eslint-config-prettier](https://npmjs.com/package/eslint-config-prettier)**
  — disables ESLint rules that conflict with Prettier formatting.
- **[Solhint](https://protofire.github.io/solhint/) v6** — Solidity linter. Runs
  with `--max-warnings 0` on all `.sol` files.
- **[Stylelint](https://stylelint.io) v17** with
  `stylelint-config-standard-scss` — CSS/SCSS linter for
  `src/app/**/*.{css,scss}`.
- **[markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2)** —
  Markdown linter applied to all `*.md` files. Prose line limit: 80 characters.
  Configuration in `.markdownlint.json`. Run with `npm run lint:md`.
- **[Knip](https://knip.dev) v6** — dead-code and unused-dependency detector.
  Covers both the root workspace and `src/`. Run with `npm run lint:knip`.

### Testing

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[Jest](https://jestjs.io) v30** with `jest-environment-jsdom` — unit test
  runner for the frontend. Run with `npm run test:unit`. Coverage report via
  `npm run test:coverage`.
- **[@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/)
  v16** — component testing utilities that query the DOM the way a user would.
- **[@testing-library/jest-dom](https://testing-library.com/docs/ecosystem-jest-dom/)
  v6** — custom Jest matchers for DOM state assertions (`.toBeInTheDocument()`,
  etc.).
- **[Playwright](https://playwright.dev) v1.60** — end-to-end browser automation
  and testing. Headless Chromium is the primary target. Run with
  `npm run test:e2e`.
- **[@axe-core/playwright](https://npmjs.com/package/@axe-core/playwright)** —
  automated accessibility assertions integrated into every Playwright test.
  Catches WCAG violations at test time.
- **[Mocha](https://mochajs.org)** (via `@nomicfoundation/hardhat-mocha`) — test
  runner for Hardhat TypeScript tests. Run with `npm run hardhat:test`.

### React Health

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[React Doctor](https://www.npmjs.com/package/react-doctor) v0.5** — React
  codebase health analyser. Checks for anti-patterns, accessibility issues, and
  bundle quality. Score must stay at 100/100. Run with `npm run doctor`.
- **[React Scan](https://react-scan.com) v0.5** — runtime performance profiler.
  Highlights unnecessary re-renders in the browser. Active automatically in
  `NODE_ENV=development`.

### Smart-Contract Quality

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **Foundry `forge fmt`** — canonical Solidity formatter (configuration in
  `foundry.toml` `[fmt]` section). Run with `npm run lint:forge`.
- **Foundry `forge lint`** — Solidity static analyser built into Foundry. Runs
  at all severity levels with zero exclusions.
- **Foundry fuzzing** — property-based testing baked into `forge test`. 10 000
  fuzz runs per test with a fixed seed (`0x1`).
- **[Slither](https://github.com/crytic/slither)** — Trail of Bits static
  analyser for Solidity. Catches reentrancy, integer overflow, and common
  vulnerability patterns. Run separately before contract PRs.

### Security Scanning

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[Semgrep](https://semgrep.dev)** — multi-language static analysis. Runs in
  CI via `.github/workflows/security.yml` on every PR. False positives require a
  `# nosemgrep: <rule-id>` comment with justification.
- **[Gitleaks](https://gitleaks.io)** — secret scanner. Checks the full git
  history and staged changes. Configuration in `.gitleaks.toml`. Run via
  `npm run secrets:check` or the pre-push hook.
- **[CodeRabbit](https://coderabbit.ai)** — AI-powered automated code review on
  every PR. Configuration in `.coderabbit.yaml`.

### Commit and Release Hygiene

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[Husky](https://typicode.github.io/husky/) v9** — Git hooks manager. The
  pre-commit hook runs React Doctor `--staged` and the full lint suite. Never
  bypass with `--no-verify`.
- **[commitlint](https://commitlint.js.org)** (`@commitlint/cli`,
  `@commitlint/config-conventional`) — enforces Conventional Commits format
  (`feat:`, `fix:`, `chore:`, etc.) on every commit message.

### Type Generation

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[TypeChain](https://github.com/dethcrypto/TypeChain)** (via
  `@nomicfoundation/hardhat-typechain`) — generates TypeScript typings from
  compiled Solidity ABI artefacts. Output lives in `typechain-types/`.

### Dependency Management

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[Dependabot](https://docs.github.com/en/code-security/dependabot)** —
  automated pull requests for npm and GitHub Actions dependency updates.
  Configuration in `.github/dependabot.yml`.

### Environment and Secrets

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[dotenv](https://github.com/motdotla/dotenv)** — loads `.env` into
  `process.env` for Hardhat scripts and tooling.
- **`tools/sync-env-defaults.mjs`** — syncs `.env` values to `.env.example`
  (safe defaults only, no secrets). Run with `npm run env:sync`.
- **`tools/sync-vercel-env.mjs`** — pushes local environment to Vercel project
  settings. Run with `npm run env:sync:vercel`.

### Code Intelligence

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[@costline/nexus-graph](https://npmjs.com/package/@costline/nexus-graph)** —
  symbol-level dependency graph and MCP server for code navigation. Index with
  `npm run nexus:index`; serve with `npm run nexus:server`.

---

## DevOps and Infrastructure

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **[Vercel](https://vercel.com)** — frontend hosting, preview deployments, and
  production promotion. The `src/` directory is the Vercel project root.
  Deployments are triggered by `.github/workflows/deploy.yml`.
- **[Docker](https://www.docker.com)** — containerisation for the frontend
  runtime and local service dependencies. `docker/` contains the Dockerfile;
  `docker-compose.yml` wires up the local service stack.
- **[Kubernetes](https://kubernetes.io)** — container orchestration for
  production deployments. Manifests live in `k8s/` and are managed with
  [Kustomize](https://kustomize.io). Validated with `npm run lint:k8s`.
- **[GitHub Actions](https://docs.github.com/en/actions)** — CI/CD automation.
  Workflows in `.github/workflows/`:
    - `ci.yml` — lint, type-check, test, and build on every PR.
    - `security.yml` — Semgrep, CodeQL, and dependency audit.
    - `deploy.yml` — Vercel production promotion on merge to `main`.
    - `docs.yml` — MkDocs build and GitHub Pages publish.
    - `github-models.yml` — scheduled AI integration scenario runs.
    - `react-doctor.yml` — React Doctor health check on frontend changes.
    - `dependabot-automerge.yml` — auto-merge safe Dependabot patches.
    - `wiki-sync.yml` — syncs `docs/` to the GitHub Wiki.
    - `log-hygiene.yml` — enforces `logs/` retention policy.

---

## License

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

TrustLedger is released under the **Apache License 2.0**. See
[`LICENSE`](LICENSE) for the full text. Third-party dependencies remain under
their respective licenses.

## Legal

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

This document is part of TrustLedger, an open-source decentralized escrow and
arbitration protocol. Use of this software and documentation is subject to the
[Terms and Conditions](../TERMS_AND_CONDITIONS.md),
[Privacy Policy](../PRIVACY_POLICY.md), and
[Risk Disclosure](../RISK_DISCLOSURE.md). See [`LEGAL.md`](LEGAL.md) for the
full compliance and licensing overview.
