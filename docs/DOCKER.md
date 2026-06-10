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
- [Notes](#notes)
<!-- docs-toc:end -->

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

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
docker compose build
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
docker compose run test
docker compose run frontend-test
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
docker compose --profile frontend up --build frontend
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
