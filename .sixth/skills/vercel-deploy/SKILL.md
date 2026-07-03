---
name: vercel-deploy
description: Triage TrustLedger Vercel build failures and safe redeploys.
version: "1.0.0"
---

## Tool Fallback <!-- tool-fallback -->

- If a preferred tool, command, or skill is unavailable, failing, or a worse fit
  for the task, use the best available alternative rather than stopping or
  forcing it. Note which tool you used and why. Never fall back to a prohibited
  tool (for example `mcp__claude-in-chrome__*` is banned — use `/browse`).

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or the
desired outcome is unclear, interview the user with focused questions until intent
is unambiguous. State assumptions and confirm them before proceeding.

# Vercel Deploy

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today.
> See [`CREDITS.md`](../../../CREDITS.md).

Use this skill when a Vercel deployment fails or before retrying a production
frontend deployment.

## Local Verification

Run from the repository root:

```sh
npm run logs:check
cd src && npm run quality
cd src && npm run vercel-build
```

If the root pre-push gate is relevant, run:

```sh
npm run quality:all
```

## Deployment Notes

- `src/package.json` defines `vercel-build` as `next build`.
- Root `package.json` defines `deploy:vercel` as `vercel --prod`.
- `.github/workflows/deploy.yml` is manual-only and deploys contracts before
  triggering the Vercel frontend deployment.
- Required Vercel secrets are documented in `docs/ENVIRONMENT.md`.

Do not retry production deployment until the local frontend build and the pushed
GitHub Actions checks are green.
