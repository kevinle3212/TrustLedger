# Rust Admin API Infrastructure

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

This directory contains deployment examples for the Rust read-only admin
companion service.

## Files

- `Dockerfile` builds a non-root release image for `trustledger-admin-api`.
- `docker-compose.yaml` runs the service locally with env-file support.
- `k8s.yaml` defines the deployment and service.
- `kustomization.yaml` lets `kubectl kustomize infra/rust-admin-api` validate
  the manifests.
- `secret.example.yaml` documents the required Secret keys without committing
  real values.

## Local Docker

```bash
docker build -f infra/rust-admin-api/Dockerfile -t trustledger-admin-api:local .
docker compose -f infra/rust-admin-api/docker-compose.yaml up
```

## Kubernetes

Create a real Secret before applying the deployment:

```bash
kubectl create secret generic trustledger-admin-api \
  --from-literal=token="$(openssl rand -hex 32)"
kubectl apply -k infra/rust-admin-api
```

Do not commit generated Secret manifests.
