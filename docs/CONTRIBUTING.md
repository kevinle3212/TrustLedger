# Contributing

This document explains how to set up the repository, make changes, and pass the
required checks. Read it before opening a pull request.

## Setup

Use the bootstrapper for a guided setup with selectable install groups:

```bash
bash tools/setup.sh --help
bash tools/setup.sh
```

For manual setup, install root dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
cd src
npm install
cd ..
```

Create local environment files only when you need deployment, fork tests, wallet
connection, email, notifications, or IPFS:

```bash
cp .env.example .env
```

Read [Environment](ENVIRONMENT.md) before filling secrets.

### Serena Dashboard

Serena's dashboard remains enabled for local code navigation logs, but it should
not open automatically on startup. Configure this globally in
`~/.serena/serena_config.yml`:

```yaml
web_dashboard: true
web_dashboard_open_on_launch: false
```

Open the dashboard manually at
[http://localhost:24282/dashboard/index.html](http://localhost:24282/dashboard/index.html).
If that port is already in use, Serena may choose the next available port, such
as `24283` or `24284`.

## Development Workflow

Use small branches and keep generated build output out of commits. The
repository ignores normal build artifacts such as `artifacts/`,
`contracts/out/`, `contracts/cache/`, `src/.next/`, and `src/node_modules/`. The
root `site/` directory is MkDocs generated output and remains ignored; edit
source pages in `docs/` instead.

Before opening a PR, run the relevant checks:

```bash
npm run logs:check
npm run lint
npm run foundry:test
npm run hardhat:test
cd src
npm run build:frontend
npm run test:e2e
```

Run narrower checks while iterating. Read [Testing](TESTING.md) for the full
command list.

## Solidity Style

Solidity is checked by both Solhint and Foundry:

```bash
npm run lint:sol
npm run lint:forge
```

`contracts/foundry.toml` uses Solidity `0.8.24`, optimizer runs `200`,
`via_ir = true`, and `deny = "warnings"`. Keep contract comments useful and
avoid changing logic when a task is only about documentation or NatSpec.

## TypeScript Style

Root TypeScript covers Hardhat config, scripts, and tests:

```bash
npm run lint:ts
```

Frontend TypeScript and formatting run from `src/`:

```bash
cd src
npm run lint:frontend
```

## Markdown Style

Run:

```bash
npm run lint:md
```

Use one H1 at the top of each file, ATX headings, fenced code blocks with
language tags, no bare URLs, and prose lines around 100 characters where
practical.

Ignored files under `logs/` still need to be Markdown summaries that pass
markdownlint. Use:

```bash
npm run lint:logs
npm run logs:check
```

Run `npm run logs:prune` when local logs exceed retention limits.

## Documentation Ownership

Prefer these canonical docs:

- Architecture: [Architecture](ARCHITECTURE.md)
- Contract APIs: [Smart Contracts](SMART-CONTRACTS.md)
- Escrow states: [Escrow Lifecycle](ESCROW-LIFECYCLE.md)
- Arbitration: [Arbitration](ARBITRATION.md)
- Environment variables: [Environment](ENVIRONMENT.md)
- CI and deployment: [CI/CD](CI-CD.md), [Deployment](DEPLOYMENT.md)
- Frontend: [Frontend](FRONTEND.md)

When a fact belongs in a canonical doc, link to that doc instead of copying the
same explanation into another page.
