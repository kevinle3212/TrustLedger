# Docker

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Files](#files)
- [Root Compose Commands](#root-compose-commands)
- [Development Compose](#development-compose)
- [Direct Image Commands](#direct-image-commands)
- [Storage Hygiene](#storage-hygiene)
- [Notes](#notes)
- [Authors and Contributors](#authors-and-contributors)
- [Legal](#legal)

<!-- docs-toc:end -->

> **Kevin K. Le** ([LinkedIn](https://linkedin.com/in/lekevin1)) — Founder,
> Founding Engineer, and Current Lead Engineer; Software Engineer at the Oregon
> Blockchain Group, University of Oregon.
>
> **Kellen Snider** — Founding Engineer; Software Engineer at the Oregon
> Blockchain Group, University of Oregon. His vision, ideas, and dedication
> during TrustLedger's Ethereum development were invaluable to the codebase we
> build on today.
>
> See [`CREDITS.md`](CREDITS.md).

This document explains the Docker files included with TrustLedger. Read it when
running demo, local-chain, or containerized test workflows.

## Files

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| File                            | Purpose                                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `Dockerfile`                    | Demo/test image with Node 22, Foundry, root dependencies, frontend dependencies, and precompiled contracts. |
| `docker-compose.yml`            | Root demo, local node, contract test, frontend test, and production frontend services.                      |
| `docker/Dockerfile.dev`         | Development image used by `docker/docker-compose.dev.yml`.                                                  |
| `docker/Dockerfile.ci`          | CI-style image that compiles and runs Hardhat, Foundry, and frontend unit tests at build time.              |
| `docker/Dockerfile.frontend`    | Standalone production Next.js image used by Compose and Kubernetes.                                         |
| `docker/docker-compose.dev.yml` | Development compose file that mounts the repository into `/app`.                                            |
| `k8s/`                          | Kubernetes base for the production frontend image. See [Kubernetes](KUBERNETES.md).                         |

## Root Compose Commands

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Build the image:

```bash
npm run docker:build
```

Run demo scenarios:

```bash
docker compose up demo-good
docker compose up demo-bad
docker compose up demo-jurors
docker compose up demo-stablecoin
```

Start only the local node on port `8545`:

```bash
docker compose up node
```

Run containerized contract tests:

```bash
npm run docker:test
npm run docker:frontend:test
```

The `test` and `frontend-test` services run:

```bash
npm run hardhat:test
npm run foundry:test
cd src && npm test -- --runInBand
```

The root compose file uses profiles. Include `--profile demo`, `--profile dev`,
or `--profile test` when you want `docker compose config` to show those
services.

Run the production frontend container locally:

```bash
npm run docker:frontend:build
docker compose --profile frontend up frontend
```

Override the host port with `TRUSTLEDGER_FRONTEND_PORT=3001`.

Validate the Kubernetes base used by the frontend image:

```bash
npm run lint:k8s
```

## Development Compose

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Run the development compose file:

```bash
docker compose -f docker/docker-compose.dev.yml up dev
```

This mounts the repository into `/app`, keeps `/app/node_modules` and
`/app/src/node_modules` inside the container, and exposes port `8545` by
default. Override the host port with `TRUSTLEDGER_RPC_PORT=9545`. Pass env files
explicitly for workflows that need secrets, for example
`docker compose --env-file .env -f docker/docker-compose.dev.yml up dev`.

## Direct Image Commands

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Build the root Docker image directly:

```bash
docker build -t trustledger .
```

Build the standalone frontend image directly:

```bash
docker build -f docker/Dockerfile.frontend \
  --build-arg NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID" \
  -t trustledger-frontend .
```

The frontend image intentionally has no baked WalletConnect/Reown project ID.
Pass the public `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` build arg from the target
environment so the image can be rebuilt reproducibly without committing
environment-specific values.

```bash
docker build -f docker/Dockerfile.frontend \
  --build-arg NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID" \
  -t trustledger-frontend .
```

Run the happy-path demo:

```bash
docker run -e DEMO=good -p 8545:8545 trustledger
```

Run the standalone frontend image:

```bash
docker run --rm -p 3000:3000 trustledger-frontend
```

## Storage Hygiene

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Docker images and build cache can grow quickly because TrustLedger builds Node,
Foundry, contract, and frontend layers. The npm Docker workflows prune only when
Docker reports storage above the 5 GB default threshold:

```bash
docker system df -v
npm run docker:storage:check
npm run docker:storage:prune
```

`docker:storage:check` is non-destructive and fails when Docker reports storage
above the threshold. `docker:storage:prune` runs
`docker system prune -a --volumes -f` only when storage is above the threshold.
Override the threshold with `TRUSTLEDGER_DOCKER_MAX_BYTES`.

After any heavy Docker test session, image build, or push, inspect Docker usage
with `docker system df -v`. If build cache is multiple GB and you are not
actively iterating on Dockerfiles, prune it with `npm run docker:storage:prune`.

## Notes

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The Dockerfiles pin Foundry to `v1.5.1`, matching the locally validated Forge
toolchain. Override with `--build-arg FOUNDRY_TAG=<tag>` only when intentionally
testing a Foundry upgrade.

The Docker image initializes git submodules when `.git` is available. It then
compiles with Hardhat and Foundry during image build, so build failures usually
indicate dependency, compiler, or Solidity test issues rather than runtime demo
issues.

Do not add `env_file: ../.env` to shared compose files. `docker compose config`
prints expanded environment values, so secrets should be passed explicitly only
for local workflows that require them.

The frontend image uses Next.js standalone output. Container probes call
`/api/health/runtime`; use `/api/health` for the stricter operational
configuration report. If startup fails in Kubernetes, verify that the image tag
in `k8s/kustomization.yaml` matches the image you built or pushed.

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
