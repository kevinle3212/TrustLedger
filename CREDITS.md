# Credits

TrustLedger is a Solidity-based smart contract system for secure escrow-based
transactions originally built on the Ethereum blockchain, but now supporting SOL
and USDC with commit-reveal arbitration, Chainlink VRF juror selection, and on-
chain reputation on Sepolia. This file acknowledges the people, technologies,
and resources that make the project possible.

## Authors and Contributors

- **Kevin K. Le** — Founder and Current Lead Engineer
  ([LinkedIn](https://www.linkedin.com/in/lekevin1))
- **Kellen Snider** — Founding Engineer
  ([LinkedIn](https://www.linkedin.com/in/kellen-snider-683396256/))

    Kellen co-founded TrustLedger and served as Founding Engineer during the
    project's Ethereum development phase. His architectural thinking, relentless
    attention to detail, and dedication to building trustworthy smart-contract
    infrastructure were instrumental in establishing the foundation this project
    stands on. TrustLedger would not exist in its current form without him.

Automated dependency maintenance is handled by Dependabot.

## Core Technologies

- **Next.js** (App Router) and **React** — application framework and UI runtime
- **TypeScript** — type-safe application code
- **Tailwind CSS** — styling and design tokens
- **Solidity**, **Foundry**, and **Hardhat** — smart-contract development,
  testing, and deployment

## Frontend Libraries

- **wagmi** and **viem** — Ethereum wallet connection and typed RPC
- **@reown/appkit** (`appkit-adapter-wagmi`) — wallet connection modal
- **@solana/web3.js** — Solana network support
- **@tanstack/react-query** — server-state caching and fetching
- **recharts** — analytics charts (code-split via dynamic import)
- **next-intl** — internationalization and locale routing
- **next-themes** — light/dark theme management
- **resend** — transactional email delivery
- **arweave** — decentralized document storage

## Smart-Contract Libraries

- **OpenZeppelin Contracts** — audited base contracts (access control,
  reentrancy protection, pausability, token interfaces)
- **forge-std** — Foundry standard testing library

## Tooling and Quality

- **Jest** and **Playwright** — unit and end-to-end testing
- **ESLint**, **Prettier**, **solhint**, and **Stylelint** — linting and
  formatting
- **React Doctor** — React health, accessibility, and bundle analysis
- **Semgrep** — static security analysis in CI
- **Slither** and **Foundry fuzzing** — smart-contract security analysis

## Infrastructure

- **Vercel** — frontend hosting and preview deployments
- **Docker** and **Kubernetes** — containerization and orchestration
- **GitHub Actions** — continuous integration and delivery

## License

TrustLedger is released under the **Apache License 2.0**. See
[`LICENSE`](LICENSE) for the full text. Third-party dependencies remain under
their respective licenses.
