---
name: vercel-deploy
description: Triage TrustLedger Vercel build failures and safe redeploys.
version: "1.0.0"
---

# Vercel Deploy

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

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
