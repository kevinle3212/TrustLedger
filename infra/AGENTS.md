# Infra Agent Notes

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../CREDITS.md).

Use `.sixth/skills/kubernetes/SKILL.md`, `.sixth/skills/rust-backend/SKILL.md`,
and `.sixth/skills/env-sync/SKILL.md` for changes in this directory.

Rules:

- Keep manifests reproducible and secret-free. Use Secret references, not raw
  token values.
- Keep Docker images non-root and pinned to explicit base image families.
- Update `docs/ADMIN.md`, `docs/KUBERNETES.md`, and `docs/ENVIRONMENT.md` when
  runtime variables, ports, probes, or deployment topology change.
- Run `npm run lint:k8s` when Kubernetes manifests change.

## Clarify Before Acting <!-- clarify-before-acting -->

- Before replying or starting work, if the request is ambiguous or my intent is
  unclear, interview me with focused questions until it is unambiguous.
- Ask one round of concise, high-signal questions; state any assumptions you
  must make and confirm them before proceeding.
- Do not begin implementation while a meaningful interpretation is still open.
