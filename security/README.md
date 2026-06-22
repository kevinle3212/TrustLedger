# Contract & Backend Security (`/security`)

Security tooling, configuration, and review material for the on-chain side of
TrustLedger: the Foundry/Solidity contracts in [`contracts/`](../contracts) and
the Solana program in [`programs/solana-escrow`](../programs/solana-escrow).

Frontend security helpers live in [`src/security/`](../src/security/README.md).

## Contents

| File                  | Purpose                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `slither.config.json` | [Slither](https://github.com/crytic/slither) static-analysis config for the Foundry contracts (excludes `lib/`, `test/`, `script/`, `mocks/`). |
| `CHECKLIST.md`        | Pre-merge / pre-deploy security review checklist tailored to the escrow, arbitration, juror, and reputation contracts.                         |
| `THREAT-MODEL.md`     | Assets, actors, trust boundaries, and the threats each contract must resist.                                                                   |

## Contracts in scope

| Contract             | File                                   | Concern                                             |
| -------------------- | -------------------------------------- | --------------------------------------------------- |
| `TrustLedger`        | `contracts/src/TrustLedger.sol`        | Escrow lifecycle, fund custody, ETH/USDC payments.  |
| `Arbitration`        | `contracts/src/Arbitration.sol`        | Dispute resolution, juror voting, fee distribution. |
| `JurorRegistry`      | `contracts/src/JurorRegistry.sol`      | Juror staking, selection, slashing.                 |
| `ReputationRegistry` | `contracts/src/ReputationRegistry.sol` | On-chain reputation scoring.                        |
| Solana escrow        | `programs/solana-escrow`               | SOL custody mirror of the EVM escrow.               |

## Running the tooling

```bash
# Static analysis (install: pip install slither-analyzer)
slither contracts --config-file security/slither.config.json

# Solidity linting (config at repo-root .solhint.json)
npx solhint 'contracts/src/**/*.sol'

# Foundry test suite incl. invariants/fuzzing
cd contracts && forge test

# Secret scanning / SAST also run in CI
#   .github/workflows/security.yml  (Semgrep + gitleaks)
```

## Reporting

Coordinated disclosure process and contact are in the repo-root
[`SECURITY.md`](../SECURITY.md). Do not open public issues for vulnerabilities.
