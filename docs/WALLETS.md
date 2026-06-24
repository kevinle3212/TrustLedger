# Wallets

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Wallet Stack](#wallet-stack)
- [Required Variable](#required-variable)
- [Wallet Metadata URL](#wallet-metadata-url)
- [Contract Addresses](#contract-addresses)
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

This document explains wallet configuration for the TrustLedger frontend. Read
it when changing Reown AppKit, supported chains, or wallet metadata.

## Wallet Stack

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The frontend uses Reown AppKit with wagmi and viem. Configuration lives in
`src/lib/wagmi.ts`. The navigation wallet control is split into a lightweight
disconnected shell and the connected menu. Keep the connected path loaded when a
wallet is already connected so copy-address, analytics, dashboard, and
disconnect actions are immediately available without opening the AppKit modal.

Supported frontend networks are:

| Network      |   Chain ID |
| ------------ | ---------: |
| Sepolia      | `11155111` |
| Arbitrum One |    `42161` |
| Base         |     `8453` |
| Optimism     |       `10` |

## Required Variable

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Set this variable for WalletConnect relay wallets:

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

Without a real project ID, injected wallets and Coinbase can still work in some
browsers, but QR, mobile, Tangem, Phantom, and other WalletConnect relay flows
can fail.

## Wallet Metadata URL

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

AppKit advertises an origin to wallets. The frontend prefers the live browser
origin and uses `NEXT_PUBLIC_SITE_URL` or `NEXT_PUBLIC_APP_URL` as a
server-rendered fallback.

Set one of these for production:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXT_PUBLIC_APP_URL=https://your-domain.example
```

## Contract Addresses

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Wallet connection does not configure contract addresses. Contract addresses are
read from the frontend deployment variables documented in
[Environment](ENVIRONMENT.md).

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
[Terms and Conditions](../TERMS_AND_CONDITIONS.md),
[Privacy Policy](../PRIVACY_POLICY.md), and
[Risk Disclosure](../RISK_DISCLOSURE.md). See [`LEGAL.md`](LEGAL.md) for the
full compliance and licensing overview.
