# Frontend

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

## Internationalization

The frontend uses `next-intl`. Keep user-visible strings in the established
message structure and verify locale routing before moving text into components.

## Styling And Motion

Global styling lives in `src/app/globals.scss` and imports
`src/app/app-desktop.scss`. The SCSS layer owns shared layout widths, focus
treatments, skeleton shimmer, active status emphasis, and reduced-motion
fallbacks. Use the existing Tailwind utility vocabulary for component structure
and the SCSS utility classes for shared interaction and motion states.

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
