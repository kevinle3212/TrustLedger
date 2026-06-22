# Contract Security Review Checklist

Run before merging contract changes and again before any deployment. Tick each
item or record why it does not apply. Pairs with `THREAT-MODEL.md`.

## Tooling gates

- [ ] `cd contracts && forge build` succeeds with no warnings.
- [ ] `cd contracts && forge test` green, including fuzz and invariant tests.
- [ ] `forge fmt --check` and `forge lint` clean.
- [ ] `slither contracts --config-file security/slither.config.json` reviewed;
      every High/Medium triaged (fixed or justified in the PR).
- [ ] `npx solhint 'contracts/src/**/*.sol'` clean.
- [ ] Gas snapshot (`.gas-snapshot`) reviewed for unexpected regressions.

## Funds & accounting (TrustLedger escrow)

- [ ] Checks-Effects-Interactions order on every external call / transfer.
- [ ] `nonReentrant` (or equivalent) on every state-changing payable / withdraw
      path.
- [ ] ETH and ERC-20 (USDC) paths both covered; no assumption of 18 decimals.
- [ ] ERC-20 transfers use a safe wrapper (return-value checked);
      fee-on-transfer and non-standard tokens considered or explicitly out of
      scope.
- [ ] No funds can be locked permanently (timeout / cancel / refund path
      exists).
- [ ] Sum of internal balances can never exceed the contract's actual balance.

## Access control & roles

- [ ] Every privileged function has an explicit modifier / role check.
- [ ] Client vs. freelancer vs. arbiter vs. juror permissions enforced per
      state.
- [ ] Owner/admin powers documented; no hidden upgrade or drain capability.
- [ ] Two-step ownership transfer where ownership exists.

## Arbitration, jurors & reputation

- [ ] Juror selection is not manipulable by the disputing parties.
- [ ] Voting cannot be double-counted; quorum and tie rules are total.
- [ ] Slashing/penalty math cannot underflow or grief honest jurors.
- [ ] Reputation updates are gated to authorized callers only.
- [ ] Arbitration fee percentage bounds enforced on-chain (not just in the UI).

## Arithmetic & inputs

- [ ] Solidity ^0.8 overflow checks relied on; any `unchecked` block justified.
- [ ] Basis-point / percentage inputs range-checked on-chain.
- [ ] Deadlines/durations validated; no `block.timestamp` assumptions that
      enable grinding within miner tolerance.
- [ ] Address inputs checked against the zero address where it would brick
      state.

## External interactions & oracles

- [ ] No unbounded loops over user-controlled arrays (DoS via gas).
- [ ] Return values of all low-level calls checked.
- [ ] No reliance on `tx.origin` for authorization.
- [ ] Events emitted for every state transition the frontend/indexers depend on.

## Solana escrow (programs/solana-escrow)

- [ ] All accounts validated (owner, signer, PDA seeds) — no trust of passed
      accounts.
- [ ] Arithmetic uses checked math; no silent wrapping.
- [ ] Rent-exemption and account-close (lamport drain) handled correctly.
- [ ] Instruction data deserialization bounds-checked.

## Deployment

- [ ] Constructor/init args reviewed; addresses match the target network.
- [ ] Verified source published on the block explorer.
- [ ] Deploy keys are hardware/HSM-backed; not committed anywhere.
- [ ] Post-deploy: ownership/admin set to the intended multisig.
