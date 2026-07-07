# CI/CD

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Workflow Summary](#workflow-summary)
- [CI Workflow](#ci-workflow)
- [Deploy Workflow](#deploy-workflow)
- [Security Workflow](#security-workflow)
- [CodeRabbit Review](#coderabbit-review)
- [Claude Code Assistant](#claude-code-assistant)
    - [How the app was installed](#how-the-app-was-installed)
    - [Tag `@claude` from issues and pull requests](#tag-claude-from-issues-and-pull-requests)
    - [Automatic pull request review](#automatic-pull-request-review)
- [Docs Workflow](#docs-workflow)
- [Local Hygiene Workflow](#local-hygiene-workflow)
    - [MkDocs Dependency Pinning](#mkdocs-dependency-pinning)
- [Known Gotchas](#known-gotchas)
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

This document explains the GitHub Actions workflows in `.github/workflows`. Read
it when adding a job, debugging CI, or changing deployment secrets.

## Workflow Summary

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Workflow                   | Triggers                                     | Purpose                                                             |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| `ci.yml`                   | Push and pull request to `main`              | Frontend, TypeScript, Python, Hardhat, and Foundry checks.          |
| `deploy.yml`               | Manual `workflow_dispatch`                   | Deploy contracts to Ethereum Sepolia and deploy frontend to Vercel. |
| `security.yml`             | Push, pull request, weekly schedule, manual  | Slither, TruffleHog, Gitleaks, npm audit, CodeQL, and Semgrep.      |
| `docs.yml`                 | Docs-related pushes and manual               | Build MkDocs and publish GitHub Pages.                              |
| `wiki-sync.yml`            | Docs pushes and manual                       | Publish a wiki home page that links to rendered GitHub Pages docs.  |
| `github-models.yml`        | Prompt-related pushes, pull requests, manual | Run GitHub Models prompt checks and examples.                       |
| `react-doctor.yml`         | Frontend pushes and pull requests            | Run React Doctor checks on frontend changes.                        |
| `log-hygiene.yml`          | Push, pull request, weekly schedule, manual  | Check ignored log/tmp retention policy and log Markdown formatting. |
| `dependabot-automerge.yml` | Dependabot pull requests                     | Auto-merge selected Dependabot updates.                             |
| `claude.yml`               | `@claude` mentions in issues and PRs         | Run Claude Code on demand from an issue or pull request.            |
| `claude-code-review.yml`   | Pull request opened, updated, or reopened    | Automatic Claude Code review on every pull request.                 |

## CI Workflow

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`ci.yml` has separate jobs for frontend, TypeScript, Python, Hardhat, and
Solidity. Root TypeScript and Hardhat jobs also run `npm run logs:check`,
`npm run tmp:check`, `npm run secrets:check`, and `npm run docs:nav:check` so
ignored local artifacts, sensitive file paths, and generated docs navigation
cannot silently drift from policy.

The TypeScript job installs pinned Gitleaks before `npm run secrets:check`.
Without that explicit binary setup, GitHub-hosted runners can pass dependency
installation but fail secret scanning with `gitleaks: not found`. Local
pre-commit runs `npm run ci:typescript` to mirror the TypeScript job's
substantive checks before changes reach the pre-push hook or GitHub Actions.

| Job          | Key Checks                                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `frontend`   | `npm ci` in `src/`, Playwright browser install, TypeScript check, frontend lint, frontend build, Playwright E2E.                  |
| `typescript` | Gitleaks install, root `npm ci`, sensitive-file guard, Hardhat compile, log/tmp retention, docs navigation, lint, Prettier check. |
| `python`     | Python setup, mypy install, scientific analytics artifact drift check, and `npm run lint:py`.                                     |
| `hardhat`    | Hardhat compile, log retention, and tests.                                                                                        |
| `solidity`   | Foundry install, `forge fmt --check`, `forge build --sizes`, CI-profile tests, gas snapshot.                                      |

## Deploy Workflow

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

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

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`security.yml` runs multiple scanners. Some scanner jobs are configured with
`continue-on-error`, so a warning or external service failure may not fail the
whole workflow. Review job logs even when the workflow is green.

## CodeRabbit Review

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`.coderabbit.yaml` configures strict automated PR review. CodeRabbit uses an
assertive review profile, can request changes, ignores generated/cache/log
paths, and has path-specific instructions for Solidity, TypeScript, workflows,
Docker, Kubernetes, package metadata, and docs. See [CodeRabbit](CODERABBIT.md).

## Claude Code Assistant

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`claude.yml` and `claude-code-review.yml` let Claude Code act on this repository
directly from GitHub. Both use the pinned
[`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action)
and authenticate with the `CLAUDE_CODE_OAUTH_TOKEN` repository secret.

### How the app was installed

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The workflows were scaffolded by running the `/install-github-app` slash command
inside the Claude Code CLI from a local checkout of this repository:

1. From the repository root, run `claude` to open the Claude Code CLI.
2. Run `/install-github-app` and follow the prompts. It installs the **Claude**
   GitHub App on the `kevinle3212/TrustLedger` repository, commits the two
   workflow files under `.github/workflows/`, and stores the generated
   authentication token as the `CLAUDE_CODE_OAUTH_TOKEN` repository secret
   (**Settings → Secrets and variables → Actions**).
3. Merge the workflow pull request the command opens (this repository did so in
   [#121](https://github.com/kevinle3212/TrustLedger/pull/121)).

Re-run `/install-github-app` only to repair the installation or rotate the
token; day-to-day use needs nothing beyond the steps below.

### Tag `@claude` from issues and pull requests

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Once installed, `claude.yml` triggers whenever a comment or issue mentions
`@claude`. Write a plain-language request after the mention:

- **In an issue** — put `@claude` in the issue title or body (for example,
  `@claude investigate the failing juror payout test and propose a fix`).
  Assigning an issue also triggers a run.
- **In a pull request** — comment `@claude` on the PR, or on a specific line in
  a review comment (for example,
  `@claude refactor this to reuse the shared formatter`). Claude reads the diff
  and can push follow-up commits.
- **In a PR review** — include `@claude` in the review body to ask for changes
  against the whole review.

Claude has `contents: read`, `issues: read`, `pull-requests: read`, and
`actions: read` permissions, so it can read CI results on a PR but cannot merge
or change branch protection. It replies in the same thread you mentioned it in.

### Automatic pull request review

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`claude-code-review.yml` runs on every pull request that is opened,
synchronized, reopened, or marked ready for review — no mention required. It
invokes the `code-review` plugin against the PR and posts findings as a review.
The workflow ships with optional, commented-out filters (by author or by changed
paths) if you later want to scope which PRs are reviewed automatically.

## Docs Workflow

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`docs.yml` builds MkDocs from `docs/` using `mkdocs.yml`. `wiki-sync.yml`
regenerates the GitHub Wiki `Home.md` table of contents so the wiki points to
the rendered GitHub Pages documentation instead of duplicating raw Markdown
files. Keep canonical docs in `docs/`; the wiki should stay a lightweight entry
point to those rendered pages.

Local docs checks:

| Check                   | Command                       |
| ----------------------- | ----------------------------- |
| Strict MkDocs build     | `npm run docs:build`          |
| Generated docs nav      | `npm run docs:nav:check`      |
| Relative Markdown links | `npm run docs:links`          |
| External Markdown links | `npm run docs:links:external` |

## Local Hygiene Workflow

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`log-hygiene.yml` runs on pushes, pull requests, a weekly schedule, and manual
dispatch. It installs root npm dependencies, then runs:

```bash
npm run logs:check
npm run tmp:check
npm run lint:logs
```

The workflow usually sees empty `logs/` and `tmp/` directories because both are
ignored by git. Its job is to keep the retention policy executable and catch any
accidentally tracked local artifacts. Local hooks enforce the same checks
against real local logs and scratch files.

### MkDocs Dependency Pinning

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

TrustLedger pins MkDocs below 2.0 and Material for MkDocs below 9.7. Material
9.7 emits an upstream advisory about proposed MkDocs 2.0 changes on every build.
Using the latest 9.6 release keeps strict docs builds clean without suppressing
warnings.

Current `requirements-docs.txt` constraints:

```text
mkdocs>=1.6,<2
mkdocs-material>=9.6,<9.7
```

Track Material for MkDocs release notes before changing this constraint. Upgrade
the documentation toolchain only after the upstream advisory no longer prints
during ordinary strict builds or after the project intentionally adopts the new
MkDocs major version.

## Known Gotchas

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- The deploy workflow is Ethereum Sepolia-specific; it does not deploy to
  Arbitrum Sepolia.
- Foundry fork tests need `SEPOLIA_RPC_URL`; Hardhat forks need `FORK_URL`.
- `npm run foundry:test:fork` skips live fork RPC by default in sandboxed
  environments. Use `npm run foundry:test:fork:live` when `SEPOLIA_RPC_URL` is
  set and live RPC access is intentional.
- The frontend workflow uses `npx --yes npm@11.12.1 ci` inside `src/`.
- Vercel address sync depends on Foundry broadcast output existing at the
  expected Sepolia path.
- Regular vendored contract directories are not nested git repositories. Vendor
  cleanliness checks must scope `git status` to the vendor path, or unrelated
  local edits can be misreported as `forge-std` changes during hooks.
- Git hooks can export parent-repo Git environment variables such as
  `GIT_INDEX_FILE`. Scripts that run Git inside submodules should sanitize those
  variables before invoking nested Git commands.
- `native:check` writes ignored scratch objects under `tmp/`; pre-commit prunes
  `tmp/` immediately afterward so the later TypeScript parity gate does not fail
  on retention drift created by the same hook run.

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
[Terms and Conditions](TERMS_AND_CONDITIONS.md),
[Privacy Policy](PRIVACY_POLICY.md), and [Risk Disclosure](RISK_DISCLOSURE.md).
See [`LEGAL.md`](LEGAL.md) for the full compliance and licensing overview.
