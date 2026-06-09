# TrustLedger Frontend

`src/` is the TrustLedger Next.js application. It contains the browser UI,
server-side API routes, email helpers, wallet configuration, tests, and frontend
tooling.

## Architecture

- App Router pages live under `app/[locale]/`.
- Shared UI lives in `components/`.
- Domain helpers live in `lib/`.
- Cross-cutting React state lives in `contexts/`.
- Server-side email, notification, and oracle logic lives in `services/`.
- API routes live under `app/api/`.

## Routing

Routes are locale-prefixed through `next-intl`. Public flows include onboarding,
dashboard, create contract, client acceptance, freelancer review, arbitration,
juror workflows, FAQ, and not-found handling. API routes expose contract reads,
magic-link send/verify, notifications, cron deadline reminders, and oracle
rates.

## State Management

The app keeps state local unless it must cross a tree boundary. Wallet and RPC
state come from Reown AppKit, wagmi, viem, and React Query. Role state is
centralized in `contexts/RoleContext.tsx`; persisted wallet hints live in
`lib/lastWallet.ts`.

## Authentication And Authorization

Wallet connection establishes the active address. Magic-link helpers support
email-based flows. Privileged server routes are bearer-gated. Future off-chain
accounts should use EIP-712 wallet sign-in, short-lived JWTs, and route-level
authorization tied to the authenticated wallet.

## Wallet Integrations

`lib/wagmi.ts` configures Reown AppKit, wagmi networks, contract addresses, USDC
addresses, deployment metadata, and WalletConnect warnings. Only `NEXT_PUBLIC_*`
values are safe for client-side use.

## Component And UI Structure

Components use strict TypeScript, accessible labels, stable layout dimensions,
and existing Tailwind styling. Keep forms explicit, validate before submitting,
and surface contract/API errors through user-facing error states.

## API Integrations And Data Flow

The frontend reads contracts with viem/wagmi and can call server routes for
aggregated contract data, notifications, deadline scans, and oracle rates. API
routes normalize bigints to strings, validate inputs, and avoid returning raw
provider internals.

## Error Handling

Client code should show recoverable errors near the action that failed. Server
routes return JSON errors with appropriate status codes. Avoid leaking secrets,
stack traces, or PII. Oracle responses include a `stale` flag when cached data
is returned after provider failure.

## Accessibility

Use semantic controls, keyboard-reachable actions, visible focus states,
adequate contrast, localized copy, and form labels. Public routes are covered by
Playwright; expand coverage before marking Phase 7 testing complete.

## Performance

Prefer server-side aggregation for heavy reads, keep wallet logic out of
unrelated components, use bounded API calls, and run React Doctor after
component changes. Do not add client dependencies for server-only work.

## Frontend Security

Validate URLs and IPFS inputs, avoid unsafe HTML, protect `target="_blank"`
links with `rel`, keep secrets server-side, and treat wallet signatures as
explicit authorization boundaries. Review `SECURITY.md` before shipping auth,
wallet, or API changes.

## Developer Workflow

Run from `src/` unless noted:

| Task         | Command                  |
| ------------ | ------------------------ |
| Install      | `npm install`            |
| Dev server   | `npm run dev:frontend`   |
| Typecheck    | `npx tsc --noEmit`       |
| Lint         | `npm run lint:frontend`  |
| Unit tests   | `npm run test:unit`      |
| Coverage     | `npm run test:coverage`  |
| E2E          | `npm run test:e2e`       |
| Build        | `npm run build:frontend` |
| React Doctor | `npm run doctor`         |

Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` for WalletConnect relay wallets.
After local contract deployment, run the root `npm run sync:frontend:env`
command to write frontend contract addresses.
