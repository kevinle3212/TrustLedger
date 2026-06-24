# trustledger-core

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../CREDITS.md).

Shared Rust models and helpers for TrustLedger services.

Current modules:

- `config` exposes redacted runtime configuration for Rust services.
- `audit` exposes redacted audit event models for operator-safe reporting.
- crate root exposes service health models shared by `/health` routes.

Run checks from the repository root:

```bash
npm run rust:fmt
npm run rust:clippy
npm run rust:test
```
