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

<!-- docs-toc:end -->

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

This document explains wallet configuration for the TrustLedger frontend. Read
it when changing Reown AppKit, supported chains, or wallet metadata.

## Wallet Stack

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The frontend uses Reown AppKit with wagmi and viem. Configuration lives in
`src/lib/wagmi.ts`.

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
