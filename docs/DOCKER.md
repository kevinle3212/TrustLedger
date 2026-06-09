# Docker

This document explains the Docker files included with TrustLedger. Read it when
running demo, local-chain, or containerized test workflows.

## Files

| File                            | Purpose                                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `Dockerfile`                    | Demo/test image with Node 22, Foundry, root dependencies, frontend dependencies, and precompiled contracts. |
| `docker-compose.yml`            | Root demo, local node, contract test, and frontend test services.                                           |
| `docker/Dockerfile.dev`         | Development image used by `docker/docker-compose.dev.yml`.                                                  |
| `docker/Dockerfile.ci`          | CI-style image that compiles and runs Hardhat, Foundry, and frontend unit tests at build time.              |
| `docker/docker-compose.dev.yml` | Development compose file that mounts the repository into `/app`.                                            |

## Root Compose Commands

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

## Development Compose

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

Build the root Docker image directly:

```bash
docker build -t trustledger .
```

Run the happy-path demo:

```bash
docker run -e DEMO=good -p 8545:8545 trustledger
```

## Notes

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
