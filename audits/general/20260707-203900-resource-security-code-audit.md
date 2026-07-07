# Resource, Security, and Code Audit

| Field              | Value                        |
| ------------------ | ---------------------------- |
| Audit type         | general                      |
| Timestamp (UTC)    | 2026-07-07T20:39:00Z         |
| Git branch         | chore/docs-and-signin-nonces |
| Commit hash        | not-run: git not permitted   |
| Repository version | 0.1.0                        |
| Auditor            | GPT-5.5                      |

## Scope

Reviewed route resource behavior, wallet/session compatibility,
security-sensitive API boundaries, dependency audit status, and redundant root
package scripts. Browser-device profiling was not run in Safari, Firefox, Edge,
Brave, Arc, or mobile wallets during this pass.

## Files Inspected

- `AGENT-CONTEXT.md`
- `README.md`
- `package.json`
- `src/package.json`
- `src/app/[locale]/_components/HomeLoader.tsx`
- `src/app/[locale]/create/_lib/useCreatePageState.ts`
- `src/app/[locale]/faq/page.tsx`
- `src/app/[locale]/juror/_components/JurorPageInner.tsx`
- `src/app/[locale]/layout.tsx`
- `src/app/[locale]/reputation/_components/ReputationPageInner.tsx`
- `src/app/api/accounts/challenge/route.ts`
- `src/app/api/accounts/session/route.ts`
- `src/app/api/ipfs/pin/route.ts`
- `src/components/ConnectButton.tsx`
- `src/components/FaqContent.tsx`
- `src/components/Navbar.tsx`
- `src/components/Providers.tsx`
- `src/components/ReactScanMonitor.tsx`
- `src/components/WalletRequiredPage.tsx`
- `src/hooks/useRecentDisputeIds.ts`
- `src/lib/accountSession.ts`
- `src/lib/appkit.ts`
- `src/lib/authedFetch.ts`
- `src/lib/ipfs.ts`
- `src/lib/lastWallet.ts`
- `src/lib/wagmi.ts`
- `src/security/accountRateLimit.ts`
- `src/services/accountRequest.ts`
- `src/services/offchainAccounts.ts`
- `src/tests/unit/security-routes.test.ts`

## Issues Found

| #   | Severity | Issue                                                                      | Location                                                | Status |
| --- | -------- | -------------------------------------------------------------------------- | ------------------------------------------------------- | ------ |
| 1   | Medium   | Loader animation frames continued while waiting for later milestones.      | `src/app/[locale]/_components/HomeLoader.tsx`           | Fixed  |
| 2   | Medium   | Juror page could issue contract reads against zero-address deployments.    | `src/app/[locale]/juror/_components/JurorPageInner.tsx` | Fixed  |
| 3   | High     | IPFS pinning route accepted anonymous uploads against server Pinata quota. | `src/app/api/ipfs/pin/route.ts`                         | Fixed  |
| 4   | Medium   | Account challenge issuance lacked the account retry gate used by sessions. | `src/app/api/accounts/challenge/route.ts`               | Fixed  |
| 5   | Low      | Root package scripts kept duplicate aliases and repeated cache deletion.   | `package.json`                                          | Fixed  |

## Fixes Applied

- **#1** — Parked the `HomeLoader` animation-frame loop when the displayed
  progress reaches the current target, then rescheduled it only when a real
  milestone advances.
- **#2** — Gated juror and arbitration reads when their configured addresses are
  unset, and replaced unavailable ETH staking writes with the existing
  unavailable network message.
- **#3** — Required an existing off-chain account bearer session before proxying
  uploads to Pinata, and updated the create flow to acquire that session before
  pinning.
- **#4** — Applied the account security retry limiter to challenge issuance and
  returned a `Retry-After` header on `429` responses.
- **#5** — Removed redundant root script aliases for frontend unit tests, Rust
  build, and duplicate TypeChain cache clearing. Updated the README command.

## Files Modified

- `README.md`
- `package.json`
- `audits/general/20260707-203900-resource-security-code-audit.md`
- `src/app/[locale]/_components/HomeLoader.tsx`
- `src/app/[locale]/create/_lib/useCreatePageState.ts`
- `src/app/[locale]/juror/_components/JurorPageInner.tsx`
- `src/app/api/accounts/challenge/route.ts`
- `src/app/api/ipfs/pin/route.ts`
- `src/tests/unit/security-routes.test.ts`

## Rationale

The fixes target verified resource or abuse paths without removing UI features.
Wallet functionality remains in the existing wagmi/Reown architecture, and IPFS
uploads still work for connected users after the normal wallet sign-in flow.

## Recommendations

- Run a real browser sweep for Chrome, Safari, Firefox, Edge, Brave, Arc, and
  mobile wallets after a local or preview URL is available.
- Run `npm run secrets:check` only after explicit permission for its `git`
  operations, because the active home rules prohibit autonomous `git` commands.
- Run React Doctor and Playwright wallet/browser scenarios before release.

## Follow-up Actions

- [ ] Profile route transitions with production build instrumentation.
- [ ] Run `npm run lint:knip` to catch any pre-existing unused exports.
- [ ] Run wallet E2E tests with `NEXT_PUBLIC_E2E_MOCK_WALLET=1`.
- [ ] Manually verify MetaMask, Coinbase Wallet, WalletConnect, Phantom, and
      Tangem on a deployed preview.

## Remaining Work

No live browser/device profiling was completed in this pass. Gitleaks, GitHub
code-scanning alerts, Dependabot alerts, and git metadata capture were not run
because no specific `git` or `gh` command permission was granted.

## Verification Performed

### Commands Executed

```bash
rtk graphify query "resource freezes route navigation FAQ juror wallet browser security audit package scripts redundant code Next.js TrustLedger"
rtk npm run typecheck:frontend
rtk npm audit --omit=dev
rtk npm audit --omit=dev
rtk npm run test:unit -- security-routes.test.ts
rtk npx tsc --noEmit
rtk npm run lint:frontend
rtk npm run doctor
rtk npm run lint:md
rtk graphify update .
```

### Test Results

- `npm run test:unit -- security-routes.test.ts`: passed, 3 tests.
- `npx tsc --noEmit`: passed with no TypeScript errors.
- `npm run lint:frontend`: passed after targeted Prettier formatting.
- `npm run doctor`: passed, React Doctor score `100 / 100`.
- `npm run lint:md`: passed with 0 markdownlint errors.
- Root production `npm audit --omit=dev`: found 0 vulnerabilities.
- Frontend production `npm audit --omit=dev`: found 0 vulnerabilities.
- `graphify update .`: passed and refreshed `graphify-out`.

### Build Status

Production build not run during this pass. Focused TypeScript and route tests
passed.

## Sign-off

- Auditor: GPT-5.5
- Reviewed by:
- Date: 2026-07-07
