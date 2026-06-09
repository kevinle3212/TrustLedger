# trustledger-core

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

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
