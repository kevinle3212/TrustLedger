# Dependency Health Report

<a id="top"></a>

<!-- docs-nav:start -->

[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Audit Evidence](#audit-evidence)
- [Outdated Package Sweep](#outdated-package-sweep)
- [Vulnerability Chains](#vulnerability-chains)
- [Breaking-Change Impact](#breaking-change-impact)
- [Deprecation Findings](#deprecation-findings)
- [Remediation Timeline](#remediation-timeline)

<!-- docs-toc:end -->

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

Date: 2026-06-10

## Audit Evidence

<!-- docs-section-nav:start -->

[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Approved audit commands were run against npm's audit service.

| Command                                 | Result            |
| --------------------------------------- | ----------------- |
| `npm audit --json`                      | 0 vulnerabilities |
| `npm audit --omit=dev --json`           | 0 vulnerabilities |
| `cd src && npm audit --json`            | 0 vulnerabilities |
| `cd src && npm audit --omit=dev --json` | 0 vulnerabilities |

The root Hardhat 3 migration removed the Hardhat 2 toolbox chain and direct
`hardhat-gas-reporter` usage. Production dependencies are clean in both the root
and frontend package trees.

The root override set intentionally pins `micro-packed@0.7.2` and
`@scure/base@1.2.2` for Hardhat 3.9.0. Newer compatible-range releases triggered
Node 22.22.3 ESM loader/API mismatches in Hardhat's `micro-eth-signer` path
during Mocha tests.

## Outdated Package Sweep

<!-- docs-section-nav:start -->

[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Safe updates applied on 2026-06-09 and 2026-06-10:

- Root: `@types/node`, `typescript-eslint`, `hardhat`, direct Hardhat 3 plugins,
  `env-paths`, and `prettier`.
- Frontend: `@tanstack/react-query`, `@types/node`, `@types/react`,
  `react-doctor`, `resend`, `typescript-eslint`, `viem`, and lockfile-resolved
  transitive updates.

Remaining outdated direct packages are intentionally not force-upgraded in this
pass:

- Frontend `eslint`/`@eslint/js` require ESLint 10 migration.
- Frontend `wagmi` requires wagmi 3 migration and wallet regression testing.
- Exact-pinned Next/React packages remain on the repository's pinned versions
  until a coordinated framework bump is tested.

## Vulnerability Chains

<!-- docs-section-nav:start -->

[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Root package | Direct? | Severity | Dependency path | Fix availability | Mitigation                                               |
| ------------ | ------- | -------- | --------------- | ---------------- | -------------------------------------------------------- |
| N/A          | N/A     | N/A      | N/A             | N/A              | Root `npm audit` is clean after the Hardhat 3 migration. |

## Breaking-Change Impact

<!-- docs-section-nav:start -->

[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The Hardhat 3 migration is complete using explicit plugins instead of the
all-in-one toolbox. The official `hardhat-gas-reporter` package still peers on
Hardhat 2, so gas reports should use Foundry until a compatible reporter is
available.

## Deprecation Findings

<!-- docs-section-nav:start -->

[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Lockfile deprecation metadata and local dependency-chain inspection identified
these categories:

| Category                                | Packages                                                                                            | Chain                                                        | Risk                                  | Action                                                                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Fixable Now                             | None proven safe without package migration                                                          | N/A                                                          | N/A                                   | No direct dependency was safely removable in this pass.                                                                 |
| Deferred Until Ecosystem Upgrade        | None currently identified in the root package tree                                                  | N/A                                                          | N/A                                   | Keep `npm audit` clean during future toolchain changes.                                                                 |
| Deferred Until Wallet Ecosystem Upgrade | MetaMask SDK analytics/provider packages, WalletConnect legacy packages, `@stablelib/*`, `qr-image` | `@reown/appkit` -> wagmi connectors -> wallet SDKs           | Wallet integration compatibility risk | Upgrade Reown/wagmi wallet stack only with wallet regression tests.                                                     |
| Mainnet Readiness Risk                  | `elliptic`, wallet SDK deprecated packages                                                          | Hardhat dev tooling and wallet connector transitive packages | Crypto/wallet supply-chain concern    | Must be reviewed before mainnet; production audit is currently clean, but wallet packages still need maintainer review. |

## Remediation Timeline

<!-- docs-section-nav:start -->

[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- Immediate: keep production and root development audits clean.
- Next dependency pass: evaluate a Hardhat 3-compatible gas/coverage reporter
  only after it avoids the removed Hardhat 2 dependency chain.
- Before mainnet: remove or formally accept every dev-tool low, refresh wallet
  SDKs, rerun audit/deprecation checks, and confirm no moderate/high/critical
  vulnerabilities exist in any package tree.
