# TypeScript SDK

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Integration Surfaces](#integration-surfaces)
- [Compile Before Using TypeChain](#compile-before-using-typechain)
- [Script Patterns](#script-patterns)
- [Frontend Helpers](#frontend-helpers)
- [Example Contract Address Lookup](#example-contract-address-lookup)
- [ABI Usage](#abi-usage)
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

This document explains the TypeScript integration surfaces available in
TrustLedger. Read it when writing scripts, tests, frontend calls, or external
TypeScript clients.

## Integration Surfaces

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Surface                | Path                        | Use                                                            |
| ---------------------- | --------------------------- | -------------------------------------------------------------- |
| Hardhat scripts        | `scripts/*.ts`              | Deploy, wire contracts, check balances, sync frontend env.     |
| Hardhat tests          | `test/TrustLedger.test.ts`  | Ethers v6 TypeScript contract tests.                           |
| Shared frontend types  | `src/types/*.ts`            | Frontend TypeScript domain helpers exported through `@/types`. |
| Frontend ABI           | `src/lib/abi.ts`            | ABI exports used by the Next.js app.                           |
| Frontend wagmi helpers | `src/lib/wagmi.ts`          | Network, address, explorer, and USDC helper functions.         |
| TypeChain output       | `artifacts/typechain-types` | Generated after Hardhat compile.                               |

## Compile Before Using TypeChain

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Run:

```bash
npm run compile
```

Hardhat compiles `contracts/src`, writes artifacts under `artifacts/`, and
generates TypeChain wrappers under `artifacts/typechain-types` with target
`ethers-v6`.

## Script Patterns

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Run Hardhat scripts with the configured TypeScript project:

```bash
TS_NODE_PROJECT=tsconfig.hardhat.json hardhat run scripts/deploy.ts --network sepolia
```

Use the package scripts where possible:

```bash
npm run hardhat:deploy:sepolia
npm run hardhat:wire-reputation:sepolia
npm run sync:frontend:env
```

## Frontend Helpers

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`src/lib/wagmi.ts` exports:

| Export                                | Purpose                                                             |
| ------------------------------------- | ------------------------------------------------------------------- |
| `ZERO_ADDRESS`                        | Canonical zero address string.                                      |
| `TRUSTLEDGER_ADDRESS`                 | Default TrustLedger address from env or zero address.               |
| `ARBITRATION_ADDRESS`                 | Default Arbitration address from env or zero address.               |
| `JUROR_REGISTRY_ADDRESS`              | Default JurorRegistry address from env or zero address.             |
| `REPUTATION_REGISTRY_ADDRESS`         | Default ReputationRegistry address from env or zero address.        |
| `getContractDeployment`               | Resolve deployment addresses for a chain ID.                        |
| `getNetworkName`                      | Return a display name for a chain ID.                               |
| `getConfiguredDeploymentNetworkNames` | Return networks with configured TrustLedger addresses.              |
| `getUsdcAddress`                      | Return the configured or default USDC address for supported chains. |
| `getExplorerTxUrl`                    | Build a transaction URL for a supported chain.                      |
| `config`                              | wagmi config built by Reown AppKit.                                 |

## Example Contract Address Lookup

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

```typescript
import { getContractDeployment, getExplorerTxUrl } from "./lib/wagmi";

const chainId = 11155111;
const deployment = getContractDeployment(chainId);
const txUrl = getExplorerTxUrl(chainId, "0x...");

console.log(deployment.trustLedger, txUrl);
```

## ABI Usage

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Use `src/lib/abi.ts` for frontend contract calls. Use TypeChain output for
Hardhat scripts and tests after `npm run compile`.

Do not hardcode deployment addresses in scripts or frontend code. Read them from
deployment artifacts or environment variables documented in
[Environment](ENVIRONMENT.md).

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
[Terms and Conditions](../TERMS_AND_CONDITIONS.md),
[Privacy Policy](../PRIVACY_POLICY.md), and
[Risk Disclosure](../RISK_DISCLOSURE.md). See [`LEGAL.md`](LEGAL.md) for the
full compliance and licensing overview.
