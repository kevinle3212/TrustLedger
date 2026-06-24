# Root SWC Cache Policy

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../CREDITS.md).

TrustLedger does not compile root Hardhat or scripts through a custom SWC
pipeline. The root `.swc/` directory is reserved for future explicit SWC policy
or generated cache boundaries.

## Current Decision

- Root TypeScript uses `tsc`, Hardhat, and ts-node settings.
- Frontend runtime compilation is owned by Next.js under `src/`.
- Do not commit generated SWC plugin caches or native binaries.
- Use `src/.swc/config.json` as the frontend SWC policy record.
