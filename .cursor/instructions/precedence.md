# AI Guidance Precedence

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../CREDITS.md).

1. User instructions in the active task.
2. Repository `AGENTS.md` or `.codex/AGENTS.md` guidance for Codex.
3. Role-specific files such as `CLAUDE.md`.
4. Cursor rules in `.cursor/rules/`, selected by glob.
5. General repository documentation.

Cursor should route frontend, backend, contract, security, docs, and testing
context based on the modified path globs in `.cursor/rules/`.

All edits must comply with `docs/QUALITY-STANDARDS.md`: React Doctor stays at
100/100, and merges and deployments are blocked when React Doctor, type-check,
lint, tests, build, accessibility, performance, or security checks fail.
