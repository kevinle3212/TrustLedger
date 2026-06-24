# Rust Library Agent Notes

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../CREDITS.md).

Use `.sixth/skills/rust-backend/SKILL.md` for shared Rust library work.

Rules:

- Shared models belong in `lib/trustledger-core`; service-specific handlers
  belong in `programs/*`.
- Keep all public Rust items documented because workspace lints deny missing
  docs.
- Do not add secrets, RPC keys, or private documents to examples or tests.
- Run `npm run rust:fmt`, `npm run rust:clippy`, and `npm run rust:test` after
  Rust changes.
