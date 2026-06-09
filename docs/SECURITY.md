# Security

This document summarizes TrustLedger's technical security model, access control,
and known risk areas. Read it when reviewing contracts, threat modeling, or
preparing an audit.

## Audit Status

No third-party audit report is present in this repository as of 2026-06-08.
Treat the contracts as unaudited unless an external report is added.

## Access Control

| Contract             | Protected Action                     | Authority                                     |
| -------------------- | ------------------------------------ | --------------------------------------------- |
| `TrustLedger`        | Execute arbitration ruling           | `ARBITRATION` immutable address.              |
| `TrustLedger`        | Pause and unpause                    | One-time `pauser` address after `initPauser`. |
| `TrustLedger`        | Add allowed token after pauser setup | `pauser`.                                     |
| `TrustLedger`        | Rate participants                    | Escrow client or freelancer.                  |
| `Arbitration`        | Open dispute                         | `TrustLedger` immutable address.              |
| `JurorRegistry`      | Lock, unlock, slash                  | `ARBITRATION` immutable address.              |
| `ReputationRegistry` | Record rating                        | `TRUST_LEDGER` immutable address.             |

The contracts use custom role checks instead of a general owner role. One-time
initialization functions must be called carefully because they cannot be rerun
after a value is set.

## Escrow Risks

Native-token and ERC-20 escrows have different fee behavior. Native-token
disputes carve the juror fee pool from escrowed ETH. ERC-20 disputes require a
separate ETH fee payment because the escrowed asset is an ERC-20.

The token allowlist is permanent once a token is added. Review token behavior
before calling `addAllowedToken`, especially for fee-on-transfer, rebasing,
pausable, or upgradeable tokens.

## Arbitration Risks

When no VRF coordinator is set, juror selection uses `block.prevrandao`,
`block.timestamp`, and the dispute ID. This is pseudo-random and should not be
described as oracle-grade randomness.

Juror rewards are divided evenly among majority jurors. Remainders can remain in
the arbitration contract. Slashing reduces juror stake and reputation but does
not automatically remove all future eligibility unless the juror falls below
eligibility thresholds.

## Frontend And API Risks

Public frontend variables are visible in the browser. Never store private keys,
API bearer tokens, or HMAC secrets in `NEXT_PUBLIC_*` variables.

Magic links depend on `MAGIC_LINK_SECRET`. Notifications and cron routes depend
on bearer secrets. Rotate those secrets if they are exposed.

## CI Security Checks

`security.yml` runs Slither, TruffleHog, npm audit, CodeQL, and Semgrep. Some
checks are configured with `continue-on-error`, so review logs even when the
workflow succeeds.

Production dependency audits run with `--omit=dev`. The root full dependency
graph can include low-severity development-toolchain advisories tied to Hardhat
2 and ethers 5; npm currently reports the automatic fix as a breaking Hardhat 3
migration. Treat that migration as a planned toolchain upgrade, not an automatic
`npm audit fix --force`.

Security and CI jobs also run `npm run logs:check` where root dependencies are
installed, so local ignored audit logs do not grow without a visible policy.

## Reporting Vulnerabilities

Use the root
[Security Policy](https://github.com/kevinle3212/TrustLedger/blob/main/SECURITY.md)
for vulnerability reporting instructions.
