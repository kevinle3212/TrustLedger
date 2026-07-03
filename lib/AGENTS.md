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

## Tool Fallback <!-- tool-fallback -->

- If a preferred tool, command, or skill is unavailable, failing, or a worse fit
  for the task, use the best available alternative rather than stopping or
  forcing it. Note which tool you used and why. Never fall back to a prohibited
  tool (for example `mcp__claude-in-chrome__*` is banned — use `/browse`).

## Clarify Before Acting <!-- clarify-before-acting -->

- Before replying or starting work, if the request is ambiguous or my intent is
  unclear, interview me with focused questions until it is unambiguous.
- Ask one round of concise, high-signal questions; state any assumptions you
  must make and confirm them before proceeding.
- Do not begin implementation while a meaningful interpretation is still open.
