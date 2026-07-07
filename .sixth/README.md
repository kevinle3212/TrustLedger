# Sixth

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today.
> See [`CREDITS.md`](../CREDITS.md).

Sixth is an AI coding assistant and autonomous coding agent for VS Code. It is
used here as another agent surface for TrustLedger contributors who want local,
repo-specific instructions without copying long prompts between sessions.

## Purpose

The `.sixth/` directory stores TrustLedger-specific Sixth instructions. Keep it
focused on reusable operating guidance:

- Skills that point agents to the right files, commands, and validation gates.
- Notes about repo conventions that are easy to miss during agentic runs.
- Documentation for how Sixth should be used alongside Codex, Claude, Cursor,
  GitHub Actions, and Vercel.

Do not store secrets, local machine paths, generated logs, build output, or
one-off scratch prompts in this directory.

## Usage

Use Sixth from VS Code when you want an editor-integrated agent to work inside
the repository. Before asking it to change files, direct it to:

1. Read `AGENTS.md`.
2. Read `.sixth/README.md`.
3. Load only the relevant skill under `.sixth/skills/`.
4. Run the validation command listed by that skill before committing.

For broad TrustLedger changes, use the CI gate skill first:

```sh
npm run quality:all
```

For frontend-only changes, use:

```sh
cd src && npm run quality:all
```

For Vercel deployment triage, use the Vercel deploy skill and verify the
frontend build before retrying a deployment.

## Pricing

Pricing changes over time. As of June 9, 2026, Sixth's public pricing page
describes:

- Free plan: 50 agent/chat requests and 2,000 code completions per month.
- Pro plan: $10 per month with unlimited usage, extended Agent limits, frontier
  models, MCP, skills, hooks, and Telegram integration.

Verify current pricing at <https://app.trysixth.com/pricing> before purchasing
or documenting budget expectations. Product details are available at
<https://trysixth.com/product>, and installation docs are available at
<https://docs.trysixth.com/getting-started/installing-sixth>.

## Skills

Local skills live in `.sixth/skills/`:

- `ci-green-gate`: end-to-end local and GitHub Actions validation.
- `admin-dashboard`: restricted operator dashboard, auth, and audit-safe admin
  action rules.
- `dependency-audit`: dependency freshness and vulnerability audit workflow.
- `foundry-sandbox`: sandbox-safe Foundry and fork-test routing.
- `log-markdown`: readable ignored Markdown files under `logs/`.
- `react-doctor`: React Doctor and frontend maintainability checks.
- `rust-backend`: strict Cargo workspace and backend service rules.
- `swc-cache`: SWC cache population and `.swc/` policy.
- `update-context`: docs, comments, website, config, and agent guidance sync
  after repository changes.
- `vercel-deploy`: Vercel build/deploy triage and redeploy checks.

When a skill writes output to `logs/`, the output must be readable Markdown and
pass retention checks:

```sh
npm run logs:check
npm run tmp:check
```

Run `npm run logs:prune` or `npm run tmp:prune` when ignored local files exceed
retention limits.
