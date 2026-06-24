# Arbitration Agent Checklist

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../CREDITS.md).

- Verify both parties can submit evidence before marking a dispute-ready UI
  complete.
- Confirm juror views show contract amount, fee pool, phase, selected jurors,
  evidence, and the ruling execution path.
- Keep evidence payloads as off-chain URIs; the contract stores metadata only.
- Run contract tests, frontend unit tests, lint, typecheck, React Doctor, and
  build before moving Phase 5 tasks to completed.
