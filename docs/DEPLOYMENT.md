# Deployment

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Network Status](#network-status)
- [Prerequisites](#prerequisites)
- [Local Hardhat Deployment](#local-hardhat-deployment)
- [Ethereum Sepolia Deployment With Foundry](#ethereum-sepolia-deployment-with-foundry)
- [Ethereum Sepolia Deployment With Hardhat](#ethereum-sepolia-deployment-with-hardhat)
- [GitHub Actions Deployment](#github-actions-deployment)
- [Frontend Address Sync](#frontend-address-sync)
- [Production Frontend URL](#production-frontend-url)
- [Container Frontend Deployment](#container-frontend-deployment)
- [Verification Notes](#verification-notes)

<!-- docs-toc:end -->

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

This document explains how to deploy TrustLedger locally, to Ethereum Sepolia,
and as a containerized frontend with the current Foundry, Hardhat, GitHub
Actions, Docker, and Kubernetes files.

## Network Status

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Network          |   Chain ID | Deployment Support                                        |
| ---------------- | ---------: | --------------------------------------------------------- |
| Local Hardhat    |    `31337` | Hardhat deploy script and frontend env sync.              |
| Ethereum Sepolia | `11155111` | Hardhat script, Foundry script, and `deploy.yml`.         |
| Arbitrum One     |    `42161` | Configured in Hardhat and Foundry; no dedicated workflow. |
| Base             |     `8453` | Configured in Hardhat and Foundry; no dedicated workflow. |
| Optimism         |       `10` | Configured in Hardhat and Foundry; no dedicated workflow. |

> **TODO:** Arbitrum Sepolia is not configured in source as of 2026-06-08.

## Prerequisites

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Create `.env` from `.env.example` and fill the variables needed for your target.
Read [Environment](ENVIRONMENT.md) for the full matrix.

For Ethereum Sepolia deploys, set:

```bash
SEPOLIA_RPC_URL=
DEPLOYER_PRIVATE_KEY=
ETHERSCAN_API_KEY=
```

For Vercel deployment through GitHub Actions, set these GitHub Actions secrets:

```bash
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_ID=
```

## Local Hardhat Deployment

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Start a local chain:

```bash
npm run node
```

In another terminal, deploy the contracts:

```bash
npm run hardhat:deploy:local
```

The Hardhat deploy script writes `artifacts/deployed-addresses.json`. On local
chain `31337`, it also runs `scripts/sync-frontend-env.ts`, which writes
`src/.env.local` with contract addresses.

## Ethereum Sepolia Deployment With Foundry

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Run a dry run first:

```bash
npm run foundry:deploy:sepolia:dry-run
```

Broadcast and verify:

```bash
npm run foundry:deploy:sepolia
```

The script uses `contracts/script/Deploy.s.sol`. It deploys and wires contracts
in this order:

| Order | Contract             |
| ----: | -------------------- |
|     1 | `JurorRegistry`      |
|     2 | `TrustLedger`        |
|     3 | `Arbitration`        |
|     4 | `ReputationRegistry` |

`Deploy.s.sol` precomputes addresses before deployment so constructor
dependencies match the final addresses. After deployment, it calls
`TrustLedger.initReputationRegistry`.

## Ethereum Sepolia Deployment With Hardhat

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Compile first:

```bash
npm run compile
```

Deploy:

```bash
npm run hardhat:deploy:sepolia
```

Use this path when you need the TypeScript deploy script output or local Hardhat
conventions. Use the Foundry path when you need the same flow as the GitHub
deployment workflow.

## GitHub Actions Deployment

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`.github/workflows/deploy.yml` is manual-only through `workflow_dispatch`. It is
named `Deploy (Ethereum Sepolia)` and uses environment `ethereum-sepolia`.

The workflow:

- Installs Node dependencies.
- Installs Foundry.
- Builds the frontend.
- Runs Solidity tests.
- Runs `forge script` with `SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, and
  optional verification.
- Parses `contracts/broadcast/Deploy.s.sol/11155111/run-latest.json`.
- Writes contract addresses and deploy blocks into Vercel environment variables.
- Runs `vercel deploy --prod` from `src/`.

## Frontend Address Sync

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

For local Hardhat deployments, use:

```bash
npm run sync:frontend:env
```

For Sepolia deployments, `deploy.yml` sets both default and `_SEPOLIA` frontend
variables in Vercel. See [Environment](ENVIRONMENT.md) for all address variable
names.

## Production Frontend URL

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Use `https://trustledger-zeta.vercel.app/en` as the canonical production
frontend URL for manual checks, documentation references, and agent runs. Do not
reintroduce the previous `src-trustledger.vercel.app` hostname unless historical
deployment context is explicitly needed.

## Container Frontend Deployment

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Build the standalone frontend image:

```bash
docker build -f docker/Dockerfile.frontend \
  -t ghcr.io/kevinle3212/trustledger-frontend:main .
```

Apply the Kubernetes base after setting non-secret values in
`k8s/configmap.yaml` and creating `trustledger-frontend-secrets` when needed:

```bash
npm run k8s:secret:generate
kubectl apply -f k8s/secret.yaml
kubectl kustomize k8s
kubectl apply -k k8s
kubectl -n trustledger rollout status deployment/trustledger-frontend
```

Read [Kubernetes](KUBERNETES.md) for image tagging, secrets, health checks,
ingress, autoscaling, and reproducibility notes.

Vercel builds the same `npm run vercel-build` script from `src/`, but the app
intentionally disables Next.js `standalone` output when `VERCEL=1`. Vercel's
builder performs its own serverless packaging, while Docker and Kubernetes need
the traced standalone server copied into the runtime image. Keep
`outputFileTracingRoot` disabled during Vercel builds; forcing it to the
repository root from the nested `src/` app causes Vercel to look for duplicated
paths such as `/vercel/path0/path0/.next/*` during packaging.

## Verification Notes

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Foundry verification uses the `[etherscan]` entries in `contracts/foundry.toml`.
Hardhat verification uses the `etherscan.apiKey` map in `hardhat.config.ts`.

Both configs use Solidity `0.8.24`, optimizer enabled, `optimizer_runs = 200`,
and `via_ir = true`.
