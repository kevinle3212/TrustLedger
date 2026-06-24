# Security

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Audit Status](#audit-status)
- [Access Control](#access-control)
- [Escrow Risks](#escrow-risks)
- [Arbitration Risks](#arbitration-risks)
- [Frontend And API Risks](#frontend-and-api-risks)
- [CI Security Checks](#ci-security-checks)
- [Security Tooling Layout](#security-tooling-layout)
- [Reporting Vulnerabilities](#reporting-vulnerabilities)

<!-- docs-toc:end -->

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../CREDITS.md).

This document summarizes TrustLedger's technical security model, access control,
and known risk areas. Read it when reviewing contracts, threat modeling, or
preparing an audit.

## Audit Status

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

No third-party audit report is present in this repository as of 2026-06-08.
Treat the contracts as unaudited unless an external report is added.

## Access Control

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

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

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Native-token and ERC-20 escrows have different fee behavior. Native-token
disputes carve the juror fee pool from escrowed ETH. ERC-20 disputes require a
separate ETH fee payment because the escrowed asset is an ERC-20.

The token allowlist is permanent once a token is added. Review token behavior
before calling `addAllowedToken`, especially for fee-on-transfer, rebasing,
pausable, or upgradeable tokens.

## Arbitration Risks

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

When no VRF coordinator is set, juror selection uses `block.prevrandao`,
`block.timestamp`, and the dispute ID. This is pseudo-random and should not be
described as oracle-grade randomness.

Juror rewards are divided evenly among majority jurors. Remainders can remain in
the arbitration contract. Slashing reduces juror stake and reputation but does
not automatically remove all future eligibility unless the juror falls below
eligibility thresholds.

## Frontend And API Risks

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Public frontend variables are visible in the browser. Never store private keys,
API bearer tokens, or HMAC secrets in `NEXT_PUBLIC_*` variables.

Magic links depend on `MAGIC_LINK_SECRET`. Notifications and cron routes depend
on bearer secrets. Bearer-token checks use exact constant-time comparison
through `src/services/bearerAuth.ts`; rotate those secrets if they are exposed.

Outbound lifecycle emails escape dynamic notification values before inserting
them into HTML and only allow HTTP(S) CTA links. Keep any future email templates
on the shared `emailShell` and notification rendering helpers so contract IDs,
status details, titles, labels, footers, and href attributes stay sanitized.

`GET /api/health/runtime` is public and should only report that the Next.js API
runtime responds. `GET /api/health` is admin-gated with `HEALTH_CHECK_TOKEN`,
`ADMIN_API_TOKEN`, or `HEALTH_CHECK_ALLOWED_IPS` because it reports operational
configuration status.

`/[locale]/admin` and `/api/admin/*` are restricted operator surfaces. The
initial dashboard is read-only and uses signed HTTP-only sessions, PBKDF2
password hashes, optional IP allowlisting, optional wallet allowlist binding,
and a transition bearer token for server callers. Do not commit plaintext admin
passwords or enable mutating admin actions without persistent audit trails,
explicit confirmations, authorization tests, and updated threat modeling.

## CI Security Checks

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`security.yml` runs Slither, TruffleHog, Gitleaks, npm audit, CodeQL, and
Semgrep. Some checks are configured with `continue-on-error`, so review logs
even when the workflow succeeds.

Production dependency audits run with `--omit=dev`. The root full dependency
graph can include low-severity development-toolchain advisories tied to Hardhat
2 and ethers 5; npm currently reports the automatic fix as a breaking Hardhat 3
migration. Treat that migration as a planned toolchain upgrade, not an automatic
`npm audit fix --force`.

Security and CI jobs also run `npm run logs:check` and `npm run tmp:check` where
root dependencies are installed, so local ignored audit logs do not grow without
a visible policy.

Sensitive file protection is enforced in layers. `npm run secrets:check` runs
the custom sensitive-path guard and `gitleaks git` against repository history.
Pre-commit also runs `npm run secrets:gitleaks:staged` against staged changes.
The custom guard blocks tracked and staged `.env` files, Solana
`target/deploy/*.json` keypairs, private-key-looking filenames, and common
unredacted secret patterns. Gitleaks uses `.gitleaks.toml`; prefer scoped
allowlists there for stable public constants, with exact value, rule, and file
constraints. Use `.gitleaksignore` fingerprints only for historical findings
that cannot be safely scoped in config, because commit-SHA fingerprints are
brittle in shallow CI checkouts. The guard runs in local hooks,
`npm run quality`, and CI. Repository admins should also enable the importable
GitHub ruleset in [GitHub Rulesets](GITHUB-RULESETS.md), with secret scanning
and push protection active, because local hooks can be bypassed.

Privacy analytics are opt-in and aggregate-only. The browser beacon and server
collector must both be enabled by environment variables, and `/api/health`
reports a warning if the public and server flags disagree. The collector honors
Do Not Track and Global Privacy Control, strips query strings, and stores no raw
IP addresses, wallet addresses, user agents, emails, documents, session keys, or
private wallet material. Update privacy and cookie disclosures before enabling
analytics in production.

## Security Tooling Layout

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Security helpers and review material are split by tier so each side has one
place to look.

| Location                                                                             | Scope                                                     | Key contents                                                                                                                                          |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`security/`](https://github.com/kevinle3212/TrustLedger/tree/main/security)         | Contracts and on-chain backend (Foundry/Solidity, Solana) | `slither.config.json` static-analysis config, `CHECKLIST.md` pre-merge/pre-deploy review gate, `THREAT-MODEL.md` assets/actors/invariants.            |
| [`src/security/`](https://github.com/kevinle3212/TrustLedger/tree/main/src/security) | Frontend (Next.js client and proxy)                       | `clipboard`, `headers` (CSP), `rateLimit`, `csrf`, `sanitize`, `address` helpers plus a barrel that re-exports `lib/validation` and `lib/encryption`. |

The frontend toolkit is wired in, not speculative: `headers` and `rateLimit`
back `src/proxy.ts`, and `clipboard` backs every copy-to-clipboard control.
Reach for `@/security` instead of hand-rolling clipboard, header, sanitization,
or address logic. Each directory has its own `README.md` with the full module
map.

Before merging a contract change, complete the
[`security/CHECKLIST.md`](https://github.com/kevinle3212/TrustLedger/blob/main/security/CHECKLIST.md)
gate and re-check
[`security/THREAT-MODEL.md`](https://github.com/kevinle3212/TrustLedger/blob/main/security/THREAT-MODEL.md)
whenever a fund-handling path, role set, or the dispute/juror mechanism changes.

## Reporting Vulnerabilities

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Use the root
[Security Policy](https://github.com/kevinle3212/TrustLedger/blob/main/SECURITY.md)
for vulnerability reporting instructions. Use [Legal And Compliance](LEGAL.md)
when a security-sensitive change also affects privacy, user obligations, content
handling, risk disclosures, or other compliance-sensitive policy language.
