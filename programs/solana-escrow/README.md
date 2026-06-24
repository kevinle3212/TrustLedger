# TrustLedger Solana Escrow Program

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../CREDITS.md).

This crate is the native Solana escrow foundation for TrustLedger SOL custody.
It mirrors the frontend instruction builder in `src/lib/solanaEscrow.ts`.

## Current Instruction

`CreateEscrow` initializes a deterministic program-derived escrow account using:

- Payer wallet.
- Counterparty wallet.
- Contract hash.
- Escrow amount in lamports.
- Duration, acceptance window, arbitration fee, holdback, warranty, proposer
  role, and contract URI.

The program creates a program-owned PDA with rent plus escrow lamports and
writes the escrow metadata into account data. Future instructions should add
cancellation, acceptance, work submission, dispute, release, and reputation
updates before production SOL custody is enabled.

## Local Checks

```sh
NO_DNA=1 cargo check --manifest-path programs/solana-escrow/Cargo.toml
```

The program uses the current Solana 4.x crate family to avoid retired transitive
dependencies such as vulnerable `rand 0.7.x` versions. Re-run this check and the
repository security scan after every Solana dependency update.

Keep this program on localnet/devnet until the instruction set, wallet flow, and
audit scope are complete.
