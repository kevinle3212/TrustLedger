# Security Policy

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

TrustLedger is unaudited testnet software. Do not deploy mainnet funds until the
contract, frontend, backend routes, dependencies, and operational controls have
passed independent review.

## Vulnerability Disclosure

Open a private GitHub security advisory if you have access. Otherwise contact
the maintainers privately before publishing details. Include affected files,
steps to reproduce, impact, logs, transaction hashes, and proof-of-concept code.

## Threat Model

Primary assets are escrowed funds, juror stake, reputation records, private
keys, API secrets, notification recipient data, uploaded document references,
and future profile/session data. Primary adversaries include malicious
counterparties, compromised wallets, dishonest jurors, RPC/provider failures,
phishing sites, dependency attackers, and leaked CI/deployment secrets.

## Trust Boundaries

- Smart contracts custody funds and enforce escrow/arbitration state.
- Wallets hold private keys and approve all on-chain writes.
- Frontend code is untrusted presentation logic.
- API routes are trusted for server-only secrets and non-custodial aggregation.
- Oracle data is supporting display data unless future audited contracts consume
  it through a hardened on-chain oracle path.
- External providers include RPC nodes, email services, IPFS gateways, Vercel,
  npm, GitHub Actions, WalletConnect/Reown, and price-data providers.

## Secure SDLC

Use scoped branches, code review, CI, dependency review, static checks, tests,
and documentation updates for every security-relevant change. Do not mark
roadmap security items complete without objective evidence.

## Dependency Management

Run root and frontend audits before release, review transitive chains, prefer
upgrades over overrides, and document ecosystem-blocked findings in
`docs/reports/dependency-health-report.md`. Restricted environments may block
`npm audit` because it sends dependency metadata to npm.

### Phase 7 Sweep Notes (2026-06-11)

- Hardened privileged bearer-token checks by centralizing exact token matching
  in `src/services/bearerAuth.ts` with `crypto.timingSafeEqual`. The
  notification API, deadline-reminder cron route, admin auth, and health auth
  now use the same helper.
- Hardened outbound notification email rendering by escaping dynamic
  notification fields and email shell text, while constraining CTA links to
  `http:` or `https:` URLs. This covers contract IDs, optional detail text,
  titles, footers, labels, and href attributes before provider delivery.
- Normalized remaining `target="_blank"` links to `rel="noopener noreferrer"`.
- Local checks run: focused bearer/email Jest tests, frontend lint, frontend
  typecheck, `npm run secrets:check`, duplicate-path sweep, and root production
  `npm audit --omit=dev` with zero reported vulnerabilities.
- Follow-up hardening installed and configured `gitleaks` as the local
  git-history and staged-diff secret scanner. The only historical finding was a
  public WalletConnect/Reown wallet registry ID in `src/lib/walletIds.ts`,
  recorded as a fingerprint-level false positive in `.gitleaksignore`.
- Not completed from this environment: frontend npm audit and full root audit
  were blocked by approval policy because they disclose dependency metadata to
  the npm registry. Phase 7 remains open until those external scans and the full
  contract/static-analysis evidence are completed.

## Secrets Management

Never commit `.env`, private keys, seed phrases, API tokens, Vercel tokens,
Resend keys, RPC credentials, `NOTIFICATIONS_SECRET`, or `CRON_SECRET`. Only
`NEXT_PUBLIC_*` variables may reach the browser. Rotate exposed secrets
immediately and invalidate affected sessions or deployments.

Local secret scanning has two layers:

- `npm run secrets:paths` blocks forbidden sensitive paths and common unredacted
  secret patterns in tracked and staged files.
- `npm run secrets:gitleaks` scans git history with `.gitleaks.toml`, and
  `npm run secrets:gitleaks:staged` scans staged diffs for hooks.

Do not add broad gitleaks allowlists. Use `.gitleaksignore` only for
fingerprint-level false positives after confirming the value is public and
non-secret.

## Wallet Security

The UI must clearly show the connected wallet, network, contract address, and
transaction intent before writes. Do not ask users for seed phrases. Treat
WalletConnect project IDs as public identifiers, not secrets.

## Smart Contract Security

Review access control, reentrancy, arithmetic, fee accounting, juror slashing,
appeals, replay resistance, event coverage, and gas-sensitive flows. Run Hardhat
tests, Foundry tests, fuzz tests, fork tests, forge fmt/lint, and static
analysis before mainnet.

## Authentication And Authorization

Current privileged routes use bearer secrets. Future account auth should use
EIP-712 wallet sign-in, short-lived JWTs, explicit expiry, replay protection,
constant-time secret comparison, and address-bound authorization for off-chain
writes.

## Encryption And Session Management

Private document contents should remain encrypted client-side or through a
reviewed end-to-end model. Future messaging must use audited encryption
primitives and avoid server-readable plaintext. Session cookies should be
`HttpOnly`, `Secure`, `SameSite=Lax` or stricter, and short-lived.

## Audit Logging

Log security-relevant server events with timestamps, route names, status, and
non-sensitive identifiers. Do not log bearer secrets, private keys, raw magic
links, full email bodies, or decrypted document contents.

## Monitoring And Alerting

`GET /api/health` provides a secret-safe deployment smoke check for runtime,
configuration, and oracle-source status. Before production, connect it and the
application logs to an external alert sink, RPC health checks, oracle freshness
checks, dependency alert routing, and on-chain event monitors for disputes,
large payouts, slashing, and abnormal failure rates.

## Supply Chain Security

Pin toolchain versions where practical, use lockfiles, keep GitHub Actions at
reviewed major versions, avoid install scripts unless needed, and review any new
dependency for maintainer health, license, transitive risk, and browser bundle
impact.

## Blockchain Risks

Users face chain reorgs, RPC outages, MEV, token approval risk, bridge risk,
stale oracle data, gas spikes, wallet compromise, and contract bugs. Stablecoin
or cross-chain expansion must be reviewed before mainnet.

## Incident Response

1. Triage severity and affected assets.
2. Preserve logs and transaction evidence.
3. Disable affected API routes, cron jobs, or deployments if needed.
4. Rotate secrets and revoke provider tokens.
5. Publish user guidance when funds, PII, or signatures may be affected.
6. Patch, test, review, deploy, and document the root cause.

## Recovery Procedures

Keep deployment addresses, ABI artifacts, environment templates, and runbooks
current. For off-chain incidents, restore from verified backups and reconcile
against chain state. For contract incidents, follow the documented governance or
pause/mitigation process if such controls exist.

## Mainnet Readiness Checklist

- Third-party smart contract audit complete.
- Dependency and deprecation reports reviewed.
- Secrets scanned and rotated where needed.
- CI, hooks, lint, typecheck, tests, coverage, and builds pass.
- Monitoring, alerting, and incident response are live; `GET /api/health` is
  wired to an external uptime monitor.
- Oracle, RPC, email, IPFS, and wallet-provider failure paths are tested.
- Phase 7 testing item remains open until comprehensive coverage evidence proves
  it is complete.
