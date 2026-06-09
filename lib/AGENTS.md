# Rust Library Agent Notes

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

Use `.sixth/skills/rust-backend/SKILL.md` for shared Rust library work.

Rules:

- Shared models belong in `lib/trustledger-core`; service-specific handlers
  belong in `programs/*`.
- Keep all public Rust items documented because workspace lints deny missing
  docs.
- Do not add secrets, RPC keys, or private documents to examples or tests.
- Run `npm run rust:fmt`, `npm run rust:clippy`, and `npm run rust:test` after
  Rust changes.
