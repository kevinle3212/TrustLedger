# Frontend Scripts

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../CREDITS.md).

This directory is intentionally reserved for frontend-scoped helper scripts that
must run from `src/`. Project-wide scripts live in root `scripts/` and `tools/`.

Current analytics generation lives at `../../scripts/analytics/` because it
writes shared assets under `../../assets/analytics/` and is used by root CI and
hooks.
