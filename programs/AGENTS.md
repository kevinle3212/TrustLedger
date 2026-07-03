# Programs Agent Notes

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../CREDITS.md).

Use `.sixth/skills/rust-backend/SKILL.md` and the service-specific README before
changing binaries in this directory.

Rules:

- Program crates should be thin: parse config, wire routes, call shared library
  helpers, and expose health/readiness endpoints.
- Operator/admin endpoints stay read-only until persistent authorization and
  audit logging are available.
- Add route tests for new endpoints and keep responses secret-free.
- Document every public route in `docs/ADMIN.md` or a dedicated service doc.

## Clarify Before Acting <!-- clarify-before-acting -->

- Before replying or starting work, if the request is ambiguous or my intent is
  unclear, interview me with focused questions until it is unambiguous.
- Ask one round of concise, high-signal questions; state any assumptions you
  must make and confirm them before proceeding.
- Do not begin implementation while a meaningful interpretation is still open.
