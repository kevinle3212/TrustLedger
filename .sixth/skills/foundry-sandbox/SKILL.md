---
name: foundry-sandbox
description: Run TrustLedger Foundry tests without macOS sandbox proxy panics.
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

# Foundry Sandbox

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today.
> See [`CREDITS.md`](../../../CREDITS.md).

Use this skill for contract test routing, especially when fork tests fail under
local macOS sandboxing.

## Default Test Path

Run the sandbox-safe default:

```sh
npm run foundry:test
```

This skips live fork tests and avoids macOS system proxy access.

## Live Fork Tests

Only run live fork tests when RPC access is intentional and secrets are loaded:

```sh
npm run foundry:test:fork:live
```

If live fork tests fail because of network, RPC, or sandbox access, do not
rewrite tests to hide the issue. Record the failure in a Markdown log under
`logs/` and run:

```sh
npm run lint:logs
npm run logs:check
```
