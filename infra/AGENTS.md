# Infra Agent Notes

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

Use `.sixth/skills/kubernetes/SKILL.md`, `.sixth/skills/rust-backend/SKILL.md`,
and `.sixth/skills/env-sync/SKILL.md` for changes in this directory.

Rules:

- Keep manifests reproducible and secret-free. Use Secret references, not raw
  token values.
- Keep Docker images non-root and pinned to explicit base image families.
- Update `docs/ADMIN.md`, `docs/KUBERNETES.md`, and `docs/ENVIRONMENT.md` when
  runtime variables, ports, probes, or deployment topology change.
- Run `npm run lint:k8s` when Kubernetes manifests change.
