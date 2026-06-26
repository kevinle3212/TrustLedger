# TrustLedger Solana Staking Program

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../CREDITS.md).

Native Solana SOL staking foundation for TrustLedger. Built without Anchor to
match `programs/solana-escrow` and the repository's native-Solana dependency
posture (see that crate's README for the rationale). The frontend SOL adapter in
`src/lib/staking/adapters/sol.ts` targets this program via
`NEXT_PUBLIC_SOLANA_STAKING_PROGRAM_ID`.

## Instructions

| Discriminator | Instruction    | Effect                                                                   |
| ------------- | -------------- | ------------------------------------------------------------------------ |
| `0`           | `Initialize`   | Create the singleton pool PDA, set authority + reward rate, fund reserve |
| `1`           | `Stake`        | Move lamports from the owner into their stake PDA; balance increases     |
| `2`           | `Unstake`      | Return lamports from the stake PDA to the owner; balance decreases       |
| `3`           | `ClaimRewards` | Pay accrued linear rewards from the pool reserve to the owner            |

State lives in two PDAs:

- **Pool** — seeds `["trustledger_stake_pool"]`. Holds the authority, reward
  rate, total staked, and the reward reserve lamports.
- **Stake** — seeds `["trustledger_stake", owner]`. Custodies the owner's staked
  principal and accrued, unclaimed rewards.

Rewards accrue linearly: `staked * reward_rate * elapsed_seconds / 1e12`. A
non-advancing or backwards clock accrues nothing. Claims fail safely when the
pool reserve would drop below rent exemption.

## Local Checks

```sh
NO_DNA=1 cargo check --manifest-path programs/solana-staking/Cargo.toml   # npm run solana:staking:check
cargo fmt --manifest-path programs/solana-staking/Cargo.toml --check       # npm run solana:staking:fmt
NO_DNA=1 cargo test  --manifest-path programs/solana-staking/Cargo.toml     # npm run solana:staking:test
```

The unit tests cover the deterministic balance and reward math: stake increases
the balance, unstake decreases it, unauthorized signers are rejected, and
invalid state transitions (zero or over-balance unstake, bad instruction data,
corrupt account headers) fail safely.

## Deployment

The program is undeployed until an operator builds and ships it:

```sh
npm run solana:staking:build                # cargo build-sbf
npm run solana:staking:deploy:devnet        # solana program deploy (devnet)
npm run solana:staking:address              # print the deployed program ID
```

Publish the resulting program ID into `NEXT_PUBLIC_SOLANA_STAKING_PROGRAM_ID` to
enable the SOL staking flow in the frontend. Keep this program on
localnet/devnet until the instruction set, wallet flow, and audit scope are
complete.
