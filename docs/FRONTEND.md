# Frontend

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Stack](#stack)
- [Commands](#commands)
- [Available Pages](#available-pages)
- [Wallet Configuration](#wallet-configuration)
- [Contract Addresses](#contract-addresses)
- [Files And Storage](#files-and-storage)
- [Live Contract Draft Collaboration](#live-contract-draft-collaboration)
- [Email And Notifications](#email-and-notifications)
- [Privacy Analytics](#privacy-analytics)
- [Oracle Routes](#oracle-routes)
- [Solana Helpers](#solana-helpers)
- [Legal Localization Helpers](#legal-localization-helpers)
- [Internationalization](#internationalization)
- [Styling And Motion](#styling-and-motion)
- [Lifecycle Countdown UI](#lifecycle-countdown-ui)
- [FAQ And Recovery Routes](#faq-and-recovery-routes)
- [Deployment](#deployment)
- [Authors and Contributors](#authors-and-contributors)
- [Legal](#legal)

<!-- docs-toc:end -->

> **Kevin K. Le** ([LinkedIn](https://linkedin.com/in/lekevin1)) — Founder,
> Founding Engineer, and Current Lead Engineer; Software Engineer at the Oregon
> Blockchain Group, University of Oregon.
>
> **Kellen Snider** — Founding Engineer; Software Engineer at the Oregon
> Blockchain Group, University of Oregon. His vision, ideas, and dedication
> during TrustLedger's Ethereum development were invaluable to the codebase we
> build on today.
>
> See [`CREDITS.md`](CREDITS.md).

This document explains the Next.js frontend under `src/`. Read it when changing
wallet connection, contract calls, API routes, email flows, file handling, or
frontend deployment.

## Stack

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

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

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

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

## Available Pages

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

All user-facing routes are locale-prefixed. The canonical production base is
`https://trustledger-zeta.vercel.app`. English links use the `/en` prefix.

| Page              | Production URL                                                                    | Access | Description                                                                                               |
| ----------------- | --------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| Home              | [/en](https://trustledger-zeta.vercel.app/en)                                     | Public | Landing page with contract phase walkthrough, value proposition, and chain-mode preview toggle.           |
| About             | [/en/about](https://trustledger-zeta.vercel.app/en/about)                         | Public | Project background, contributors, and live age timer counting up from launch.                             |
| Analytics         | [/en/analytics](https://trustledger-zeta.vercel.app/en/analytics)                 | Public | Privacy-respecting event dashboard powered by the `/api/analytics/events` collector.                      |
| Arbitration       | [/en/arbitration/\[id\]](https://trustledger-zeta.vercel.app/en/arbitration)      | Wallet | Per-dispute juror panel: commit-reveal voting, evidence submission, appeals, and reward claims.           |
| Client Accept     | [/en/client/accept](https://trustledger-zeta.vercel.app/en/client/accept)         | Token  | Magic-link page for clients to review and fund a proposed contract.                                       |
| Create Contract   | [/en/create](https://trustledger-zeta.vercel.app/en/create)                       | Wallet | Contract creation wizard with encrypted live draft collaboration and IPFS attachment support.             |
| Dashboard         | [/en/dashboard](https://trustledger-zeta.vercel.app/en/dashboard)                 | Wallet | Contract management hub: active, submitted, disputed, and resolved contracts for clients and freelancers. |
| FAQ               | [/en/faq](https://trustledger-zeta.vercel.app/en/faq)                             | Public | Product FAQ and wallet/transaction recovery guide.                                                        |
| Freelancer Review | [/en/freelancer/review](https://trustledger-zeta.vercel.app/en/freelancer/review) | Token  | Magic-link page for freelancers to review a client-proposed contract before accepting.                    |
| Juror Dashboard   | [/en/juror](https://trustledger-zeta.vercel.app/en/juror)                         | Wallet | Juror staking, eligibility status, and open-dispute list.                                                 |
| Legal Index       | [/en/legal](https://trustledger-zeta.vercel.app/en/legal)                         | Public | Index of all legal documents (terms, privacy policy, cookie policy, etc.).                                |
| Legal Document    | [/en/legal/\[slug\]](https://trustledger-zeta.vercel.app/en/legal/terms)          | Public | Individual localized legal document (e.g., `/en/legal/terms`, `/en/legal/privacy`).                       |
| Reputation        | [/en/reputation](https://trustledger-zeta.vercel.app/en/reputation)               | Public | Wallet reputation lookup, rating history, and recovery-mode status.                                       |
| Status            | [/en/status](https://trustledger-zeta.vercel.app/en/status)                       | Public | GitHub analytics, deployment health, and project activity metrics.                                        |
| Account           | [/en/account](https://trustledger-zeta.vercel.app/en/account)                     | Wallet | Connected wallet session overview and notification settings.                                              |
| Admin             | [/en/admin](https://trustledger-zeta.vercel.app/en/admin)                         | Admin  | Read-only admin dashboard (requires magic-link session).                                                  |
| Admin Sign-In     | [/en/admin/sign-in](https://trustledger-zeta.vercel.app/en/admin/sign-in)         | Public | Magic-link sign-in entry point for the admin dashboard.                                                   |

**Access key:**

- **Public** — no wallet or auth required.
- **Wallet** — connected wallet required; wallet-check gating is enforced
  client-side.
- **Token** — HMAC magic-link token required (delivered via email).
- **Admin** — active admin magic-link session required; server-side redirect
  enforced.

## Wallet Configuration

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

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

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The frontend reads default and network-specific deployment variables from
`src/lib/wagmi.ts`. Run `npm run sync:frontend:env` after a local deploy to
write local addresses into `src/.env.local`. The Sepolia GitHub deployment
workflow writes Vercel environment variables automatically after deployment.

Read [Environment](ENVIRONMENT.md) for the full address variable list.

## Files And Storage

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The frontend includes client-side encryption helpers in `src/lib/encryption.ts`.
The encryption format uses AES-256-GCM with PBKDF2-SHA256 and stores versioned
JSON metadata with salt, IV, and ciphertext.

IPFS upload support depends on `NEXT_PUBLIC_PINATA_JWT`. Legacy Pinata API key
variables exist in `.env.example`, but current source does not consume them.

## Live Contract Draft Collaboration

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The create-contract page supports encrypted draft sharing before deployment.
`SecureDraftSessionPanel.tsx` lets parties write terms in Markdown, HTML, or
plain text, apply small formatting helpers, upload local image attachments into
the draft body, and share a link plus a separate session key. The terms editor
handles Ctrl/Cmd+Z and redo shortcuts inside the collaborative draft area. The
default share action creates a one-time encrypted draft link; live co-editing
starts only when the user explicitly chooses **Start Live Room**.

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
- The UI clears local share URLs and session keys after the user ends live sync
  or completes contract submission. Ending live sync also calls
  `DELETE /api/create-collab/[roomId]` so transient room snapshots are removed
  from the relay when they are no longer needed.
- Copy actions show **Copied!** briefly and then return to **Copy Link** or
  **Copy Session Key**. The email helper opens a `mailto:` draft with the share
  link and separate session key; it never sends email server-side.

This is a production-shaped collaboration seam without committing the project to
a vendor. For high-volume production rooms, replace the in-memory relay behind
the same encrypted snapshot contract with Redis, Postgres realtime, Durable
Objects, or a WebSocket service. Keep the browser-side encryption and wallet
allowlist checks intact.

## Email And Notifications

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Magic links use HMAC-SHA256 tokens from `src/lib/magicLink.ts`. Email delivery
uses the provider abstraction in `src/services/email.ts`. Supported providers
are Resend, Brevo, Postmark, and a local-only `log` provider for development
testing. Magic-link recipients can be a comma- or semicolon-separated list for
limited multi-recipient test flows; the service de-duplicates recipients and
caps each send at five addresses.

The notification service supports contract offer, work submitted, approval,
dispute, dispute resolution, rating, and deadline reminder messages. Deadline
reminders are scheduled by `src/vercel.json` at:

```yaml
0 9 * * *
```

The cron endpoint is `/api/cron/deadline-reminders`.

## Privacy Analytics

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`src/components/PrivacyAnalytics.tsx` sends page-view and frontend-error beacons
only when `NEXT_PUBLIC_PRIVACY_ANALYTICS_ENABLED=true`. The matching server
collector at `/api/analytics/events` also requires
`TRUSTLEDGER_ANALYTICS_ENABLED=true`, so accidental client-side enablement does
not collect events by itself.

The collector is intentionally aggregate-only: it stores no cookies, wallet
addresses, raw IP addresses, user agents, query strings, emails, raw documents,
encrypted draft bodies, or session keys. It honors Do Not Track and Global
Privacy Control headers.

## Oracle Routes

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The frontend package exposes display-rate oracle routes:

| Route                                  | Purpose                                                             |
| -------------------------------------- | ------------------------------------------------------------------- |
| `/api/oracle/rates?base=eth&quote=usd` | Validated exchange-rate lookup with TTL caching and stale fallback. |
| `/api/oracle/status`                   | Provider URL, TTL, supported pairs, and cache metadata.             |

Read [Oracle Architecture](ORACLE.md) before adding assets, providers, or
on-chain oracle consumption.

## Solana Helpers

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`src/helpers/solana.ts` records the current Solana decision:
native-program-first support. It provides cluster defaults, Explorer URL
construction, and conservative public-key shape checks. Read
[Solana Support](SOLANA.md) before adding wallet or transaction code.

## Legal Localization Helpers

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`src/helpers/legal-docs.ts` is the registry for legal document metadata. It
tracks source files, supported locales, translation status, and a constrained
translation prompt for machine-assisted drafts. Legal translations should remain
human-reviewed before publication; the helper exists to preserve Markdown shape
and prevent accidental changes to legal meaning.

The legal document route reads reviewed locale-specific Markdown from
`src/content/legal/<locale>/<SOURCE_FILE>.md` first and falls back to the
English source in `src/content/legal/<SOURCE_FILE>.md`. Keep translated legal
bodies out of the live route until they have been reviewed for legal meaning,
defined terms, numbering, links, and Markdown formatting.

## Internationalization

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The frontend uses `next-intl`. Keep user-visible strings in the established
message structure and verify locale routing before moving text into components.
Every key in `src/messages/en.json` must exist in each supported locale file.
Run `npm run i18n:scan` after adding or moving visible copy. The scanner checks
locale key parity, blocks placeholder-prefixed translations, and fails when JSX
or visible attributes contain hard-coded English instead of message keys.

## Styling And Motion

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

TrustLedger uses restrained motion for state feedback only. Countdown panels,
wallet menus, walkthrough controls, live-sync indicators, and action buttons may
animate hover, focus, progress, or state changes. They must honor reduced motion
and must not hide content until an animation completes.

## Lifecycle Countdown UI

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Dashboard contract cards show a live next-stage countdown when the on-chain
contract has a relevant deadline:

- Active contracts count down to the freelancer delivery deadline.
- Submitted contracts count down to the client approval or dispute window.
- Approved contracts with a warranty hold-back count down to the hold-back
  unlock time.

The countdown updates once per second for user clarity. It is display-only; the
smart contract remains the enforcement source for reclaim, release, and warranty
claims. Expired timers switch to a "Since Expiry" label so users can tell that
the next action may be available.

The `/[locale]/about` route includes a compact project stopwatch that counts up
from May 2, 2026. The footer links to this route so project background can grow
without adding clutter to the dashboard or create-contract flows.

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

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

The product FAQ route is `app/[locale]/faq/page.tsx`. The custom 404 experience
is implemented by `app/[locale]/not-found.tsx` for localized app routes and
`app/not-found.tsx` for root-level fallback routes. Keep FAQ links available in
the top navigation and footer so users can recover from wallet, route, and
transaction issues without leaving the app.

## Deployment

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

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

## Authors and Contributors

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **Kevin K. Le** — Founder, Founding Engineer, and Current Lead Engineer
  ([LinkedIn](https://www.linkedin.com/in/lekevin1))
- **Kellen Snider** — Founding Engineer
  ([LinkedIn](https://www.linkedin.com/in/kellen-snider-683396256/))

See [`CREDITS.md`](CREDITS.md) for the complete acknowledgement list.

## Legal

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

This document is part of TrustLedger, an open-source decentralized escrow and
arbitration protocol. Use of this software and documentation is subject to the
[Terms and Conditions](TERMS_AND_CONDITIONS.md),
[Privacy Policy](PRIVACY_POLICY.md), and [Risk Disclosure](RISK_DISCLOSURE.md).
See [`LEGAL.md`](LEGAL.md) for the full compliance and licensing overview.
