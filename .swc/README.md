# Root SWC Cache Policy

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

TrustLedger does not compile root Hardhat or scripts through a custom SWC
pipeline. The root `.swc/` directory is reserved for future explicit SWC policy
or generated cache boundaries.

## Current Decision

- Root TypeScript uses `tsc`, Hardhat, and ts-node settings.
- Frontend runtime compilation is owned by Next.js under `src/`.
- Do not commit generated SWC plugin caches or native binaries.
- Use `src/.swc/config.json` as the frontend SWC policy record.
