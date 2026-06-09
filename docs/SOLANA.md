# Solana Support

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

TrustLedger's Solana path is **native-program first**. The project should build
an equivalent Solana escrow experience before accepting bridged SOL on EVM
chains.

## Decision

| Option                     | Decision | Rationale                                                                    |
| -------------------------- | -------- | ---------------------------------------------------------------------------- |
| Native Solana program      | Chosen   | Gives Solana users wallet-native escrow, program accounts, and local tests.  |
| Bridged SOL on EVM         | Deferred | Adds bridge and wrapped-asset risk before the Solana product is proven.      |
| Dual native and bridged UX | Later    | Possible after native Solana escrow has audited semantics and test coverage. |

## Current Implementation

The current repository adds typed frontend helpers in `src/helpers/solana.ts`.
Those helpers define:

- Native-program support mode.
- Supported clusters: `devnet`, `testnet`, `mainnet-beta`, and `localnet`.
- RPC and Explorer URL defaults.
- Conservative Solana public key shape validation.
- Explorer URL construction with safe cluster parameters.

This is intentionally not a mainnet custody implementation yet. The EVM escrow
contracts remain the only implemented custody path.

Unit coverage for the helper lives in `src/tests/unit/solana-helper.test.ts`.
Any future wallet or program integration should add transaction simulation and
provider-mock tests before exposing the UX.

## Next Native Program Milestones

1. Add an Anchor workspace under a dedicated Solana program directory.
2. Model escrow, arbitration, and reputation accounts with explicit account
   ownership and discriminator checks.
3. Add LiteSVM or Mollusk tests for account initialization, deposits,
   cancellations, disputes, payouts, and reputation updates.
4. Generate a typed client from the IDL.
5. Wire wallet-standard Solana discovery into the frontend behind a chain-mode
   selector.
6. Simulate transactions before requesting signatures and default to devnet.
7. Document program IDs, upgrade authority, deployment commands, and audit
   scope.

## Safety Rules

- Never request private keys, seed phrases, or keypair files from users.
- Never send Solana transactions without explicit user confirmation.
- Treat account data and RPC responses as untrusted input.
- Default all development UX to devnet or localnet.
- Document any future bridge integration as a separate threat model before
  enabling it for users.
