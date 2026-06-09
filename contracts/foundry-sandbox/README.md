# Foundry Sandbox

This directory is an isolated Foundry project for minimal reproductions,
experiments, and fork-test debugging. It is intentionally separate from the
primary `contracts/` suite so contributors can build small cases without
changing production tests.

## Usage

```bash
cd contracts/foundry-sandbox
forge test
```

Sandboxed macOS agent sessions should use the root wrapper:

```bash
node tools/foundry-sandbox.mjs test --root foundry-sandbox --offline
```

The sandbox imports the parent contract sources through `remappings.txt`.

## Layout

```text
contracts/foundry-sandbox/
├── foundry.toml            Local compiler, optimizer, and test config.
├── remappings.txt          Imports parent contracts and vendored libraries.
├── src/SandboxEscrowHarness.sol
│                           Minimal harness inheriting TrustLedger.
├── test/SandboxEscrowHarness.t.sol
│                           Smoke test proving parent contracts compile here.
└── script/README.md        Placeholder for focused repro scripts.
```

## Rules

- Keep sandbox cases minimal and reproducible.
- Move broadly useful tests into `contracts/test/`.
- Do not store private RPC URLs, keys, or fork snapshots here.
- Prefer `forge test -vvv` for local debugging and capture findings in
  `docs/reports/` when they affect the main suite.
