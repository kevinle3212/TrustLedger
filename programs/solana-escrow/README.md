# TrustLedger Solana Escrow Program

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

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

Keep this program on localnet/devnet until the instruction set, wallet flow, and
audit scope are complete.
