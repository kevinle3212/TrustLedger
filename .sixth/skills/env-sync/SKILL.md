# Env Sync

Use this skill whenever code, scripts, workflows, Docker, Kubernetes, or docs add,
rename, remove, or require an environment variable.

## Workflow

1. Identify every consumer of the variable with `rg "ENV_NAME|process\.env|env\."`.
2. Classify the value as secret, public browser config, or local-only tooling.
3. Update `.env.example` and `src/.env.local.example` with:
   - purpose,
   - whether it is required,
   - whether it is safe to expose,
   - where to obtain or generate it.
4. If the user permits local env edits, update ignored `.env` and/or
   `src/.env.local` without printing secret values.
5. If the variable is required in production and Vercel is the target, add or
   update it through `vercel env` for the relevant environments. Prefer
   comparing `vercel env pull` output before replacing values.
6. Update `docs/ENVIRONMENT.md`, Docker docs, Kubernetes docs, and deployment
   docs when the variable affects those surfaces.
7. Remove hardcoded defaults from Dockerfiles, Kubernetes manifests, workflows,
   and source unless the value is a documented public constant.
8. Run the strictest relevant validation: typecheck, lint, build, and deployment
   inspection when Vercel is involved.

## Rules

- Never commit real secrets.
- `NEXT_PUBLIC_*` values are public browser configuration, not secrets, but they
  still belong in env files or deployment configuration instead of baked images.
- Do not invent production secrets. Generate local-only placeholders only when
  the consuming code explicitly supports arbitrary random values.
- When a value is intentionally hardcoded, document why it is public, stable, and
  safe to commit.
