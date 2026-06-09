# Env Sync

Use this skill whenever TrustLedger gains or changes an environment variable.

## Procedure

1. Locate all consumers with `rg "process\.env|NEXT_PUBLIC_|ENV_NAME"`.
2. Mark the value as secret, public browser config, or local-only.
3. Update `.env.example`, `src/.env.local.example`, and `docs/ENVIRONMENT.md`.
4. Update ignored `.env` and `src/.env.local` only with user permission.
5. Sync required production values to Vercel with `vercel env`.
6. Keep Docker and Kubernetes manifests parameterized instead of hardcoding
   project-specific values.
7. Run typecheck, lint, build, and deployment checks when affected.

Never commit real secrets. `NEXT_PUBLIC_*` values are public, but they should be
owned by the target environment.
