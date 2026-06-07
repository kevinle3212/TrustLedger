# To-Do List

Tasks are grouped into phases and ordered so that earlier work unblocks later
work. Complete each phase roughly in order: tooling and architecture come first,
followed by user-facing features, backend services, quality, and finally the
mainnet launch deliverables.

## Phase 1 — Development Environment and Tooling

- [x] Add a `.nvmrc` file to pin the Node.js version for the project so that all
      contributors use the same version and avoid compatibility issues. — Added
      `.nvmrc` pinning Node **22.22.3** (latest LTS "Jod", matching the CI
      `node-version: 22` and the `engines.node` floor). It mirrors the commented
      `.python-version` format; nvm (>=0.40) strips the `#` comment header and
      reads the single version line, so `nvm use` selects it automatically. A
      companion `.node-version` (same `22.22.3` pin) was added for managers that
      read that file instead (nodenv, asdf, fnm, Volta); both are excluded from
      markdownlint via `.markdownlintignore` and mapped to plaintext in
      `.vscode/settings.json`.
    - This is a small but important step toward consistent development
      environments. With the version pinned in `.nvmrc`, contributors can switch
      to the correct version with `nvm use`, which helps prevent problems caused
      by version mismatches.

- [x] Add a `.vercelignore` file to exclude files and directories that should
      not be deployed to Vercel, such as the `contracts/` directory and local
      configuration files. — Added a root `.vercelignore`. The Vercel deployment
      only needs the Next.js frontend in `src/`, so the file excludes the
      smart-contract and chain tooling (`contracts/`, `artifacts/`,
      `hardhat-cache/`, `scripts/`, `test/`, `tools/`, `utils/`, `stubs/`),
      local environment files (`.env`, `.env.*`, while re-including the
      `*.example` templates), build output (`dist/`, `src/.next/`, `coverage/`),
      Docker, docs/site assets, and editor/agent/OS files.
    - This keeps deployments clean and prevents sensitive or unnecessary files
      from being uploaded to production. The `.vercelignore` file should exclude
      the `contracts/` directory, local environment files (for example
      `.env.local`), and any other files the frontend deployment does not need.

- [x] Add a `NOTES.local.md` (private, git-ignored) and a `NOTES.md` (public) to
      track ongoing thoughts, ideas, and research that are not yet ready for
      formal documentation but are still valuable to the development process. —
      Added both as templates (no real content yet). `NOTES.md` is committed
      with headings for research/ideas, decisions, technical debt, and open
      questions, plus conventions for adding entries. `NOTES.local.md` is the
      private scratch counterpart and is git-ignored via a new `NOTES.local.md`
      rule in `.gitignore`; its template points to the public `NOTES.md` for the
      shared notes and the promotion workflow.
    - `NOTES.local.md` is a private space for jotting down ideas, research
      findings, and other rough notes, without worrying about polish or
      completeness.
    - `NOTES.md` is the public-facing version. Move any insight worth sharing
      with the broader community here. This keeps the project transparent while
      still leaving room for informal note-taking.

- [ ] Update all packages to their latest versions, upgrade Hardhat to 3.x, and
      confirm that all tests and code still work, so the project benefits from
      new features, improvements, and security patches.
    - Update the `package.json` dependencies, run `npm install`, and then fix
      any breaking changes that arise. Pay special attention to major version
      updates (for example Hardhat 3.x), since they can introduce breaking
      changes that require code modifications.
    - After updating, run the full test suite to confirm everything still works.
    - Update outdated, insecure, or deprecated packages and code patterns so the
      codebase follows current best practices and is secure against known
      vulnerabilities.
    - Apply only the updates that can be made without breaking the codebase, and
      prioritize security updates and critical bug fixes over minor version
      bumps that add little value.
    - Record in `NOTES.md` any packages or code that could not be updated
      because of deprecation or lack of maintenance, so future contributors are
      aware of the technical debt.
    - Revisit the 28 remaining low-severity `npm audit` findings once this
      upgrade lands. They all trace to the unpatched `elliptic <=6.6.1` advisory
      pulled in transitively by the Hardhat 2 / ethers-v5 dev toolchain (no
      patched `elliptic` exists, so it cannot be overridden). Migrating to
      Hardhat 3.x / `@nomicfoundation/hardhat-toolbox` 7.x removes ethers-v5 and
      `elliptic` from the tree and should clear them; re-run `npm audit`
      afterward to confirm. The high (`undici`) and moderate (`bn.js`) findings
      were already patched via `overrides` in `package.json`.

- [x] Set up a CI/CD pipeline (GitHub Actions) that runs linting, the full test
      suite, and a production build on every pull request, to catch regressions
      before they reach `main`. — `.github/workflows/ci.yml` runs on every
      `push`/`pull_request` to `main` with five jobs: **Frontend** (typecheck +
      ESLint/Prettier + `next build` production build), **TypeScript** (ESLint +
      Solhint + markdownlint + Prettier + `tsc`), **Python** (`mypy` via
      `lint:py`), **Hardhat** (compile + 146 Mocha tests), and **Solidity**
      (`forge fmt --check` + `forge build --sizes` + `forge test`). Linting, the
      full test suite, and the production build are therefore all gated per PR.

