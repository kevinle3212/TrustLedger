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
<!-- docs-toc:end -->

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

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
