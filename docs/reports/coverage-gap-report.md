# Coverage Gap Report

<a id="top"></a>

<!-- docs-nav:start -->
[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)
<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->
- [Current Evidence](#current-evidence)
- [Known Critical Gaps](#known-critical-gaps)
- [Implemented In This Change](#implemented-in-this-change)
- [Recommended Future Tests](#recommended-future-tests)
<!-- docs-toc:end -->

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

Date: 2026-06-09

## Current Evidence

<!-- docs-section-nav:start -->
[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)
<!-- docs-section-nav:end -->

- Frontend unit tests exist under `src/tests/unit/`.
- Frontend Playwright tests exist under `src/tests/public-routes.spec.ts`.
- Hardhat tests exist under `test/`.
- Foundry unit, fuzz, and fork tests exist under `contracts/test/`.
- New oracle unit coverage was added in `src/tests/unit/oracle.test.ts`.
- New health-check unit coverage was added in `src/tests/unit/health.test.ts`.
- New legal helper coverage was added in `src/tests/unit/legal-docs.test.ts`.
- New Solana helper coverage was added in
  `src/tests/unit/solana-helper.test.ts`.
- New interactive home preview coverage was added in
  `src/tests/unit/interactive-contract-preview.test.tsx`.

Latest frontend coverage from `cd src && npm run test:coverage`:

| Metric     | Current |
| ---------- | ------- |
| Statements | 98.07%  |
| Branches   | 80.12%  |
| Functions  | 100%    |
| Lines      | 98.07%  |

Solidity coverage percentages still need a selected contract coverage command
and threshold policy. Phase 7 Item 3 is complete for the current sweep, while
the future gaps below remain useful hardening work before mainnet.

## Known Critical Gaps

<!-- docs-section-nav:start -->
[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)
<!-- docs-section-nav:end -->

| Area                    | Gaps                                                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend components     | Full dashboard, create, acceptance, arbitration, juror, wallet, and error-boundary coverage is incomplete.                                                                                        |
| Hooks/providers/state   | Role context, wallet persistence, inactivity logout, theme, and AppKit provider edge cases need broader tests.                                                                                    |
| Forms                   | Contract creation, acceptance/rejection, review, upload, encryption, and validation failure states need complete coverage.                                                                        |
| Authentication          | Magic-link send/verify, replay, expiry, malformed token, and future EIP-712 sign-in flows need integration tests.                                                                                 |
| Authorization           | Bearer-gated notification and cron routes need route-level success/failure tests.                                                                                                                 |
| Wallet integrations     | WalletConnect missing-project-id behavior, chain switching, read/write failures, and disconnected states need coverage.                                                                           |
| Backend services        | Email, notifications, oracle, API validation, and error normalization need higher route coverage.                                                                                                 |
| Blockchain reads/writes | Contract read/write wrappers, event handling, indexing assumptions, oracle interactions, and failure paths need integration coverage.                                                             |
| Integrations            | IPFS, Arweave, email provider, wallet providers, RPC providers, and price providers need mocked failure-path tests.                                                                               |
| E2E                     | Onboarding, registration, login, wallet connection, reputation lookup, contract creation/signing/acceptance, disputes, oracle flows, profile management, and dashboards need end-to-end coverage. |

## Implemented In This Change

<!-- docs-section-nav:start -->
[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)
<!-- docs-section-nav:end -->

- `src/services/oracle.ts` unit tests for symbol validation, provider parsing,
  cache reuse, stale fallback, and malformed payload rejection.
- `src/services/health.ts` unit tests for healthy config, missing required
  config, and invalid public app URL handling.
- `src/helpers/legal-docs.ts` unit tests for locale fallback, review status, and
  translation prompt guardrails.
- `src/helpers/solana.ts` unit tests for native support mode, cluster fallback,
  public-key shape checks, and Explorer URL generation.
- `src/app/[locale]/_components/InteractiveContractPreview.tsx` React Testing
  Library tests for direct phase selection and CTA-driven phase advancement.

## Recommended Future Tests

<!-- docs-section-nav:start -->
[Home](../Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)
<!-- docs-section-nav:end -->

- Add API route tests for `/api/oracle/rates`.
- Add Jest tests for notification route authorization and cron recipient
  resolution.
- Add Playwright wallet-mocked flows for create, accept, submit, dispute, and
  review journeys.
- Add Solidity tests for oracle-dependent stablecoin payment scenarios before
  any on-chain oracle consumption is introduced.
- Add coverage thresholds only after current percentages are measured and flaky
  integration gaps are removed.
