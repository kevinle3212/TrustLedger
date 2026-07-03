# Env Sync

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../../CREDITS.md).

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

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or
the desired outcome is unclear, interview the user with focused questions until
intent is unambiguous. State assumptions and confirm them before proceeding.
