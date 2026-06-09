# Root SWC Cache Policy

TrustLedger does not compile root Hardhat or scripts through a custom SWC
pipeline. The root `.swc/` directory is reserved for future explicit SWC policy
or generated cache boundaries.

## Current Decision

- Root TypeScript uses `tsc`, Hardhat, and ts-node settings.
- Frontend runtime compilation is owned by Next.js under `src/`.
- Do not commit generated SWC plugin caches or native binaries.
- Use `src/.swc/config.json` as the frontend SWC policy record.
