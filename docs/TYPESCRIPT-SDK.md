# TypeScript SDK

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

This document explains the TypeScript integration surfaces available in
TrustLedger. Read it when writing scripts, tests, frontend calls, or external
TypeScript clients.

## Integration Surfaces

| Surface                | Path                        | Use                                                            |
| ---------------------- | --------------------------- | -------------------------------------------------------------- |
| Hardhat scripts        | `scripts/*.ts`              | Deploy, wire contracts, check balances, sync frontend env.     |
| Hardhat tests          | `test/TrustLedger.test.ts`  | Ethers v6 TypeScript contract tests.                           |
| Shared frontend types  | `src/types/*.ts`            | Frontend TypeScript domain helpers exported through `@/types`. |
| Frontend ABI           | `src/lib/abi.ts`            | ABI exports used by the Next.js app.                           |
| Frontend wagmi helpers | `src/lib/wagmi.ts`          | Network, address, explorer, and USDC helper functions.         |
| TypeChain output       | `artifacts/typechain-types` | Generated after Hardhat compile.                               |

## Compile Before Using TypeChain

Run:

```bash
npm run compile
```

Hardhat compiles `contracts/src`, writes artifacts under `artifacts/`, and
generates TypeChain wrappers under `artifacts/typechain-types` with target
`ethers-v6`.

## Script Patterns

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

```typescript
import { getContractDeployment, getExplorerTxUrl } from "./lib/wagmi";

const chainId = 11155111;
const deployment = getContractDeployment(chainId);
const txUrl = getExplorerTxUrl(chainId, "0x...");

console.log(deployment.trustLedger, txUrl);
```

## ABI Usage

Use `src/lib/abi.ts` for frontend contract calls. Use TypeChain output for
Hardhat scripts and tests after `npm run compile`.

Do not hardcode deployment addresses in scripts or frontend code. Read them from
deployment artifacts or environment variables documented in
[Environment](ENVIRONMENT.md).