- [x] Wire `mypy` into the lint pipeline so the Python scripts are type-checked
      in CI, not just locally. `mypy` is currently installed in the local pyenv
      but is not enforced by the repo. — Added a `lint:py` npm script
      (`mypy utils/generate_contract.py scripts/models/github_models.py`), a
      root `mypy.ini`, and a `Python (mypy)` CI job in
      `.github/workflows/ci.yml` that installs `mypy` plus `types-reportlab` via
      `utils/requirements.txt`. The config is maximally strict (`strict = True`
      plus every extra check: `warn_unreachable`, `strict_equality`,
      `disallow_any_unimported`, `disallow_any_explicit`, `extra_checks`, etc.).
      Rather than relax `disallow_any_unimported` for the stub-less
      `azure-ai-inference` SDK, its used surface is typed by hand-written stubs
      under `stubs/azure/**` (`mypy_path = stubs`). Fixed the resulting real
      type issues: `SCENARIOS` got a precise `Callable` value type;
      `parse_json_response` returns `dict[str, object]` with an `isinstance`
      guard; the sample dicts are typed (a `Rating` / `ReputationSample`
      `TypedDict` pair for the iterated reputation data); and the dispute `pct`
      is type-narrowed before `int()`.
    - Add a `models:typecheck` (or `lint:py`) npm script that runs `mypy` over
      the Python sources (for example `utils/` and `scripts/models/`), and add a
      matching GitHub Actions step so pull requests are gated on it.
    - Ensure the CI job installs the type stubs first (for example
      `pip install -r utils/requirements.txt`, which pins `types-reportlab`) so
      `mypy` can resolve third-party imports without "library stubs not
      installed" errors.
    - When selecting the interpreter in CI via `actions/setup-python` with
      `python-version-file: .python-version`, use a recent version of the action
      (older ones do not parse the comment lines in `.python-version`) or pass
      `python-version: '3.14.2'` directly to avoid the comments tripping it up.

- [x] Make the pinned Python version discoverable alongside the Node pin. —
      Added a "Python (Optional, Version 3.14.2)" prerequisite to `README.md`
      (`pyenv install 3.14.2` + `pip install -r utils/requirements.txt`),
      referenced it from the prerequisites intro, and documented the `lint:py`
      script and the `Python` CI job in the command and CI tables. The Node
      `.nvmrc` (the counterpart to `.python-version`) is now cross-documented
      the same way: the Node prerequisite calls out the **22.22.3** pin and the
      no-argument `nvm install` / `nvm use` flow, and `.nvmrc`,
      `.python-version`, `mypy.ini`, and `stubs/` were added to the
      project-structure tree.
    - Document the `.python-version` (3.14.2) requirement in `README.md` next to
      the Node/engines guidance, and mention `pyenv install 3.14.2` plus
      `pip install -r utils/requirements.txt` in the setup instructions so new
      contributors land on the same interpreter and stubs.
    - Document the `.nvmrc` file the same way for the `.python-version` file if
      it hasn't been already, so it's clear to contributors how to set up their
      Node environment as well.

## Phase 2 — Code Organization and Architecture

- [x] Add a `types/` directory for shared TypeScript types and interfaces that
      can be imported across the frontend and backend, ensuring type safety and
      consistency. — Added a root `types/` directory with `common.ts`
      (`Address`/`Hex`/`Bytes32` aliases), `contract.ts` (`Contract` +
      `ContractStatus` mirroring `EscrowContract`), `dispute.ts` (`Dispute` +
      `DisputePhase` mirroring the `Dispute` struct), `rating.ts` (`Rating`,
      `ReputationSummary`, `ReputationHistoryEntry`), and an `index.ts` barrel.
      Wired a `@/types` / `@/types/*` path alias in `src/tsconfig.json` (the
      repo-root `types/` is also added to `include`) and adopted the shared
      types in the frontend: `dashboard/page.tsx` now imports `Contract` and
      `reputation/page.tsx` imports `ReputationHistoryEntry`, replacing their
      local interface copies. `tsc`, ESLint, Prettier, and `next build` all
      pass.
    - Create a `types/` directory at the project root and define shared types
      such as `Contract`, `Dispute`, and `Rating` in separate files (for example
      `types/contract.ts` and `types/dispute.ts`).
    - Import these types into both the frontend components and any backend logic
      (for example API routes) so data structures stay consistent and type-safe
      across the entire codebase.

- [ ] Add the following directories to keep the code organized, modular, and
      aligned with common React conventions: `hooks/`, `store/`, `utils/`,
      `providers/`, and `agent/`.
    - `hooks/` — custom React hooks for state and side effects (for example
      `useContractData`, `useAuthentication`, `useNotifications`).
    - `store/` — global state management, such as a context provider or a
      Zustand store for shared state (for example authentication state and a
      contract data cache).
    - `utils/` — utility functions used across the codebase, such as formatters,
      API helpers, and blockchain interaction utilities.
    - `providers/` — context providers for global state or side effects (for
      example `AuthProvider` and `ContractDataProvider`).
    - `agent/` — AI agent logic and integrations, such as generating contract
      summaries or providing AI-powered assistance to users.

- [ ] Add a `services/` directory for external service integrations — such as
      IPFS pinning, email notifications, and AI summarization — to keep the code
      organized and modular. — **Partially done:** added `src/services/email.ts`
      (a Resend wrapper with a shared HTML email shell) and
      `src/services/notifications.ts` (lifecycle-email templates plus the pure
      `findDeadlineReminders` deadline scanner) as part of the
      email-notification work below. Placed under `src/services/` (not the repo
      root) so the Next.js API routes import them via the existing
      `@/services/*` path alias. `services/ipfs.ts` and `services/aiSummary.ts`
      are still pending.
    - Create a `services/` directory at the project root and define a module per
      integration (for example `services/ipfs.ts`, `services/email.ts`, and
      `services/aiSummary.ts`).
    - Each module contains the functions for interacting with that service, such
      as uploading files to IPFS, sending email notifications, or generating AI
      summaries. This keeps the codebase clean and makes integrations easier to
      manage and update.

