---
name: foundry-sandbox
description: Run TrustLedger Foundry tests without macOS sandbox proxy panics.
version: "1.0.0"
---

# Foundry Sandbox

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
