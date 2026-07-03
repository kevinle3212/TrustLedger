# Env Sync

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today.
> See [`CREDITS.md`](../../../CREDITS.md).

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
4. If the user permits local env edits, run `node tools/sync-env-defaults.mjs`
   to update ignored `.env`, `.env.local`, and `src/.env.local` without
   printing or overwriting secret values. If a specialized sync script applies
   (for example `scripts/sync-frontend-env.ts` after local deployment), run that
   too.
5. If the variable is required in production and Vercel is the target, run
   `npm run env:sync:vercel` to add missing non-empty values. It intentionally
   skips blank placeholders and does not overwrite existing Vercel values.
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

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or the
desired outcome is unclear, interview the user with focused questions until intent
is unambiguous. State assumptions and confirm them before proceeding.
