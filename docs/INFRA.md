# Infrastructure

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Topology](#topology)
- [Containers](#containers)
- [Kubernetes](#kubernetes)
- [Deployment](#deployment)
- [Environment management](#environment-management)
- [Monitoring, logging, and health](#monitoring-logging-and-health)
- [Operational runbook](#operational-runbook)
- [Not yet provisioned (follow-up)](#not-yet-provisioned-follow-up)
- [Authors and Contributors](#authors-and-contributors)
- [Legal](#legal)

<!-- docs-toc:end -->

Operational overview of how TrustLedger is built, containerized, deployed, and
monitored. This page is the index; deep dives live in [`DOCKER.md`](DOCKER.md),
[`KUBERNETES.md`](KUBERNETES.md), and [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Topology

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Component       | What it is                                    | Source                                         |
| --------------- | --------------------------------------------- | ---------------------------------------------- |
| Frontend (dApp) | Next.js 16 App Router app, deploys to Vercel  | `src/`                                         |
| Admin API       | Rust service for admin/operational endpoints  | `infra/rust-admin-api/`, `programs/admin-api/` |
| Smart contracts | Solidity (Ethereum Sepolia) + Solana programs | `contracts/`, `programs/`                      |

## Containers

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **Root `Dockerfile`** + **`docker-compose.yml`** — full-stack/local
  orchestration.
- **`docker/Dockerfile.frontend`** — production frontend image (Next.js
  standalone).
- **`docker/Dockerfile.dev`** + **`docker/docker-compose.dev.yml`** — local dev.
- **`docker/Dockerfile.ci`** — CI image.
- **`infra/rust-admin-api/Dockerfile`** + `docker-compose.yaml` — admin API
  image.

Build the frontend image:

```bash
docker build -f docker/Dockerfile.frontend -t trustledger-frontend .
```

## Kubernetes

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Manifests in `k8s/` are Kustomize-managed:

| File                                     | Purpose                                 |
| ---------------------------------------- | --------------------------------------- |
| `namespace.yaml`                         | Dedicated namespace                     |
| `deployment.yaml`                        | Frontend Deployment (probes, resources) |
| `service.yaml` / `ingress.yaml`          | Service + ingress routing               |
| `hpa.yaml`                               | Horizontal Pod Autoscaler               |
| `configmap.yaml` / `secret.example.yaml` | Config + secret template                |
| `networkpolicy.yaml`                     | Network isolation                       |

```bash
# Copy secret.example.yaml → secret.yaml first, then:
kubectl apply -k k8s/ # frontend
kubectl apply -k infra/rust-admin-api # admin API
```

The admin API has its own kustomization under `infra/rust-admin-api/`.

## Deployment

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **Frontend → Vercel.** App Router on Fluid Compute; `vercel-build` script in
  `src/package.json`. Manage environment with `vercel env`.
- **Contracts → Sepolia / Solana.** See `DEPLOYMENT.md` and the
  `hardhat:deploy:*` / `foundry:deploy:*` scripts in the root `package.json`.

## Environment management

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Configuration is documented in [`ENVIRONMENT.md`](ENVIRONMENT.md) and templated
in `.env.example`. Client-safe values are `NEXT_PUBLIC_*`; server secrets are
read through `@/core` `serverConfig()` and never shipped to the client.
Kubernetes secrets use the `secret.example.yaml` templates (never commit real
secrets).

## Monitoring, logging, and health

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **Health endpoints:** `GET /api/health` and `GET /api/health/runtime` back
  container/K8s liveness and readiness probes.
- **Operational analytics:** `GET /api/analytics/{events,github}` (authorized) —
  see [`ANALYTICS.md`](ANALYTICS.md).
- **Structured logging:** application code logs through the core logger
  (`@/core` → `logger`), level-gated by `NEXT_PUBLIC_LOG_LEVEL`. Forward logs to
  an external collector by installing a custom sink (`setLogSink`).

## Operational runbook

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Scenario          | Action                                                                              |
| ----------------- | ----------------------------------------------------------------------------------- |
| Frontend rollback | Promote the previous Vercel deployment, or `kubectl rollout undo deployment/<name>` |
| Scale up/down     | Adjust `k8s/hpa.yaml` min/max or `kubectl scale`                                    |
| Rotate a secret   | Update the K8s secret / Vercel env var, then restart pods / redeploy                |
| Health failing    | Check `/api/health/runtime`, pod logs (`kubectl logs`), and recent deploys          |
| Config change     | Update `configmap.yaml` / Vercel env, redeploy, verify health                       |

## Not yet provisioned (follow-up)

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The following are intentionally **not** committed because they require a chosen
cloud target and validated against real credentials before use:

- Terraform modules (cloud networking, cluster, DNS, secrets manager).
- Ansible playbooks for VM-based admin-API hosts.
- Alerting rules and a metrics backend (e.g. Prometheus/Alertmanager) and
  automated backup/restore jobs.

Add these under `infra/<tool>/` with a matching section here and run the tool's
own validator (`terraform validate`, `ansible-lint`) in CI before merging.

## Authors and Contributors

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **Kevin K. Le** — Founder, Founding Engineer, and Current Lead Engineer
  ([LinkedIn](https://www.linkedin.com/in/lekevin1))
- **Kellen Snider** — Founding Engineer
  ([LinkedIn](https://www.linkedin.com/in/kellen-snider-683396256/))

See [`CREDITS.md`](CREDITS.md) for the complete acknowledgement list.

## Legal

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

This document is part of TrustLedger, an open-source decentralized escrow and
arbitration protocol. Use of this software and documentation is subject to the
[Terms and Conditions](../TERMS_AND_CONDITIONS.md),
[Privacy Policy](../PRIVACY_POLICY.md), and
[Risk Disclosure](../RISK_DISCLOSURE.md). See [`LEGAL.md`](LEGAL.md) for the
full compliance and licensing overview.
