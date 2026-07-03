---
name: ci-green-gate
description: Run TrustLedger's strict local and GitHub Actions green-gate workflow.
version: "1.0.0"
---

## Tool Fallback <!-- tool-fallback -->

- If a preferred tool, command, or skill is unavailable, failing, or a worse fit
  for the task, use the best available alternative rather than stopping or
  forcing it. Note which tool you used and why. Never fall back to a prohibited
  tool (for example `mcp__claude-in-chrome__*` is banned — use `/browse`).

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or the
desired outcome is unclear, interview the user with focused questions until intent
is unambiguous. State assumptions and confirm them before proceeding.

# CI Green Gate

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today.
> See [`CREDITS.md`](../../../CREDITS.md).

Use this skill before pushing, after fixing a failed GitHub Actions run, or
before asking Vercel to redeploy.

## Local Checks

Run from the repository root:

```sh
npm run logs:check
npm run quality
npm run docs:build
npm run docs:links
npm run doctor
npm run build
```

For frontend-only failures, also run:

```sh
cd src && npm run quality:all
```

If `next build` fails only because the sandbox blocked Google Font fetches,
rerun with approved network access rather than changing source code.

## Remote Checks

After pushing to `main`, check the current commit:

```sh
gh run list --branch main --limit 10
gh run view <run-id> --json status,conclusion,jobs,url
```

Do not call the work green until each workflow for the pushed commit has
completed successfully or a non-required workflow has been explicitly identified
as out of scope.
