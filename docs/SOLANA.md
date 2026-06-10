# Solana Support

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Decision](#decision)
- [Current Implementation](#current-implementation)
- [Current Devnet Program](#current-devnet-program)
- [Deployment Commands](#deployment-commands)
- [Next Native Program Milestones](#next-native-program-milestones)
- [Safety Rules](#safety-rules)

<!-- docs-toc:end -->

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

TrustLedger's Solana path is **native-program first**. The project should build
an equivalent Solana escrow experience before accepting bridged SOL on EVM
chains.

## Decision

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Option                     | Decision | Rationale                                                                    |
| -------------------------- | -------- | ---------------------------------------------------------------------------- |
| Native Solana program      | Chosen   | Gives Solana users wallet-native escrow, program accounts, and local tests.  |
| Bridged SOL on EVM         | Deferred | Adds bridge and wrapped-asset risk before the Solana product is proven.      |
| Dual native and bridged UX | Later    | Possible after native Solana escrow has audited semantics and test coverage. |

## Current Implementation

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The current repository adds typed frontend helpers in `src/helpers/solana.ts`
and the escrow transaction client in `src/lib/solanaEscrow.ts`. These helpers
define:

- Native-program support mode.
- Supported clusters: `devnet`, `testnet`, `mainnet-beta`, and `localnet`.
- RPC and Explorer URL defaults.
- Conservative Solana public key shape validation.
- Explorer URL construction with safe cluster parameters.
- Deterministic escrow PDA derivation for the current proposer, counterparty,
  and contract hash.
- A create-escrow instruction encoder with SOL lamport parsing, timing fields,
  arbitration fee basis points, holdback basis points, warranty seconds,
  proposer role, and contract URI.
- A wallet transaction path that simulates before requesting a Solana wallet
  signature.

SOL custody is gated by `NEXT_PUBLIC_SOLANA_PROGRAM_ID`. Leave this public
program ID empty until the TrustLedger native program is deployed and reviewed.
When it is empty, the frontend blocks SOL submission instead of pretending
custody is available.

## Current Devnet Program

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Field      | Value                                          |
| ---------- | ---------------------------------------------- |
| Cluster    | `devnet`                                       |
| Program ID | `Ge69iToz9hpRYYiugMX8N9n5Tns3FcwvaRgTAYLe2tGN` |

The program keypair is intentionally stored under ignored `target/deploy/`
artifacts and must not be committed.

Unit coverage for the helper lives in `src/tests/unit/solana-helper.test.ts` and
`src/tests/unit/solana-escrow.test.ts`.

The native program scaffold lives in `programs/solana-escrow`. Run:

```sh
npm run solana:program:fmt
npm run solana:program:check
```

The Solana program tracks the current `solana-program` 4.x crate family so the
lockfile avoids retired transitive cryptography dependencies such as
`rand 0.7.x`. Keep Solana crate bumps tied to `npm run solana:program:fmt`,
`npm run solana:program:check`, and the repository security scan. Use Rust 1.89
or newer because this crate family includes edition-2024 package metadata.

## Deployment Commands

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The regular repository build runs `npm run solana:program:check` through
`npm run build:solana`; this validates the Solana Rust source without requiring
the Solana SBF deploy toolchain on every frontend or contract build.

Use the deploy commands only when intentionally deploying or upgrading the
Devnet program:

```sh
mkdir -p target/deploy
solana-keygen new --no-bip39-passphrase --outfile target/deploy/trustledger_solana_escrow-keypair.json
npm run solana:program:build
npm run solana:program:address
npm run solana:program:deploy:devnet
npm run solana:program:show:devnet
```

`target/deploy/` is ignored by Git. The public program ID belongs in
`NEXT_PUBLIC_SOLANA_PROGRAM_ID`; the keypair file must stay local and private.

The homepage now exposes an explicit chain-mode cue:

- **EVM Escrow Live** is the active custody path backed by the deployed
  TrustLedger escrow contracts.
- **Solana Devnet Preview** is a native-program planning surface, linked to the
  Solana Explorer system program on the configured cluster for safe devnet
  orientation.

Do not label Solana as production escrow until the native program is deployed,
its program ID is configured, wallet simulation coverage passes, deployment
instructions are current, and the audit scope is documented.

## Next Native Program Milestones

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

1. Model arbitration and reputation accounts with explicit account ownership and
   discriminator checks.
2. Add LiteSVM or Mollusk tests for account initialization, deposits,
   cancellations, disputes, payouts, and reputation updates.
3. Generate a typed client from the IDL.
4. Expand wallet-standard Solana discovery beyond injected wallet fallbacks.
5. Document program IDs, upgrade authority, deployment commands, and audit
   scope.

## Safety Rules

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- Never request private keys, seed phrases, or keypair files from users.
- Never send Solana transactions without explicit user confirmation.
- Treat account data and RPC responses as untrusted input.
- Default all development UX to devnet or localnet.
- Document any future bridge integration as a separate threat model before
  enabling it for users.
