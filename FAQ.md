# TrustLedger FAQ

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](./CREDITS.md).

This FAQ is the product-facing companion to the developer docs in `docs/`.

## What Is TrustLedger?

TrustLedger is a freelance escrow app. A client funds an on-chain contract, the
freelancer submits work, and payment releases after approval or juror
arbitration.

## Do I Need Real ETH?

No for development. Use Ethereum Sepolia test ETH. See
[misc/FAUCETS.md](misc/FAUCETS.md) for current faucet options and
troubleshooting.

## Which Networks Are Supported?

The current source config supports local Hardhat, Ethereum Sepolia, Arbitrum
One, Base, and Optimism. Arbitrum Sepolia is not configured yet.

## Why Did My Transaction Fail?

Common causes are the wrong wallet, wrong network, insufficient Sepolia ETH, a
stale contract status, or a rejected simulation. Check the wallet address,
network, contract status, and transaction error message before retrying.

## How Do Client And Freelancer Proposals Differ?

Freelancer proposals are accepted and funded by the client with
`acceptContract`. Client proposals require the freelancer to call
`acceptContractByFreelancer`, then the client funds with `fundContractByClient`.

## Where Are Developer Docs?

Start with [docs/Home.md](docs/Home.md). For AI helper scripts, read
[scripts/models/README.md](scripts/models/README.md) and
[docs/GITHUB_MODELS.md](docs/GITHUB_MODELS.md).

## Authors and Contributors

- **Kevin K. Le** — Founder, Founding Engineer, and Current Lead Engineer
  ([LinkedIn](https://www.linkedin.com/in/lekevin1))
- **Kellen Snider** — Founding Engineer
  ([LinkedIn](https://www.linkedin.com/in/kellen-snider-683396256/))

See [`CREDITS.md`](CREDITS.md) for the complete acknowledgement list.

## Legal

TrustLedger is an open-source decentralized escrow and arbitration protocol. Use
of this software and documentation is subject to the project's
[Terms and Conditions](TERMS_AND_CONDITIONS.md),
[Privacy Policy](PRIVACY_POLICY.md), and [Risk Disclosure](RISK_DISCLOSURE.md).
See [`docs/LEGAL.md`](docs/LEGAL.md) for the full compliance and licensing
overview.