- [x] If needed, add a `middleware.ts` file (and API routes) to handle
      server-side logic such as fetching contract data, handling authentication,
      or processing payments. — Added `src/proxy.ts` (Next.js 16 renamed the
      `middleware.ts` convention to `proxy.ts`; the function is exported as
      `proxy`) that applies baseline security headers (`X-Content-Type-Options`,
      `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS,
      `X-DNS-Prefetch-Control`) to every response and best-effort per-IP rate
      limiting to `/api/*`. A strict CSP is intentionally deferred to the Phase
      3 security task because Reown AppKit/WalletConnect need per-deploy tuning.
      Added API routes alongside it: `GET /api/contract/[id]` (server-side
      aggregation that reads `getContract()` on-chain and returns a JSON-safe,
      gateway-resolved shape), `POST /api/notifications` (auth-gated lifecycle
      emails), and `GET /api/cron/deadline-reminders` (scheduled in
      `src/vercel.json`). `tsc`, ESLint, Prettier, and `next build` all pass.
    - Set up API routes that interact with both the blockchain and the frontend,
      enabling more complex interactions that are not well suited to client-side
      logic.
    - For example, an API route could aggregate on-chain data with off-chain
      metadata for a contract, or handle user authentication and session
      management.
    - This also improves separation of concerns: the frontend stays focused on
      the user interface while heavier logic moves to the backend, which
      improves maintainability and scalability as the platform grows.

## Phase 3 — Wallet and Browser Compatibility

- [x] Fix Base (works on Safari), Browser Wallet, MetaMask, and WalletConnect
      integration and compatibility, since they cause issues on Safari. —
      Replaced RainbowKit with **Reown AppKit** (`@reown/appkit` +
      `@reown/appkit-adapter-wagmi`) in `src/lib/wagmi.ts`, which fixes Safari's
      two failure modes (broken `metamask://` deep links and a WalletConnect
      relay that errored against RainbowKit's placeholder project ID) and
      removes the deprecated RainbowKit Coinbase connector. The connect modal
      now features Coinbase Wallet (no longer deprecated), MetaMask, Phantom,
      and Tangem by their verified WalletConnect-registry IDs, plus the Base
      Account passkey smart wallet and every other registry/injected wallet. A
      custom `src/components/ConnectButton.tsx` (AppKit
      `useAppKit`/`useAppKitAccount` hooks) replaces RainbowKit's
      `<ConnectButton>` across the navbar and all six pages; `Providers.tsx`
      drops `RainbowKitProvider` and syncs AppKit's light/dark theme with
      `next-themes`. The relay-dependent wallets still require
      `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (documented in `.env.example`);
      injected and Coinbase work without it. `tsc`, ESLint, Prettier, and
      `next build` all pass; real-device QA on iOS Safari is still recommended
      before mainnet.
    - Resolve these issues for compatibility across all browsers and wallets,
      but prioritize Safari, since it is the most common browser on iOS and has
      the most wallet-integration problems. This ensures the platform is
      accessible to the widest possible audience, regardless of device or
      wallet.
    - Ensure the UI is clean on mobile displays and that all wallet interactions
      work smoothly in mobile browsers, since many users access the platform
      from their phones as well as their desktops.

- [ ] Add Tailwind CSS for the frontend if needed, and make the frontend faster,
      more secure, and more aesthetically pleasing.
    - Tailwind is already a dev dependency in `src/package.json` (v4 via
      `@tailwindcss/postcss`); audit whether it is actually wired into the
      styling pipeline and adopt it consistently if it improves maintainability
      over the current approach, otherwise document why it is intentionally
      unused.
    - Performance: trim client bundle size, lazy-load wallet/AppKit code, adopt
      Next.js streaming/Server Components where possible, optimize fonts and
      images, and target strong Core Web Vitals (LCP, CLS, INP).
    - Security: add a strict Content-Security-Policy and security headers, audit
      `dangerouslySetInnerHTML`/external links, keep dependencies patched, and
      ensure no secrets reach the client bundle.
    - Aesthetics: establish a consistent design system (spacing, typography,
      color tokens, dark mode), improve accessibility (WCAG AA contrast, focus
      states, reduced-motion support), and polish loading/empty/error states.

## Phase 4 — Core Contract Lifecycle Features

- [ ] Support dual-role accounts so a single wallet can operate as both a client
      and a freelancer, with a persistent role toggle in the UI.
    - Add a role-switching control (for example a toggle or dropdown in the
      navbar) that sets the active role to `client` or `freelancer`. Store the
      preference in `localStorage` and propagate it via a React context so all
      pages respond without a full reload.
    - Filter the dashboard, contract creation flow, and notifications to the
      active role. A wallet that has contracts as both parties should see the
      correct subset for each view.
    - No smart-contract changes are required — the contracts already track both
      parties by address. This is purely a frontend routing and state concern.

- [ ] Add USDC as a supported payment currency alongside ETH.
    - The escrow contract currently operates in the native chain token (ETH).
      Add an ERC-20 payment path: accept a `tokenAddress` (address(0) for ETH, a
      USDC contract address otherwise) and use `IERC20.transferFrom` /
      `IERC20.transfer` in fund, release, and refund flows.
    - Validate the token address on-chain against an allowlist (ETH + approved
      stablecoins) to prevent arbitrary ERC-20 abuse.
    - Update the contract-creation UI to let the client choose ETH or USDC, and
      surface the currency on every contract card and detail page.
    - Add `approve` UX before funding: the client must approve the escrow
      contract to spend their USDC before `fundContract()` succeeds.
    - Document the USDC contract addresses for each supported network in
      `.env.example` (e.g. `NEXT_PUBLIC_USDC_ADDRESS_SEPOLIA`,
      `NEXT_PUBLIC_USDC_ADDRESS_BASE`).

- [x] Fix the currency-lock warning and logic on the Create Contract page so
      funds are not locked until the counterparty accepts, in both proposal
      directions.
    - **Warning message (client view):** The yellow badge currently reads "ETH
      locked on submit". Change it to "BEWARE: The proposed currency is locked
      on submit AND freelancer agreement!" so the copy accurately reflects that
      funds move the moment the client submits the transaction.
    - **Logic fix (client-proposed flow):** `proposeContractByClient` in
      `TrustLedger.sol` takes `msg.value` immediately (line ~616), locking ETH
      at proposal time before the freelancer has agreed. Refactor so the client
      proposal is unfunded (no `payable` / no `msg.value` transfer); add a
      separate `fundContractByClient` step that the contract triggers (or the
      client calls) only when `acceptContractByFreelancer` is invoked. Update
      `withdrawClientProposal` accordingly since there will be no funds to
      return while the contract is still PENDING.
    - **Logic fix (freelancer-proposed flow, vice versa):** The freelancer-
      proposed path (`proposeContract` + `acceptContract`) already defers
      funding to the client's acceptance call. Verify the matching warning is
      shown to the freelancer on that flow and that its copy is consistent with
      the updated client-side language.
    - Update the frontend `create/page.tsx` (around line 435) to reflect the
      new flow: remove `value: parsedAmount` from the `proposeContractByClient`
      wagmi args and wire the fund step into the post-acceptance callback.
    - Re-run `forge test` and the Hardhat suite after any contract change;
      update ABI exports and any test fixtures that assert on locked balances.

- [ ] Allow clients and freelancers to create a contract within the platform,
      see live edits, and update the contract terms before deployment.
    - Build a contract creation and editing interface where users enter the
      contract details (for example description, amount, and deadlines) and see
      a live preview as they edit. Store the terms in a way that supports
      updates before the contract is finalized and deployed on-chain.
    - Once finalized, the contract is deployed to the blockchain. Supporting
      live edits during the drafting phase improves the user experience, makes
      it easier for both parties to agree on terms, and avoids repeated rounds
      of off-chain negotiation and on-chain redeployment.

- [ ] Add a dashboard summary view that shows the key details and status of each
      contract at a glance, so users can understand the state of their contracts
      without clicking into each one.

- [ ] Add a link checker to the deliverable submission form so that invalid URLs
      or IPFS links are caught before submission.
    - Validate the input in real time as the user types or pastes a link. Accept
      only well-formed `https://` URLs or IPFS links in any of the standard
      formats (`ipfs://`, `https://<gateway>/ipfs/`, or a raw CIDv0/CIDv1
      starting with `Qm…` or `baf…`).
    - Display a clear error message at the top of the submit box when the link
      does not match a valid pattern (for example "Must be a valid URL or IPFS
      link (ipfs://, https://…/ipfs/…, or a CID)").
    - Disable the submit button while the link is empty or invalid, re-enabling
      it only once the input passes validation, so users cannot accidentally
      submit a broken link.

- [ ] Add an AI-generated summary of each contract and its status to the
      dashboard, so users can quickly understand the key details and current
      state without reading through all the text.
    - Use a language model (for example Gemini) to generate a concise summary of
      the contract description, key terms (amount and deadlines), and current
      status (for example "In Progress, 40% completed, no disputes") from the
      on-chain data and any relevant off-chain metadata.
    - Research and compare free or free-tier AI providers before committing to
      one, and document the trade-offs (rate limits, context window, data-
      retention/privacy terms, and whether a card is required) in `NOTES.md`.
      Candidates to evaluate:
        - **Google Gemini API** — generous free tier (e.g. Gemini 2.x Flash)
          with a simple REST/SDK and no card required to start.
        - **Groq** — free tier serving open models (Llama, etc.) at very low
          latency; good for fast, cheap summaries.
        - **OpenRouter** — single API key fronting many models, including
          several `:free` variants, useful for provider fallback.
        - **Cloudflare Workers AI** — free daily allotment of open models that
          pairs well if any edge/Workers backend is added.
        - **Mistral (La Plateforme)** and **Together AI** — additional free-tier
          options worth benchmarking on summary quality and cost. Prefer routing
          through one abstraction (mirroring `src/services/email.ts`) so the
          provider can be swapped without touching call sites — e.g. a
          `src/services/aiSummary.ts` module — and keep the key server-side
          only.
    - Display the summary prominently on each contract card in the dashboard,
      giving users an easy-to-digest overview without clicking into each
      contract.
    - Add an in-app PDF viewer for the contract document so users can read the
      full contract in a readable format without downloading it separately. - If
      the document is encrypted, prompt the user to decrypt it first. Otherwise,
      prompt them either to view it on IPFS (and let IPFS download it for them)
      or to re-authenticate with their wallet so the backend can fetch it. - Do
      not allow users to view the document unless they are the client or
      freelancer on the contract, but still allow anyone to view the summary and
      key details, so sensitive information is protected while the contract
      remains broadly understandable. - Protect everything behind wallet
      authentication and authorization so only the relevant parties can access
      the contract details and documents, preventing broad public access to
      potentially sensitive information.

## Phase 5 — Dispute Resolution and Arbitration

- [ ] Allow both the client and freelancer to submit evidence during
      arbitration, and let jurors view all submitted evidence in a structured
      way when making a ruling.
    - Add functions to `EscrowContract` for evidence submission (for example
      `submitEvidence(string calldata uri)`) that both parties can call, and
      store the evidence URIs so they can be retrieved and displayed on the
      frontend.
    - Update the arbitration detail page to show all submitted evidence from
      both parties in a clear, organized layout, so jurors can review it easily
      when making a decision.

- [ ] Implement a more robust and user-friendly dispute resolution interface for
      jurors, including the ability to view all relevant contract details and
      evidence and a clear flow for submitting a ruling.
    - Enhance the juror dashboard to display all open disputes assigned to the
      juror, with links to the contract details and any submitted evidence. The
      juror should be able to cast a ruling directly from this interface, with
      clear options for selecting the completion percentage and submitting the
      vote.
    - After the ruling is executed, clearly display the outcome to all parties,
      including the distribution of funds and any reputation changes, to make
      the dispute resolution process transparent.

- [ ] Build out the arbitration and juror UI so the dispute resolution flow is
      fully self-serve for all parties.
    - **Evidence submission:** Add a structured form to the arbitration detail
      page (`/arbitration/[id]`) where clients and freelancers can submit a
      written dispute summary, supporting documents (linked via an IPFS or
      Arweave URI), and a requested completion percentage.
    - **Juror voting interface:** Extend the juror page (`/juror`) so jurors can
      view all open disputes assigned to them, read evidence from both parties,
      and cast a completion-percentage ruling directly from the UI. This
      currently requires a manual contract call.
    - **Ruling status and outcome display:** Once `executeRuling()` resolves a
      dispute, display the final outcome — including the funds distribution
      breakdown, any automatic reputation penalties, and a summary of the juror
      votes when there are multiple jurors. This adds transparency and helps
      users understand how rulings are determined.
    - **Juror fee visibility:** Surface the expected juror fee reward on the
      juror page so participants know what they stand to earn before accepting a
      case.

## Phase 6 — Backend Services and Off-Chain Infrastructure (Mainnet)

- [ ] Add off-chain user accounts to support profile data, notifications, and
      messaging that cannot or should not live on-chain.
    - **Authentication:** Require users to sign a typed EIP-712 message with
      their wallet to prove address ownership. Issue a short-lived JWT on
      successful verification — no passwords required.
    - **Authorization:** Gate off-chain write actions (for example updating a
      profile or reading notifications) to the authenticated wallet. On-chain
      actions remain permissionless and are enforced entirely by the smart
      contracts.
    - **User profiles:** Allow users to set a display name and profile picture,
      stored off-chain in a database or on IPFS and linked to their on-chain
      address. Profiles should surface on the reputation and dashboard pages.
    - **Notifications:** Send email or in-app notifications for key contract
      lifecycle events — new contract offers, submitted work, approval or
      dispute outcomes, and rating submissions. — **Email layer scaffolded:**
      `src/services/notifications.ts` renders every lifecycle email (offer, work
      submitted, approval, dispute opened/resolved, rating, deadline reminder)
      via the shared `src/services/email.ts` shell; `POST /api/notifications`
      (bearer-gated with `NOTIFICATIONS_SECRET`) sends one on demand; and
      `GET /api/cron/deadline-reminders` (daily Vercel Cron in
      `src/vercel.json`, gated with `CRON_SECRET`) reads open contracts on-chain
      via viem and emails the relevant party when a project, acceptance, or
      warranty deadline is within 48h. **Still pending:** recipient resolution
      is a stopgap that reads an address→email map from the
      `NOTIFICATION_EMAILS` env var; replace it with the off-chain account
      database below, and add the in-app channel.
    - **In-app messaging:** Allow clients and freelancers to communicate within
      the platform without exposing personal contact information. Messages
      should be end-to-end encrypted so only the two parties can read them. Use
      an AI moderation layer (for example Gemini) to flag policy violations such
      as harassment or sharing personal information outside the platform.
    - **2FA (optional):** Add TOTP-based two-factor authentication as an opt-in
      security layer on top of wallet sign-in.
    - Requires a backend with API routes and a database. Consider Supabase,
      PlanetScale, or a self-hosted Postgres instance for persistence, with JWTs
      for session management.

- [ ] Find a better magic-link email service provider that is free or low-cost
      for development and testing to replace the current one, which is
      restrictive and causes problems with email deliverability and the
      authentication experience.
    - Research and evaluate alternatives that better support magic-link
      authentication, such as SendGrid, Mailgun, or Postmark. Look for improved
      deliverability, easier backend integration, and better analytics for
      tracking email performance.
    - Implement the new provider in the authentication flow so users reliably
      receive their magic links and authenticate without issues.

- [ ] Survey and document useful free / free-tier external APIs the platform can
      adopt to stay zero- or low-cost through development and early launch, then
      record the chosen providers and their limits in `NOTES.md` and
      `.env.example`.
    - **Email / transactional:** currently Resend (3,000/month, 100/day free);
      benchmark against SendGrid, Mailgun, Postmark, and Brevo for
      deliverability and free-tier headroom (ties into the magic-link provider
      item above).
    - **AI summarization / moderation:** see the free-tier AI research under the
      Phase 4 AI-summary item (Gemini, Groq, OpenRouter, Cloudflare Workers AI,
      Mistral, Together AI).
    - **RPC / node access:** Alchemy, Infura, and the public/free endpoints for
      Sepolia and the production L2s — compare request quotas and archive
      access.
    - **IPFS / storage pinning:** Pinata (already used), web3.storage, and
      Filebase free tiers for document and deliverable pinning.
    - **Price / oracle feeds:** CoinGecko and Chainlink free feeds for the
      stablecoin/exchange-rate work in the oracle item below.
    - For each category, note rate limits, whether a credit card is required,
      data-retention/privacy terms, and the upgrade path, so the team can pick
      deliberately and avoid surprise paywalls near mainnet.

- [ ] Add an oracle service to fetch off-chain data relevant to contracts, such
      as exchange rates for stablecoin payments or external data feeds that
      could trigger contract actions or disputes.
    - Set up a backend service that fetches and aggregates off-chain data and
      makes it available to the frontend and smart contracts. For example, if
      the platform supports stablecoin payments, the oracle could fetch
      real-time exchange rates to ensure accurate payment amounts.
    - The oracle could also fetch external data relevant to contract execution
      or dispute resolution, such as delivery confirmations or work-completion
      status from third-party platforms, to help automate parts of the contract
      lifecycle.

- [ ] Evaluate and implement SOL (Solana) support as a second chain.
    - **Decision gate first:** determine whether SOL means (a) deploying an
      equivalent Anchor program on Solana so users on Solana can use TrustLedger
      natively, or (b) accepting SOL as a payment token on an EVM chain via a
      bridge (e.g. Wormhole). Document the chosen approach and its trade-offs in
      `NOTES.md` before writing any code.
    - If option (a): implement the escrow, reputation, and arbitration programs
      in Anchor, wire a Solana wallet adapter (e.g. `@solana/wallet-adapter`)
      into the frontend, and add chain-switching logic so the UI routes to the
      correct program depending on the connected wallet's chain.
    - If option (b): integrate a bridge SDK, add SOL to the currency selector
      alongside ETH and USDC, and validate lock/unlock flows end-to-end on
      testnet before mainnet.
    - Either path requires updating `README.md`, `.env.example`, and the docs
      with new network addresses, setup steps, and any new tooling requirements.

- [ ] Add backend services in additional languages such as Rust or Python, to
      allow more flexibility and performance for complex logic or integrations
      not well suited to JavaScript/TypeScript.
    - Set up a separate backend service (for example FastAPI for Python or Actix
      for Rust) to handle specific tasks such as interacting with the
      blockchain, processing data, or integrating with external services.
    - The frontend communicates with this backend over API calls, allowing a
      more robust and scalable architecture that leverages the strengths of each
      language.
    - For example, a Rust backend could handle performance-critical work such as
      processing large data sets or complex cryptographic operations, while a
      Python backend could handle work that benefits from its rich ecosystem,
      such as AI integrations and data analysis.
    - Add directories such as `.cargo/`, `infra/`, `lib/`, and `programs/` to
      set up the Rust backend and keep its code organized and modular. -
      `.cargo/` — the `Cargo.toml` file and any other Rust configuration. -
      `infra/` — infrastructure code and configuration, such as Dockerfiles,
      Kubernetes manifests, or Terraform scripts for deploying the backend
      services. - `lib/` — shared libraries and modules used across the Rust
      backend. - `programs/` — the main application logic, such as the API
      server and blockchain interaction code.

- [ ] If needed, add C or C++ for performance-critical math, cryptography, or
      other features that benefit from a low-level, compiled language.
    - Consider C/C++ for heavy numeric or cryptographic work that is too slow in
      JavaScript/TypeScript or Python — for example custom elliptic-curve or
      hashing routines, large-scale Monte Carlo simulations of fee and
      reputation models, or batch processing of on-chain data for the
      whitepaper.
    - Expose the compiled code to the rest of the stack in one of these ways:
        - **WebAssembly:** Compile to WASM (via Emscripten) and call it directly
          from the frontend for client-side math without a round trip to a
          server.
        - **Native addon:** Build a Node.js native addon (N-API / node-gyp) so a
          backend service can call into the compiled library.
        - **Standalone service:** Wrap the C/C++ code behind a small service the
          other backends call over an API (pairs well with the Rust/Python
          services above).
    - Keep the C/C++ sources organized under a dedicated directory (for example
      `native/` or `lib/native/`) with a clear build step (CMake or a Makefile)
      and document how to build and link it.
    - Only introduce this if a measured bottleneck justifies the added build
      complexity; prefer Rust where memory safety matters and C/C++ only where
      an existing library or toolchain requires it.

- [ ] Use Python's NumPy, SymPy, Matplotlib, or other scientific libraries to
      generate visualizations and insights from the on-chain data, for use in
      the whitepaper, documentation, or the platform itself.
    - This leverages Python's strengths in data analysis and visualization,
      enabling richer and more informative visuals than are easily achievable in
      JavaScript.
    - These visualizations can give users insight into their contract
      performance, reputation trends, and other metrics that help them make
      informed decisions on the platform.

## Phase 7 — Testing, Quality, and Accessibility

- [ ] Perform a thorough security sweep of the entire frontend and backend and
      patch any vulnerabilities found, then document the findings and fixes in
      `SECURITY.md` and `NOTES.md`.
    - **Frontend:** audit for XSS (including `dangerouslySetInnerHTML` and the
      email HTML built in `src/services/email.ts`), unsafe `target="_blank"`
      links missing `rel="noopener noreferrer"`, secrets accidentally exposed to
      the client bundle (only `NEXT_PUBLIC_*` may reach the browser),
      unvalidated URL/IPFS inputs, and clickjacking; finish hardening with the
      strict CSP deferred from the `src/proxy.ts` work and the Phase 3 security
      task.
    - **Backend / API routes:** verify input validation at every boundary, that
      `/api/notifications` and `/api/cron/deadline-reminders` enforce their
      bearer secrets (`NOTIFICATIONS_SECRET` / `CRON_SECRET`) with constant-time
      comparison, that no route leaks internal errors or PII, that rate limiting
      and request-size limits hold up, and that SSRF is not possible via
      user-supplied URIs fetched server-side.
    - **Auth / tokens:** review the magic-link HMAC flow and any future JWT/EIP-
      712 sign-in for replay, expiry, and signature-validation correctness.
    - **Dependencies & secrets:** run `npm audit` (root and `src/`), `gh`
      Dependabot/code-scanning alerts, and a secret scan (e.g. `gitleaks`);
      upgrade or override vulnerable packages and rotate any exposed keys.
    - **Smart contracts:** re-run `forge test`, `slither`/static analysis, and
      review access control, reentrancy, and arithmetic on the escrow,
      arbitration, juror, and reputation contracts before mainnet.
    - Prefer automated gates where possible (CI security job, `npm audit` in CI)
      so regressions are caught on every pull request rather than only in
      sweeps.

- [ ] Run a full project sweep (excluding build output directories such as
      `artifacts/`, `hardhat-cache/`, `contracts/out/`, `contracts/cache/`,
      `src/.next/`, `site/`, and `node_modules/`) to verify code correctness and
      consistency.
    - **Code correctness:** Confirm that every feature in the codebase works as
      intended end-to-end, remove any duplicate or redundant logic, and ensure
      all code paths follow current security and compliance best practices
      (input validation at system boundaries, no exposed secrets, no OWASP Top
      10 vulnerabilities such as XSS, injection, or insecure direct object
      references).
    - **Grammar and style:** Review every user-facing string, comment, variable
      name, and prose block for correct grammar, punctuation, capitalization,
      and syntax. Fix inconsistencies so the codebase reads uniformly.
    - **Documentation sweep:** After the code sweep, update all files in `docs/`
      so they accurately reflect the current state of the codebase. Fix any
      grammar, punctuation, capitalization, or syntax errors in every sentence,
      heading, and code block comment across all documentation files.

- [ ] Create more tests for the features that will be implemented, and add tests
      for the ones that are not yet covered, to ensure the platform is robust
      and reliable before the mainnet launch.
    - Write unit tests for all frontend components, backend logic, and smart
      contract interactions, plus integration tests covering end-to-end user
      flows. Aim for high coverage to catch bugs before they reach production.
    - Consider Jest and React Testing Library for the frontend and Supertest for
      any backend API routes. For smart contracts, use Hardhat's testing
      framework to cover all contract functions and edge cases.

- [ ] Add accessibility features to the frontend so the platform is usable by
      people with disabilities, including screen reader support, keyboard
      navigation, and adjustable color contrast.

- [ ] Add error monitoring and analytics (for example Sentry for error tracking
      and a privacy-respecting analytics tool) to surface production issues and
      usage patterns.

- [ ] Add any other useful tools, libraries, APIs, or cloud services (for
      example GCP) that are free for development and testing and that can speed
      up development, improve the user experience, or enhance platform
      functionality.

## Phase 8 — Privacy (Post-Launch)

- [ ] Investigate privacy improvements using zero-knowledge proofs and/or a
      transaction relayer — specifically, hiding wallet addresses, contract
      amounts, and counterparty identities on the frontend.
    - This is explicitly a non-goal for the initial release. Track it as a
      post-launch improvement once the core platform is stable on mainnet.
    - Potential approaches: a relayer that submits transactions on behalf of
      users (concealing the sender's address), ZK proofs that verify eligibility
      without revealing identity, or a privacy-preserving wrapper for
      `contractURI` so the document is not publicly linkable to either wallet.

## Phase 9 — Documentation and Mainnet Launch

- [ ] Finalize the TrustLedger whitepaper and publish it as
      `docs/TrustLedger_Whitepaper_v1.0_2026.pdf`.
    - Commit the final PDF to `docs/` and link to it from `README.md`, all
      documentation markdown files, and the GitHub Pages site navigation.
    - Create Dune Analytics dashboards to visualize key on-chain metrics:
      contracts created over time, total value locked, dispute rate, juror
      participation, and reputation score distributions. Publish the dashboard
      URL in the docs and `README.md` so contributors and users can track
      platform activity.
    - Document how Dune is set up to query the contracts, including the SQL
      queries used for each chart and any relevant schema details. - Also
      document how Dune was used to generate data, visualizations, and insights
      during the whitepaper research phase, so future contributors understand
      the data-driven approach to platform design and improvement.
    - Ensure that everything in this project up to this point, any
      configurations, files, codebase, features, things to note, and other
      relevant information has been documented inside the respective docs files
      in the `docs/` directory, so that the documentation is comprehensive and
      serves as a reliable reference for users and contributors. Ensure that it
      is also inside the whitepaper PDF itself, so that the whitepaper is a
      standalone document that fully explains the platform, its design
      decisions, and its implementation details.

## Completed

- [x] Allow users to earn back reputation by successfully completing new
      contracts or performing well during arbitration, so that a bad rating does
      not permanently damage a client's or freelancer's ability to get work.
    - This could involve a decay function for reputation scores over time, or
      letting users "redeem" themselves by completing a number of successful
      contracts after a low rating.
    - Implemented via a recovery mechanism in `ReputationRegistry`: scores ≤ 30
      enter recovery mode; three subsequent scores ≥ 70 resolve one recovery
      period and apply a synthetic +50-point bonus rating. Exposed via
      `recoveryStatus(address)` on both the contract and `IReputationRegistry`.

- [x] Fix the division in the formula to be 2/3, not 2/300, and add a worked
      example to the README and documentation. The formula in the code is
      correct, but the README had an outdated version. It should be
      `rawPay = (2 × pct × amount) / 3`, not
      `rawPay = (2 × pct × amount) / 300`.
    - A worked numeric example also helps users understand the fee and payment
      calculations in practice. - `400 = (2 × 40% × 1000) / 3`
    - Update the documentation so it no longer describes freelancers as getting
      60% of the contract amount for 60% completion, to avoid confusion with the
      2/3 formula. Clarify instead that the freelancer gets 2/3 of the "earned
      amount" (pct × amount) and the fee is taken from that.

- [x] Implement a decrypt frontend UI for encrypted contract documents.
    - Context: the "Encrypt before upload (AES-256-GCM)" feature uploads an
      encrypted JSON bundle to IPFS, so fetching the `contractURI` via a gateway
      returns ciphertext, not the file. There was previously no in-app way to
      decrypt it.
    - `decryptFile()` already exists and is tested in `src/lib/encryption.ts`
      (the symmetric counterpart to `encryptFile`) but was not wired into any
      UI.
    - Added `DecryptDocumentForm` to `src/app/dashboard/page.tsx`: contract
      cards with a document URI show a "Decrypt" toggle next to "View".
    - Clicking it expands a full-width panel with a "Fetch from URI" / "Paste
      bundle" source toggle, a passphrase field, an output filename field, and a
      "Decrypt & Download" button that calls `decryptFile()` and triggers a
      browser download. A wrong-passphrase `OperationError` is surfaced as a
      human-readable message.

- [x] Build out the `reputation/` page further (rating lookup and submission
      already work today).
    - Already works: address lookup, "use my wallet", and `averageRating(addr)`
      → score/100 plus rating count, with loading, error, and not-deployed
      states. Rating submission is wired on the dashboard via
      `submitRating(id, score)`.
    - Constraint: `ReputationRegistry` only stores a cumulative `(sum, count)`
      per address (no per-rating history or role split), so the read side is
      currently maxed out against the available on-chain data.
    - (Now, frontend-only, no redeploy) Add a rating history feed: query
      `RatingSubmitted` events with viem `getLogs` for the looked-up address and
      render recent ratings (score, rater, contract id, block timestamp).
      Roughly 40-60 lines plus a small component.
    - (Mainnet, needs contract change and redeploy) Split reputation by role (as
      client versus as freelancer) so a score reflects the context it was earned
      in.
    - (Mainnet, needs contract change and redeploy) Store richer per-rating data
      on-chain (for example an optional comment and timestamp) to support a
      fuller reputation profile.

- [x] Document the GitHub Pages setup and deployment process in the README or a
      separate CONTRIBUTING.md file, so future contributors can easily
      understand how to update the documentation site. — added a "Documentation
      Site" section to `docs/CONTRIBUTING.md`.
    - [x] Fix the Vercel command failing on the `gh-pages` branch. — disabled
          via `git.deploymentEnabled.gh-pages: false` in `src/vercel.json`.
    - [x] Fix the `/` endpoint to point to Home instead of the default GitHub
          Pages landing page, which returned a 404. — added a `docs/index.html`
          meta-refresh redirect to `Home/` (not synced to the wiki, since
          `wiki-sync` only copies `*.md`).
    - [x] Pages were broken and all returned a 404. — The root cause was
          `Home.md` using bare links like `[Architecture](ARCHITECTURE)`; MkDocs
          only rewrites links ending in `.md`, so they resolved to
          `/Home/ARCHITECTURE`. Added `.md` to all 9 links (every other doc
          already used `.md`).
    - [x] Add a Jekyll or MkDocs theme to the GitHub Pages site to improve the
          appearance and navigation of the documentation.
        - Enhanced the existing MkDocs Material theme in `mkdocs.yml`:
          light/dark palette toggle, logo and favicon (`docs/assets/`), GitHub
          repo icon, edit and view links (`edit_uri`), expanded navigation
          (instant loading, tracking, footer, `toc.follow`), search (suggest and
          share), and content features (code annotations, linked tabs,
          tooltips).
        - Added richer markdown extensions (details, tasklist, emoji, snippets,
          footnotes, attr_list). Pinned dependencies in `requirements-docs.txt`
          and pointed `docs.yml` at it. Small brand polish in
          `docs/assets/extra.css`.

- [x] Set up GitHub Pages for documentation — deployed via MkDocs Material
      (`mkdocs.yml` + `.github/workflows/docs.yml`).
    - Auto-deploys to the `gh-pages` branch on every push to `main` that touches
      `docs/` or `mkdocs.yml`.
    - Site URL: <https://kevinle3212.github.io/TrustLedger>
    - Remaining: enable GitHub Pages in the repo settings (Settings → Pages →
      Source: Deploy from branch → gh-pages / root), then link it from the
      README and the main website.

- [x] Update documentation for things that were missing or incomplete:
    - [x] Smart contract documentation: add more detailed explanations of the
          smart contract functions, events, and data structures, plus example
          interactions. — added the `Status` and `Phase` enums and the
          `EscrowContract` and `Dispute` struct definitions to
          `docs/CONTRACTS.md`, plus an "Example Interactions" section with
          `cast` and viem snippets for the happy path and the dispute/juror flow
          (and event reads).
    - [x] GitHub Pages documentation: add more detailed guides and tutorials for
          using the documentation site, plus troubleshooting tips for common
          issues. — expanded the "Documentation Site" section in
          `docs/CONTRIBUTING.md` with navigating-the-site and local-preview
          tutorials and a troubleshooting table for common doc-site issues.
    - [x] Add a FAQ.md file to address common questions and issues, referenced
          from the documentation and GitHub Pages. — created `docs/FAQ.md`
          (clients, freelancers, jurors, disputes, fees, developers, doc-site)
          and referenced it from the `mkdocs.yml` nav, `Home.md` index, and
          `CONTRACTS.md` related docs.
