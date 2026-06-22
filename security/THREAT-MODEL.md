# TrustLedger Threat Model

A lightweight threat model for the on-chain system. Pairs with `CHECKLIST.md`.
Scope: the Foundry contracts in `contracts/` and the Solana escrow program. The
frontend is trusted only as a convenience layer — **every invariant must hold
on-chain**, because the contracts are reachable directly.

## Assets

1. **Escrowed funds** (ETH / USDC on EVM, SOL on Solana) — the primary asset.
2. **Arbitration / juror stakes** — collateral that backs honest dispute votes.
3. **Reputation scores** — influence future work; valuable to inflate or grief.
4. **Privileged roles** — owner/admin and any fee-recipient configuration.

## Actors & trust boundaries

| Actor            | Trust                        | Capability                                       |
| ---------------- | ---------------------------- | ------------------------------------------------ |
| Client           | Untrusted                    | Funds escrow, proposes/accepts, can dispute.     |
| Freelancer       | Untrusted                    | Delivers work, can dispute.                      |
| Juror            | Semi-trusted (staked)        | Votes on disputes; economically incentivized.    |
| Arbiter / owner  | Trusted (should be multisig) | Admin/config; must not be able to drain.         |
| Anonymous caller | Untrusted                    | Can call any external function directly.         |
| Frontend         | Untrusted boundary           | Convenience only; never an authorization source. |

## Threats (STRIDE-flavored)

- **Spoofing** — impersonating client/freelancer/juror. Mitigation: `msg.sender`
  checks per role and per escrow state; never `tx.origin`.
- **Tampering** — manipulating escrow state out of order (e.g. release before
  delivery). Mitigation: strict state machine; Checks-Effects-Interactions.
- **Repudiation** — disputing what happened. Mitigation: events on every state
  transition; on-chain record is canonical.
- **Information disclosure** — contract documents are off-chain (IPFS/Arweave);
  sensitive docs must be client-side encrypted (`src/lib/encryption.ts`) before
  upload. On-chain stores only the hash/URI.
- **Denial of service** — locking funds or blocking resolution. Mitigation:
  timeouts/cancel paths; no unbounded loops over user-controlled data;
  pull-over- push payments where practical.
- **Elevation of privilege** — gaining admin/drain powers. Mitigation: minimal
  admin surface, two-step ownership, no upgrade backdoor, multisig owner.

## Key invariants (must be enforced on-chain)

1. Contract solvency: tracked liabilities ≤ actual held balance, always.
2. Funds leave escrow only via an authorized party in a valid state.
3. A dispute resolves to exactly one outcome; no double payouts.
4. Jurors cannot be selected or bribed by a party to a dispute.
5. Reputation can only be written by authorized contracts/roles.
6. Fee/percentage parameters stay within hard-coded bounds.

## Out of scope (documented assumptions)

- Wallet/key compromise of an individual user.
- Off-chain storage (IPFS/Arweave/Pinata) availability — content addressing
  means integrity is verifiable on retrieval, but availability is not
  guaranteed.
- RPC provider censorship / liveness.
- Frontend hosting compromise — mitigated by the contracts being authoritative
  and by the CSP / headers in `src/security/headers.ts`, but not eliminated.

## Review cadence

Re-evaluate this model whenever a contract's external interface, fund-handling
path, role set, or the dispute/juror mechanism changes.
