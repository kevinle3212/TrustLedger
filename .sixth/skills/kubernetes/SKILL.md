---
name: kubernetes
description: Use when adding, reviewing, deploying, debugging, or documenting TrustLedger Kubernetes manifests, secrets, probes, images, Kustomize output, or cluster rollout steps.
version: "1.0.0"
---

# Kubernetes

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

Use this skill for TrustLedger Kubernetes work under `k8s/`, Docker image
changes that affect Kubernetes runtime behavior, or deployment docs that mention
Kubernetes.

## Workflow

1. Read `docs/KUBERNETES.md`, `k8s/kustomization.yaml`, and the manifest being
   changed.
2. Keep real secrets out of git. Use `npm run k8s:secret:generate` to create
   ignored `k8s/secret.yaml` from environment variables, or document external
   secret-manager usage.
3. Use `/api/health/runtime` for readiness, liveness, startup probes, and public
   smoke checks. Keep `/api/health` admin-gated.
4. Preserve security defaults: no privileged containers, drop Linux
   capabilities, set resource requests/limits, avoid automounted service account
   tokens unless a manifest truly needs Kubernetes API access.
5. Keep image tags reproducible and document how to build, push, set, and roll
   back the tag.
6. Update `docs/KUBERNETES.md`, `docs/DEPLOYMENT.md`, and READMEs when commands,
   env vars, probes, or manifests change.

## Validation

Run the narrowest checks that prove the change:

```sh
npm run lint:k8s
npm run docs:build
```

For image/runtime changes also run:

```sh
docker build -f docker/Dockerfile.frontend -t trustledger-frontend:local .
```
