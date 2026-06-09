# Env Sync

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

Use when a change adds, removes, renames, or newly requires an environment
variable.

## Checklist

- Search consumers with `rg "process\.env|NEXT_PUBLIC_|ENV_NAME"`.
- Classify each value as secret, public browser config, or local-only tooling.
- Update `.env.example`, `src/.env.local.example`, and `docs/ENVIRONMENT.md`.
- If permitted, update ignored `.env` and `src/.env.local` without exposing
  secret values in logs or commits.
- For production requirements, update Vercel with `vercel env` and verify with a
  build or deployment inspection.
- Remove baked values from Docker and Kubernetes unless they are documented
  public constants.

Do not commit real secrets.
