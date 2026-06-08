# Docker

This document explains the Docker files included with TrustLedger. Read it when
running demo, local-chain, or containerized test workflows.

## Files

| File                            | Purpose                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `Dockerfile`                    | Demo and local-development image with Node 22, Foundry, dependencies, and precompiled contracts. |
| `docker-compose.yml`            | Root demo, local node, and test services.                                                        |
| `docker/Dockerfile.dev`         | Development image used by `docker/docker-compose.dev.yml`.                                       |
| `docker/Dockerfile.ci`          | CI-style image that compiles and runs Hardhat and Foundry tests at build time.                   |
| `docker/docker-compose.dev.yml` | Development compose file that mounts the repository into `/app`.                                 |

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
```

The `test` service runs:

```bash
npm run hardhat:test
npm run foundry:test
```

## Development Compose

Run the development compose file:

```bash
docker compose -f docker/docker-compose.dev.yml up dev
```

This mounts the repository into `/app`, keeps `/app/node_modules` inside the
container, reads `../.env`, and exposes port `8545`.

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

The Docker image initializes git submodules when `.git` is available. It then
compiles with Hardhat and Foundry during image build, so build failures usually
indicate dependency, compiler, or Solidity test issues rather than runtime demo
issues.
