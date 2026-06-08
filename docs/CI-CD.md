# CI/CD

This document explains the GitHub Actions workflows in `.github/workflows`. Read
it when adding a job, debugging CI, or changing deployment secrets.

## Workflow Summary

| Workflow                   | Triggers                                     | Purpose                                                             |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| `ci.yml`                   | Push and pull request to `main`              | Frontend, TypeScript, Python, Hardhat, and Foundry checks.          |
| `deploy.yml`               | Manual `workflow_dispatch`                   | Deploy contracts to Ethereum Sepolia and deploy frontend to Vercel. |
| `security.yml`             | Push, pull request, weekly schedule, manual  | Slither, TruffleHog, npm audit, CodeQL, and Semgrep.                |
| `docs.yml`                 | Docs-related pushes and manual               | Build MkDocs and publish GitHub Pages.                              |
| `wiki-sync.yml`            | Docs pushes and manual                       | Copy `docs/*.md` into the GitHub wiki repository.                   |
| `github-models.yml`        | Prompt-related pushes, pull requests, manual | Run GitHub Models prompt checks and examples.                       |
| `react-doctor.yml`         | Frontend pushes and pull requests            | Run React Doctor checks on frontend changes.                        |
| `dependabot-automerge.yml` | Dependabot pull requests                     | Auto-merge selected Dependabot updates.                             |

## CI Workflow

`ci.yml` has separate jobs for frontend, TypeScript, Python, Hardhat, and
Solidity.

| Job          | Key Checks                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| `frontend`   | `npm ci` in `src/`, Playwright browser install, TypeScript check, frontend lint, frontend build, Playwright E2E. |
| `typescript` | Root `npm ci`, Hardhat compile, TypeScript lint, Solidity lint, markdown lint, Prettier check.                   |
| `python`     | Python setup, mypy install, and `npm run lint:py`.                                                               |
| `hardhat`    | Hardhat compile and tests.                                                                                       |
| `solidity`   | Foundry install, `forge fmt --check`, `forge build --sizes`, CI-profile tests, gas snapshot.                     |

## Deploy Workflow

`deploy.yml` deploys only to Ethereum Sepolia. It requires:

| Secret                 | Purpose                           |
| ---------------------- | --------------------------------- |
| `SEPOLIA_RPC_URL`      | Sepolia JSON-RPC endpoint.        |
| `DEPLOYER_PRIVATE_KEY` | Wallet that signs the deployment. |
| `ETHERSCAN_API_KEY`    | Optional source verification key. |
| `VERCEL_TOKEN`         | Vercel CLI auth token.            |
| `VERCEL_ORG_ID`        | Vercel team or account ID.        |
| `VERCEL_PROJECT_ID`    | Vercel project ID.                |

The workflow parses Foundry broadcast output for chain `11155111`, then writes
frontend contract address variables to Vercel before deploying the frontend.

## Security Workflow

`security.yml` runs multiple scanners. Some scanner jobs are configured with
`continue-on-error`, so a warning or external service failure may not fail the
whole workflow. Review job logs even when the workflow is green.

## Docs Workflow

`docs.yml` builds MkDocs from `docs/` using `mkdocs.yml`. `wiki-sync.yml` copies
markdown files from `docs/` to the GitHub wiki. Keep canonical docs in `docs/`
when they should appear in both published docs and the wiki.

### MkDocs Dependency Warning

`mkdocs build --strict` currently prints an upstream Material for MkDocs warning
about proposed backward-incompatible changes in MkDocs 2.0. The build still
passes with the current `requirements-docs.txt` constraint:

```text
mkdocs-material>=9.7,<10
```

Track Material for MkDocs release notes before changing this constraint. Upgrade
the documentation toolchain only after Material publishes a compatible path for
MkDocs 2.0 or pins a safe pre-2.0 dependency range.

## Known Gotchas

- The deploy workflow is Ethereum Sepolia-specific; it does not deploy to
  Arbitrum Sepolia.
- Foundry fork tests need `SEPOLIA_RPC_URL`; Hardhat forks need `FORK_URL`.
- The frontend workflow uses `npx --yes npm@11.12.1 ci` inside `src/`.
- Vercel address sync depends on Foundry broadcast output existing at the
  expected Sepolia path.
