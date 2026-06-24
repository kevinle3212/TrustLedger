# Oracle Architecture

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Endpoints](#endpoints)
- [Supported Pairs](#supported-pairs)
- [Data Flow](#data-flow)
- [Validation](#validation)
- [Error Handling](#error-handling)
- [Monitoring](#monitoring)
- [Security Notes](#security-notes)
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

TrustLedger currently uses oracle data for display and workflow support only. No
smart contract consumes off-chain price data in production paths.

## Endpoints

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Endpoint                                   | Purpose                                                        |
| ------------------------------------------ | -------------------------------------------------------------- |
| `GET /api/oracle/rates?base=eth&quote=usd` | Fetch a validated display rate.                                |
| `GET /api/oracle/status`                   | Return supported pairs, provider URL, TTL, and cache metadata. |

## Supported Pairs

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Base   | Quote | Provider ID |
| ------ | ----- | ----------- |
| `eth`  | `usd` | `ethereum`  |
| `usdc` | `usd` | `usd-coin`  |

## Data Flow

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

```mermaid
flowchart LR
    UI[Frontend payment UI] --> API[/api/oracle/rates]
    API --> Service[src/services/oracle.ts]
    Service --> Provider[Price provider]
    Service --> Cache[In-memory TTL cache]
    API --> UI
```

## Validation

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- `base` must be one of the supported assets.
- `quote` must be `usd`.
- Provider payloads must contain a positive finite number.
- Cache TTL defaults to `60000` ms and is capped at `3600000` ms.

## Error Handling

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

If the provider fails after a successful read, the service returns the cached
rate with `stale: true`. If there is no cached rate, the route returns a `502`
JSON error.

## Monitoring

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`GET /api/health` checks oracle source URL validity. `GET /api/oracle/status`
reports cache population and supported pairs without performing an external
fetch.

## Security Notes

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Oracle data is informational. Do not use it for custody, payout, or dispute
decisions without a separate audited on-chain oracle design and contract tests.

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
