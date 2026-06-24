# Cursor Settings

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../CREDITS.md).

Project-specific Cursor settings can live here when needed. The active routing
behavior is defined by `.cursor/rules/*.mdc` and `.cursor/instructions/`.

`settings.json` records strict TrustLedger agent defaults for logs, dependency
audits, SWC policy, and secret handling. Cursor may ignore unknown project
settings, but agents should treat them as repository policy.
