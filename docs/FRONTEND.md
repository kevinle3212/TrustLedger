# Frontend

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

This document explains the Next.js frontend under `src/`. Read it when changing
wallet connection, contract calls, API routes, email flows, file handling, or
frontend deployment.

## Stack

| Tool         | Version Source     | Purpose                              |
| ------------ | ------------------ | ------------------------------------ |
| Next.js      | `src/package.json` | App router frontend.                 |
| React        | `src/package.json` | UI runtime.                          |
| Reown AppKit | `src/package.json` | Wallet connection modal.             |
| wagmi        | `src/package.json` | React hooks and EVM client wiring.   |
| viem         | `src/package.json` | EVM ABI and RPC primitives.          |
| next-intl    | `src/package.json` | Internationalization.                |
| Sass         | `src/package.json` | Shared SCSS motion and layout layer. |
| Resend       | `src/package.json` | Email delivery.                      |
| Jest/RTL     | `src/package.json` | Component and utility unit tests.    |
| Playwright   | `src/package.json` | E2E browser tests.                   |

## Commands

Run frontend commands from `src/`.

| Task                       | Command                      |
| -------------------------- | ---------------------------- |
| Install dependencies       | `npm install`                |
| Start dev server           | `npm run dev:frontend`       |
| Build                      | `npm run build:frontend`     |
| Start production server    | `npm run start:frontend`     |
| Lint                       | `npm run lint:frontend`      |
| Fix lint and formatting    | `npm run fix:frontend`       |
| Run unit tests             | `npm run test:unit`          |
| Install Playwright browser | `npm run install:playwright` |
| Run E2E tests              | `npm run test:e2e`           |
| Run React Doctor           | `npm run doctor`             |

## Wallet Configuration

`src/lib/wagmi.ts` configures Reown AppKit and wagmi. Supported frontend
networks are:

| Network      |   Chain ID |
| ------------ | ---------: |
| Sepolia      | `11155111` |
| Arbitrum One |    `42161` |
| Base         |     `8453` |
| Optimism     |       `10` |

Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` for WalletConnect relay wallets.
Without it, injected wallets and Coinbase may still work, but relay-based mobile
and QR flows can fail.

## Contract Addresses

The frontend reads default and network-specific deployment variables from
`src/lib/wagmi.ts`. Run `npm run sync:frontend:env` after a local deploy to
write local addresses into `src/.env.local`. The Sepolia GitHub deployment
workflow writes Vercel environment variables automatically after deployment.

Read [Environment](ENVIRONMENT.md) for the full address variable list.

## Files And Storage

The frontend includes client-side encryption helpers in `src/lib/encryption.ts`.
The encryption format uses AES-256-GCM with PBKDF2-SHA256 and stores versioned
JSON metadata with salt, IV, and ciphertext.

IPFS upload support depends on `NEXT_PUBLIC_PINATA_JWT`. Legacy Pinata API key
variables exist in `.env.example`, but current source does not consume them.

## Live Contract Draft Collaboration

The create-contract page supports encrypted draft sharing before deployment.
`SecureDraftSessionPanel.tsx` lets parties write terms in Markdown, HTML, or
plain text, apply small formatting helpers, and share a link plus a separate
session key. The default share action creates a one-time encrypted draft link;
live co-editing starts only when the user explicitly chooses **Start live
room**.

Collaboration is intentionally plaintext-blind:

- The browser encrypts each draft snapshot with AES-GCM before it leaves the
  device.
- Snapshot share URLs contain `tl_draft` only; live-room URLs contain `tl_draft`
  and `tl_room`. The separate session key is never sent to the server.
- The connected wallet must match the encrypted allowlist before imported or
  live room snapshots decrypt.
- `useEncryptedDraftCollaboration.ts` debounces local edits, uses
  `BroadcastChannel` for same-browser tab sync, and polls
  `/api/create-collab/[roomId]` for cross-browser updates.
- `/api/create-collab/[roomId]` stores only short-lived encrypted snapshots with
  size limits, room validation, TTL pruning, and no plaintext contract terms.

This is a production-shaped collaboration seam without committing the project to
a vendor. For high-volume production rooms, replace the in-memory relay behind
the same encrypted snapshot contract with Redis, Postgres realtime, Durable
Objects, or a WebSocket service. Keep the browser-side encryption and wallet
allowlist checks intact.

## Email And Notifications

Magic links use HMAC-SHA256 tokens from `src/lib/magicLink.ts`. Email delivery
uses Resend through `src/services/email.ts`.

The notification service supports contract offer, work submitted, approval,
dispute, dispute resolution, rating, and deadline reminder messages. Deadline
reminders are scheduled by `src/vercel.json` at:

```yaml
0 9 * * *
```

The cron endpoint is `/api/cron/deadline-reminders`.

## Oracle Routes

The frontend package exposes display-rate oracle routes:

| Route                                  | Purpose                                                             |
| -------------------------------------- | ------------------------------------------------------------------- |
| `/api/oracle/rates?base=eth&quote=usd` | Validated exchange-rate lookup with TTL caching and stale fallback. |
| `/api/oracle/status`                   | Provider URL, TTL, supported pairs, and cache metadata.             |

Read [Oracle Architecture](ORACLE.md) before adding assets, providers, or
on-chain oracle consumption.

## Solana Helpers

`src/helpers/solana.ts` records the current Solana decision:
native-program-first support. It provides cluster defaults, Explorer URL
construction, and conservative public-key shape checks. Read
[Solana Support](SOLANA.md) before adding wallet or transaction code.

## Legal Localization Helpers

`src/helpers/legal-docs.ts` is the registry for legal document metadata. It
tracks source files, supported locales, translation status, and a constrained
translation prompt for machine-assisted drafts. Legal translations should remain
human-reviewed before publication; the helper exists to preserve Markdown shape
and prevent accidental changes to legal meaning.

## Internationalization

The frontend uses `next-intl`. Keep user-visible strings in the established
message structure and verify locale routing before moving text into components.

## Styling And Motion

Global styling lives in `src/app/globals.scss` and imports Tailwind v4,
`src/app/helpers.css`, and `src/app/app-desktop.scss`. The helper layer owns
reusable surfaces, text helpers, link underlines, accessibility helpers,
responsive clusters, and high-contrast behavior. `app-desktop.scss` owns shared
layout widths, page headers, workspace grids, and responsive shell behavior. Use
Tailwind for component structure and helper classes for repeated theme,
interaction, and motion states.

Home-page motion currently includes contract phase transitions, progress
feedback, signature verification feedback, CTA hover treatment, value lift,
status pulse, document hash shimmer, orbit motion, link underline motion, and
protection-list interaction. Every new animation must keep content visible by
default and honor `prefers-reduced-motion`.

## FAQ And Recovery Routes

The product FAQ route is `app/[locale]/faq/page.tsx`. The custom 404 experience
is implemented by `app/[locale]/not-found.tsx` for localized app routes and
`app/not-found.tsx` for root-level fallback routes. Keep FAQ links available in
the top navigation and footer so users can recover from wallet, route, and
transaction issues without leaving the app.

## Deployment

The root `deploy.yml` workflow runs `vercel deploy --prod` from `src/` after
writing contract address variables to Vercel. For local frontend-only
deployment, use:

```bash
cd src
npm run build:frontend
npm run start:frontend
```

The canonical deployed frontend route is
`https://trustledger-zeta.vercel.app/en`.
