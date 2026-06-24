---
name: env-sync
description:
    Use whenever a change introduces, removes, renames, or newly requires an
    environment variable across frontend, API, Docker, Kubernetes, or docs.
---

# Env Sync

Use this skill whenever frontend, API, workflow, Docker, Kubernetes, or docs
work introduces or changes an environment variable.

## Required Steps

1. Search all consumers with `rg "process\.env|NEXT_PUBLIC_|ENV_NAME"`.
2. Decide whether each variable is secret, public browser config, or local-only.
3. Update `.env.example`, `src/.env.local.example`, and `docs/ENVIRONMENT.md`.
4. Update ignored `.env` and `src/.env.local` only when the user has allowed it.
5. Add or update Vercel env values with `vercel env` for production variables.
6. Keep Docker and Kubernetes free of baked project-specific values unless the
   value is a documented public constant.
7. Validate with typecheck, lint, build, and Vercel inspection when deployment
   is affected.

Never commit secrets. Public `NEXT_PUBLIC_*` values can be exposed to browsers
but should still be injected per environment.
