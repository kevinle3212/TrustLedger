# Dependency Health Report

Date: 2026-06-09

## Audit Evidence

Approved audit commands were run against npm's audit service.

| Command                                 | Result                                 |
| --------------------------------------- | -------------------------------------- |
| `npm audit --json`                      | 28 low, 0 moderate, 0 high, 0 critical |
| `npm audit --omit=dev --json`           | 0 vulnerabilities                      |
| `cd src && npm audit --json`            | 0 vulnerabilities                      |
| `cd src && npm audit --omit=dev --json` | 0 vulnerabilities                      |

The remaining root findings are development-tooling findings. Production
dependencies are clean in both the root and frontend package trees.

## Vulnerability Chains

| Root package                       | Direct?    | Severity | Dependency path                                                                            | Fix availability                                       | Mitigation                                                                           |
| ---------------------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `hardhat`                          | Direct     | Low      | `hardhat@2.28.6` -> `@ethersproject/abi`                                                   | `hardhat@3.9.0`, semver-major                          | Defer until Hardhat 3 migration is planned and Hardhat tests/scripts are ported.     |
| `@nomicfoundation/hardhat-ethers`  | Direct     | Low      | `@nomicfoundation/hardhat-ethers@3.1.3` -> `hardhat`                                       | `@nomicfoundation/hardhat-ethers@4.0.13`, semver-major | Defer with Hardhat 3 migration.                                                      |
| `@nomicfoundation/hardhat-toolbox` | Direct     | Low      | Toolbox -> Hardhat, verify, ignition, network helpers, TypeChain, coverage                 | `@nomicfoundation/hardhat-toolbox@7.0.0`, semver-major | Defer with Hardhat 3/toolbox migration.                                              |
| `@ethersproject/*`                 | Transitive | Low      | Hardhat and `eth-gas-reporter` pull ethers 5 packages                                      | Fixes require Hardhat/toolbox/ethers ecosystem upgrade | Keep production dependency tree clean; avoid using ethers 5 packages in app runtime. |
| `elliptic`                         | Transitive | Low      | `@ethersproject/signing-key`, `secp256k1`                                                  | Fixes require Hardhat/toolbox major upgrade            | Development-only exposure; revisit before mainnet.                                   |
| `ethereum-cryptography`            | Transitive | Low      | `@nomicfoundation/hardhat-network-helpers` -> `ethereumjs-util` -> `ethereum-cryptography` | Fixes require toolbox major upgrade                    | Development-only exposure; revisit before mainnet.                                   |
| `secp256k1`                        | Transitive | Low      | `ethereum-cryptography` -> `secp256k1` -> `elliptic`                                       | Fixes require toolbox major upgrade                    | Development-only exposure; revisit before mainnet.                                   |
| `solidity-coverage`                | Transitive | Low      | Toolbox -> `solidity-coverage` -> `hardhat`                                                | Fixes require toolbox major upgrade                    | Keep CI audit threshold high for production; use Foundry coverage where possible.    |
| `eth-gas-reporter`                 | Transitive | Low      | Toolbox -> gas reporter -> ethers 5                                                        | Fix available through toolbox ecosystem                | Development-only gas reporting; defer with toolbox upgrade.                          |

## Breaking-Change Impact

The available fixes require Hardhat 3 and Hardhat Toolbox 7. That is a major
toolchain migration, not a patch. Expected impact includes Hardhat config
changes, plugin compatibility review, deploy script review, TypeChain behavior
review, CI workflow updates, and full revalidation of Hardhat plus Foundry
contract suites.

## Deprecation Findings

Lockfile deprecation metadata and local dependency-chain inspection identified
these categories:

| Category                                | Packages                                                                                            | Chain                                                                       | Risk                                  | Action                                                                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Fixable Now                             | None proven safe without package migration                                                          | N/A                                                                         | N/A                                   | No direct dependency was safely removable in this pass.                                                                 |
| Deferred Until Ecosystem Upgrade        | `glob@5/7/8`, `inflight@1.0.6`                                                                      | Hardhat/toolbox, TypeChain, Solidity coverage, Mocha, Jest coverage tooling | Dev-tooling memory/performance risk   | Resolve during Hardhat/toolbox and test-tooling upgrade.                                                                |
| Deferred Until Wallet Ecosystem Upgrade | MetaMask SDK analytics/provider packages, WalletConnect legacy packages, `@stablelib/*`, `qr-image` | `@reown/appkit` -> wagmi connectors -> wallet SDKs                          | Wallet integration compatibility risk | Upgrade Reown/wagmi wallet stack only with wallet regression tests.                                                     |
| Mainnet Readiness Risk                  | `elliptic`, wallet SDK deprecated packages                                                          | Hardhat dev tooling and wallet connector transitive packages                | Crypto/wallet supply-chain concern    | Must be reviewed before mainnet; production audit is currently clean, but wallet packages still need maintainer review. |

## Remediation Timeline

- Immediate: keep production audits clean and document root dev-only lows.
- Next dependency pass: test Hardhat 3/toolbox 7 migration on a branch.
- Before mainnet: remove or formally accept every dev-tool low, refresh wallet
  SDKs, rerun audit/deprecation checks, and confirm no moderate/high/critical
  vulnerabilities exist in any package tree.
