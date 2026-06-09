# Oracle Architecture

TrustLedger currently uses oracle data for display and workflow support only. No
smart contract consumes off-chain price data in production paths.

## Endpoints

| Endpoint                                   | Purpose                                                        |
| ------------------------------------------ | -------------------------------------------------------------- |
| `GET /api/oracle/rates?base=eth&quote=usd` | Fetch a validated display rate.                                |
| `GET /api/oracle/status`                   | Return supported pairs, provider URL, TTL, and cache metadata. |

## Supported Pairs

| Base   | Quote | Provider ID |
| ------ | ----- | ----------- |
| `eth`  | `usd` | `ethereum`  |
| `usdc` | `usd` | `usd-coin`  |

## Data Flow

```mermaid
flowchart LR
    UI[Frontend payment UI] --> API[/api/oracle/rates]
    API --> Service[src/services/oracle.ts]
    Service --> Provider[Price provider]
    Service --> Cache[In-memory TTL cache]
    API --> UI
```

## Validation

- `base` must be one of the supported assets.
- `quote` must be `usd`.
- Provider payloads must contain a positive finite number.
- Cache TTL defaults to `60000` ms and is capped at `3600000` ms.

## Error Handling

If the provider fails after a successful read, the service returns the cached
rate with `stale: true`. If there is no cached rate, the route returns a `502`
JSON error.

## Monitoring

`GET /api/health` checks oracle source URL validity. `GET /api/oracle/status`
reports cache population and supported pairs without performing an external
fetch.

## Security Notes

Oracle data is informational. Do not use it for custody, payout, or dispute
decisions without a separate audited on-chain oracle design and contract tests.
