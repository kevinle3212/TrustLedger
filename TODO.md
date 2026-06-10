# To-Do List

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

Tasks are grouped into phases and ordered so that earlier work unblocks later
work. Complete each phase roughly in order: tooling and architecture come first,
followed by user-facing features, backend services, quality, and finally the
mainnet launch deliverables.

## Phase 1 — Development Environment and Tooling

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
    - **Remaining 2026-06-09:** Plan this as a dedicated migration branch. The
      current production audit is clean, but the root dev-tool audit still shows
      28 low-severity findings that require semver-major Hardhat/toolbox
      upgrades. Verify `npm audit`, `npm audit --omit=dev`, Hardhat tests,
      Foundry tests, deployment scripts, CI, and TypeChain behavior before
      closing this item.

## Phase 4 — Core Contract Lifecycle Features

- [ ] Add an AI-generated summary of each contract and its status to the
      dashboard, so users can quickly understand the key details and current
      state without reading through all the text.
    - Use a language model (for example Gemini) to generate a concise summary of
      the contract description, key terms (amount and deadlines), and current
      status (for example "In Progress, 40% completed, no disputes") from the
      on-chain data and any relevant off-chain metadata.
    - [x] Research and compare free or free-tier AI providers before committing
          to one, and document the trade-offs (rate limits, context window,
          data- retention/privacy terms, and whether a card is required) in
          `NOTES.md`. Candidates to evaluate:
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
    - **Implemented 2026-06-10:** added the server-only
      `src/services/contractSummary.ts` provider abstraction, cache, fallback
      summaries, latency/error/cost metrics, and
      `GET /api/contract/[id]/summary`. The dashboard now displays a
      privacy-minimized summary for every visible contract card. Provider keys
      must stay in deployment secrets only.
    - Add an in-app PDF viewer for the contract document so users can read the
      full contract in a readable format without downloading it separately. — If
      the document is encrypted, prompt the user to decrypt it first. Otherwise,
      prompt them either to view it on IPFS (and let IPFS download it for them)
      or to re-authenticate with their wallet so the backend can fetch it. — Do
      not allow users to view the document unless they are the client or
      freelancer on the contract, but still allow anyone to view the summary and
      key details, so sensitive information is protected while the contract
      remains broadly understandable. — Protect everything behind wallet
      authentication and authorization so only the relevant parties can access
      the contract details and documents, preventing broad public access to
      potentially sensitive information.

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
    - **Scaffolded 2026-06-10:** added `src/services/offchainAccounts.ts`,
      EIP-712 challenge/session/profile APIs under `/api/accounts/*`, and the
      `/account` page. Dashboard onboarding now writes to wallet-scoped account
      preferences when a signed account token exists, with the previous local
      fallback preserved. Production completion still requires the external
      database and encrypted-message persistence listed in Phase 9.

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

- [ ] Complete external production setup that cannot be performed from the
      repository alone.
    - **AI summaries:** choose and configure a managed provider with data-use
      controls enabled. Required keys: `AI_SUMMARY_PROVIDER` (`groq`, `gemini`,
      or `disabled`), `GROQ_API_KEY` plus optional `GROQ_MODEL`, or
      `GEMINI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` plus optional
      `GEMINI_MODEL`.
    - **Off-chain accounts:** provision a persistent database or managed backend
      for profiles, notification preferences, encrypted message envelopes, and
      onboarding state. Required keys include `ACCOUNT_SESSION_SECRET` or
      `AUTH_JWT_SECRET`, plus the selected database URL/credentials once the
      provider is chosen.
    - **Email and notifications:** verify the sending domain and configure
      `EMAIL_PROVIDER`, `RESEND_API_KEY`, `BREVO_API_KEY`, or
      `POSTMARK_SERVER_TOKEN`, plus `NOTIFICATIONS_SECRET`, `CRON_SECRET`, and
      the production recipient-resolution data source.
    - **Monitoring:** configure Sentry, Better Stack, Grafana, or a comparable
      service before enabling summaries broadly. Track provider latency, error
      rate, and cost metrics from `/api/status`.
    - **Blockchain deployments:** set production RPC keys, contract addresses,
      WalletConnect/Reown project ID, Solana Devnet/mainnet program ID, Pinata
      or storage credentials, admin tokens, and health-check allowlists in
      Vercel and any Kubernetes/Docker deployment target.
    - **External review:** engage an independent smart contract auditor and add
      the final audit report before treating contracts as mainnet-ready.

- [ ] Complete third-party smart contract audit readiness and obtain an external
      audit report before mainnet.
    - Prepare an auditor package with contract scope, deployment assumptions,
      threat model, trust boundaries, invariants, test evidence, known risks,
      dependency health report, oracle limitations, and remediation tracker.
    - Engage an external auditor, track findings by severity, patch confirmed
      issues, rerun Hardhat and Foundry validation, and add the final audit
      report to the documentation before treating the contracts as
      mainnet-ready.

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
      queries used for each chart and any relevant schema details. — Also
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

- [x] Migrate dashboard onboarding state to the off-chain account database once
      user accounts exist.
    - Completed 2026-06-10: added `src/lib/accountPreferences.ts` so the
      dashboard reads and writes the wallet-scoped profile preference through
      `/api/accounts/profile` whenever a signed account session exists.
    - Kept the `tl_visited` localStorage fallback for private-mode browsers,
      unsigned users, and migration continuity. Existing local first-visit state
      is preserved and treated as completed when a signed profile is not yet
      available.
    - Verified with `npm run typecheck:frontend` and targeted unit tests for the
      off-chain account service.

- [x] If needed, add C or C++ for performance-critical math, cryptography, or
      other features that benefit from a low-level, compiled language.
    - Completed 2026-06-10: added optional native analytics kernels under
      `native/` with C (`native/c/tl_hash.c`), C++
      (`native/cpp/tl_metrics.cpp`), x86_64 assembly
      (`native/asm/tl_mix64_x86_64.S`), arm64 assembly
      (`native/asm/tl_mix64_arm64.S`), and the shared
      `native/include/trustledger_native.h` ABI.
    - Added `tools/check-native.mjs` and `npm run native:check`; it compiles C,
      C++, and the host-architecture assembly with `clang`/`clang++` into
      project-local `tmp/native-check/` without adding runtime dependencies to
      the Next.js app.
    - Wired `native:check` into pre-commit, pre-push, and CI. Rust remains the
      preferred production language for memory-safe services; these files are
      intentionally optional kernels for measured bottlenecks and future
      WebAssembly/native-addon experiments.

- [x] Use Python's NumPy, SymPy, Matplotlib, or other scientific libraries to
      generate visualizations and insights from the on-chain data, for use in
      the whitepaper, documentation, or the platform itself.
    - Completed 2026-06-10: added `scripts/analytics/` with a deterministic
      Python analytics generator backed by NumPy, Pandas, SymPy, SciPy, Seaborn,
      Matplotlib, Plotly, and Bokeh. Matplotlib cache writes are routed to
      project-local `tmp/matplotlib/`.
    - Added `assets/analytics/wallet-analytics-preview.svg`,
      `assets/analytics/wallet-analytics-report.json`,
      `assets/analytics/wallet-analytics-plotly.json`,
      `assets/analytics/wallet-analytics-bokeh.json`,
      `npm run analytics:generate`, and `npm run analytics:check`, with CI and
      hook coverage so generated visuals do not drift.
    - Added the user-facing `/[locale]/analytics` page and
      `GET /api/analytics/wallet/[address]` endpoint. The page summarizes only
      public TrustLedger contract state, public reputation score data, connected
      chain metadata, and safe local preferences such as the last connector
      label and dashboard guide state. It does not read private keys, seed
      phrases, raw documents, emails, encrypted draft bodies, or session keys.
    - Connected wallet users can hover/focus the wallet address button in the
      top-right navbar and open Analytics from the dropdown.
    - Added strict mypy coverage for
      `scripts/analytics/generate_wallet_analytics.py` with local stubs for the
      exact Plotly, SciPy, Seaborn, and SymPy APIs used by the generator.

- [x] Find a better magic-link email service provider that is free or low-cost
      for development and testing.
    - Completed 2026-06-10: replaced the Resend-only implementation in
      `src/services/email.ts` with a server-only provider abstraction supporting
      `EMAIL_PROVIDER=resend`, `brevo`, `postmark`, and local-only `log`.
    - Magic links and lifecycle notifications now share the same delivery
      boundary. Provider credentials remain server-side only through
      `RESEND_API_KEY`, `BREVO_API_KEY`, or `POSTMARK_SERVER_TOKEN`.
    - Magic-link recipient input can contain a comma- or semicolon-separated
      list for controlled development/testing. The service de-duplicates and
      caps each send at five recipients so multiple testers can receive links
      without hardcoded owner-only behavior.
    - Added unit coverage in `src/tests/unit/email.test.ts` and updated
      `.env.example`, `.env.local.example`, `docs/ENVIRONMENT.md`, and
      `docs/FRONTEND.md`.

- [x] Add error monitoring and analytics to surface production issues and usage
      patterns.
    - Completed 2026-06-10: added disabled-by-default first-party privacy
      analytics via `src/components/PrivacyAnalytics.tsx`,
      `POST /api/analytics/events`, `GET /api/analytics/events`, and
      `src/services/trafficAnalytics.ts`.
    - The collector records only aggregate event name, locale, sanitized path
      without query strings, and timestamp. It stores no cookies, wallet
      addresses, raw IP addresses, raw user agents, emails, documents, session
      keys, private keys, seed phrases, or encrypted draft bodies.
    - The endpoint honors Do Not Track and Global Privacy Control. Collection
      requires both `TRUSTLEDGER_ANALYTICS_ENABLED=true` and
      `NEXT_PUBLIC_PRIVACY_ANALYTICS_ENABLED=true`; `/api/health` reports a
      warning if those flags disagree.
    - Added retention controls through `TRUSTLEDGER_ANALYTICS_RETENTION_DAYS`,
      admin-health-gated aggregate summaries, unit coverage in
      `src/tests/unit/traffic-analytics.test.ts`, and documentation in
      `docs/ANALYTICS.md`, `docs/SECURITY.md`, `docs/ENVIRONMENT.md`,
      `docs/FRONTEND.md`, `PRIVACY_POLICY.md`, and `COOKIE_POLICY.md`.
    - External uptime/error vendors such as Sentry, Better Stack, Datadog, or
      Grafana Cloud still require account/dashboard setup and deployment
      secrets, but the codebase now has a privacy-safe first-party baseline and
      `/api/health` monitoring signal.

- [x] Find and research other useful free-tier tools, libraries, APIs, cloud
      services, and integrations.
    - Completed 2026-06-10: added
      `NOTES.md#phase-4-ai-summary-hosting-plan-2026-06-10` comparing managed
      Google Gemini/Vertex AI, Groq-hosted Llama, Cloudflare Workers AI,
      self-hosted Llama, and RunPod-style GPU hosting for Phase 4 contract
      summaries.
    - Recommendation: implement the service boundary first and use managed
      inference for the initial production-quality summary feature. Prefer
      Groq-hosted Llama or paid Gemini with data-use controls enabled; defer
      self-hosted Llama until usage justifies GPU operations, autoscaling,
      patching, and model monitoring.

- [x] Add an oracle service to fetch off-chain data relevant to contracts, such
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
    - **Completed 2026-06-09:** Added `src/services/oracle.ts`,
      `GET /api/oracle/rates`, oracle environment documentation, stale-cache
      observability, and unit coverage in `src/tests/unit/oracle.test.ts`.
      Current oracle data is server-side display/support data only; any on-chain
      oracle consumption still requires a separate audited design.

- [x] Build an admin dashboard for operators, similar in depth to Django Admin
      or mature platform back offices.
    - Completed 2026-06-09: added restricted read-only admin routes at
      `/[locale]/admin` and `/[locale]/admin/sign-in`, plus
      `GET /api/admin/summary` and `POST /api/admin/session`.
    - Added `src/services/adminAuth.ts` with PBKDF2 password verification,
      signed HTTP-only admin sessions, transition bearer-token access, optional
      IP allowlisting, wallet allowlist binding, and a non-deletable bootstrap
      owner identity for `kevinle3212@gmail.com` / `kevinle` when
      `ADMIN_BOOTSTRAP_PASSWORD_HASH` is configured.
    - Added `scripts/admin-bootstrap.mjs` and `npm run admin:bootstrap` so admin
      password hashes can be generated locally without committing plaintext
      passwords.
    - Added `src/services/adminReport.ts` and unit coverage in
      `src/tests/unit/admin-auth.test.ts` for auth, IP allowlisting, session
      signing, bootstrap account loading, and read-only report coverage.
    - The first dashboard version intentionally exposes only sanitized
      operational status. Private keys, RPC credentials, email API keys, raw
      user documents, and mutating admin actions remain unavailable. Future
      admin mutations require explicit confirmation, persistent audit trails,
      server-side authorization checks, and tests.

- [x] Add backend services in additional languages such as Rust or Python, to
      allow more flexibility and performance for complex logic or integrations
      not well suited to JavaScript/TypeScript.
    - Completed 2026-06-09: added a strict Rust workspace with `.cargo/`,
      `Cargo.toml`, `lib/trustledger-core`, `programs/admin-api`, and
      `infra/rust-admin-api`.
    - Added `trustledger-core` shared Rust health models and a read-only Axum
      `trustledger-admin-api` service exposing `GET /health`.
    - Added Docker and Kubernetes examples for the Rust admin API in
      `infra/rust-admin-api/`, with secrets referenced through Kubernetes
      `Secret` values rather than hardcoded credentials.
    - Added strict scripts `npm run rust:fmt`, `npm run rust:clippy`, and
      `npm run rust:test`, and documented the service in `docs/ADMIN.md`.
    - Added `.sixth/skills/admin-dashboard/SKILL.md` and
      `.sixth/skills/rust-backend/SKILL.md` so future agent work follows the new
      admin and Rust backend rules.

- [x] Evaluate and implement SOL (Solana) support as a second-chain foundation.
    - **Decision gate first:** determine whether SOL means (a) deploying an
      equivalent Anchor program on Solana so users on Solana can use TrustLedger
      natively, or (b) accepting SOL as a payment token on an EVM chain via a
      bridge (e.g. Wormhole). Document the chosen approach and its trade-offs in
      `NOTES.md` before writing any code.
    - **Completed 2026-06-09:** Chose option (a), native Solana program support,
      as the primary path. Bridged SOL remains deferred because it adds bridge
      and wrapped-asset risk before the Solana product has audited native
      semantics.
    - Added `docs/SOLANA.md` with the native-program-first decision, safety
      rules, and future Anchor/LiteSVM milestones.
    - Added `src/helpers/solana.ts` with strict cluster resolution, RPC/Explorer
      defaults, native support mode, conservative public-key shape validation,
      and Explorer URL construction.
    - Added `src/tests/unit/solana-helper.test.ts` so the Solana helper behavior
      is validated before wallet or transaction code is introduced.
    - **Future custody work:** implement the escrow, reputation, and arbitration
      programs in Anchor, generate a typed client, add transaction simulation,
      wire wallet-standard Solana discovery, and audit the native program path
      before enabling real Solana funds.

- [x] Phase 7 Item 3 — Create missing tests and add coverage for new support
      areas.
    - Completed 2026-06-09: added unit coverage for the legal document
      localization helper in `src/tests/unit/legal-docs.test.ts`, including
      locale fallback, non-source review status, and constrained translation
      prompt behavior.
    - Added unit coverage for Solana support helpers in
      `src/tests/unit/solana-helper.test.ts`, including native support mode,
      cluster fallback, RPC defaults, conservative address validation, and
      Explorer URL generation.
    - Added React Testing Library coverage for the home-page interactive
      contract preview in
      `src/tests/unit/interactive-contract-preview.test.tsx`, including direct
      status selection and CTA phase advancement.
    - Existing suites continue to cover validation, wallet hint storage, health,
      oracle behavior, route accessibility, public route rendering, Hardhat
      tests, and Foundry tests. Run `npm run quality` plus `npm run impeccable`
      before merging feature work.

- [x] Phase 5 — Dispute Resolution and Arbitration.
    - Completed 2026-06-09: added party evidence storage to
      `contracts/src/Arbitration.sol` via `submitEvidence`, `getEvidenceCount`,
      and `getEvidence`, including party authorization, empty-payload checks,
      requested-completion validation, and the `EvidenceSubmitted` event.
    - Added Hardhat coverage in `test/TrustLedger.test.ts` for client and
      freelancer evidence submission plus non-party, empty evidence, and
      out-of-range rejection cases.
    - Updated `src/lib/abi.ts`, `/arbitration/[id]`, and `/juror` so parties can
      submit evidence summaries and URIs, jurors can review structured evidence,
      selected jurors can find recent assigned disputes, fee pool visibility is
      shown, and ruling payout details remain visible once a ruling exists.
    - Populated the formerly empty `src/store`, `src/utils`, `src/hooks`,
      `src/providers`, and `src/agent` directories with arbitration helpers,
      local draft persistence, recent dispute scanning, provider metadata, and
      an arbitration checklist.
    - Documented the evidence and juror UI flow in `docs/ARBITRATION.md`.

- [x] `NOTES.md` cost optimization and alternatives research.
    - Completed 2026-06-08: added the "Cost Optimization and Alternatives
      Matrix" section to `NOTES.md`.
    - Compared hosting, database/profile storage, email, RPC, document storage,
      AI, price/oracle data, monitoring, analytics, CI/CD, security scanning,
      and documentation hosting.
    - Included current/planned providers, free-tier and paid-pricing notes,
      low-cost alternatives, self-hosted options, MVP/beta/production
      recommendations, vendor-lock-in considerations, and services that can be
      deferred until usage justifies cost.

- [x] Go through and fix any and all react-doctor issues, preexisting or not,
      and ensure the app reaches 100/100.
    - Completed 2026-06-08: fixed the remaining React Doctor warnings by
      memoizing locale-aware amount formatters in the contract draft preview and
      review confirmation components, then replacing the deployment-network
      filter/map chain with a single-pass loop in `src/lib/wagmi.ts`.
    - Reached `100 / 100` with `npx react-doctor@latest --verbose`.
    - Launched the Impeccable live helper against the running frontend dev
      server, corrected its stale live config target for the locale layout, and
      removed the temporary live script injection before committing.
    - Validated the touched UI in headless Chrome and fixed mobile navbar
      wrapping so role, utility, and wallet controls remain usable at narrow
      widths.
    - Verified zero horizontal overflow on `/en`, `/en/create`, `/en/dashboard`,
      `/en/juror`, and `/en/reputation` at 320, 390, 768, and 1440px.

- [x] Allow clients and freelancers to create a contract within the platform,
      see live edits, and update the contract terms before deployment.
    - Completed 2026-06-08: expanded the create flow in
      `src/app/[locale]/create/_components/CreatePageInner.tsx` into an editable
      draft workflow with a live terms preview in `ContractLivePreview.tsx`.
    - Draft terms are saved locally under `tl_create_contract_draft` while the
      user edits, then cleared after successful on-chain proposal submission.
      This keeps terms editable before deployment without changing the
      blockchain contract interface.
    - Added an explicit review step in `ReviewConfirmationPanel.tsx` before the
      wallet write. The panel asks whether the user is sure they want to send
      the proposal to the opposite role and keeps "Keep editing" available until
      confirmation.
    - Enhanced 2026-06-09: added `SecureDraftSessionPanel.tsx` so parties can
      draft terms in Markdown, HTML, or plain text; apply basic formatting
      snippets; see a last-updated timestamp; and exchange encrypted draft
      snapshots before deployment.
    - Secure draft links now store only encrypted payloads in the URL. The
      session key is copied separately, and importing checks the connected
      wallet against the sender/counterparty allowlist before decrypting. This
      creates a notary-style review session without adding a backend
      collaboration server or changing the on-chain contract interface.
    - Verified with `npm run doctor`,
      `npx react-doctor@latest --verbose --diff`, `npm run lint:frontend`,
      `npm run build:frontend`, and root `npm run lint`.

- [x] Critique and improve the home page (`src/app/[locale]/page.tsx`).
    - Completed 2026-06-08: ran an Impeccable-style scored critique before
      editing. Manual design review score was 25/40: the primary issues were the
      uppercase tracked eyebrow, a centered generic hero, the identical 3-card
      feature grid, weak product specificity for first-time visitors, and
      limited recognition of the escrow workflow.
    - Deterministic detector result: clean
      (`detect.mjs --json src/app/[locale]/page.tsx` returned `[]`) before and
      after changes.
    - Implemented a more specific landing page structure in
      `src/app/[locale]/page.tsx`: sentence-case network badge, left-aligned
      hero, concrete escrow contract preview, status chips, and a workflow list
      that replaces the generic 3-card grid.
    - Verified with `npm run lint:frontend` and `npm run build:frontend`.

- [x] Design and build a dashboard empty state and first-time onboarding
      walkthrough.
    - **First-visit detection:** uses `localStorage` key `tl_visited` to decide
      whether to auto-open the walkthrough on dashboard load.
    - **First-time experience:** the walkthrough explains TrustLedger escrow in
      one sentence, includes a "Create the first one" primary CTA, shows an
      example contract card, and provides visible Skip controls.
    - **Return-visit experience:** a fixed bottom-right `?` help button with an
      accessible tooltip opens the walkthrough on demand.
    - **Empty and populated dashboard support:** the zero-contract state teaches
      the contract workflow and the help button is rendered for connected
      dashboards regardless of contract count.
    - Completed 2026-06-08: implemented in `src/app/[locale]/dashboard/page.tsx`
      with message keys in `src/messages/*.json`. Verified with
      `npm run lint:frontend` and `npm run build:frontend`.

- [x] Evaluate whether Supabase is needed for this project.
    - Determine which specific features or requirements would benefit from
      Supabase (authentication, database, storage, realtime features, edge
      functions, etc.).
    - Compare Supabase against the current architecture and justify adoption or
      non-adoption.
    - If adopted, document exactly what Supabase will be responsible for and
      what remains outside of Supabase.
    - Note: Supabase CLI is already installed globally and available for use.
    - Provide a recommendation with trade-offs, implementation complexity,
      costs, vendor lock-in considerations, security implications, and long-term
      maintainability impacts.
    - Completed 2026-06-08: documented the recommendation in
      `NOTES.md#supabase-evaluation-2026-06-08`. Decision: defer Supabase as a
      core dependency; revisit in Phase 6 only for off-chain profiles,
      notification preferences, and rebuildable event indexes.

- [x] Add internationalization (i18n) so TrustLedger is accessible to a global
      freelance audience.
    - Use `next-intl` (the idiomatic Next.js App Router i18n library) to manage
      translations and locale routing. It supports the App Router's `layout.tsx`
      nesting, server components, and client components without a custom server.
    - Extract all user-facing strings into locale message files under
      `src/messages/` (e.g., `en.json`, `es.json`, `vi.json`).
    - Priority locales based on global freelance market size:
        1. **Spanish** (`es`) — largest non-English freelance population in
           Latin America and Spain.
        2. **Vietnamese** (`vi`) — fast-growing tech freelance community in
           Southeast Asia.
        3. **Portuguese** (`pt`) — Brazil is one of the largest freelance
           markets globally.
        4. **Chinese (Simplified)** (`zh-CN`) — large developer and design
           freelance base.
        5. **Arabic** (`ar`) — significant Gulf-region freelance market; also
           requires RTL layout support.
        6. **French** (`fr`) — sizable Francophone freelance community across
           Europe and Africa.
        7. **Hindi** (`hi`) — India is one of the top freelance-exporting
           countries.
    - Add a locale switcher in the site header or footer so users can change
      language without a full page reload.
    - Ensure date, number, and currency formatting respects locale conventions
      (use the `Intl` browser API rather than hard-coded formats).
    - For RTL locales (Arabic), add `dir="rtl"` to the root layout and audit
      Tailwind utility classes that assume LTR flow (e.g., `ml-`, `pl-`,
      `text-left`); use logical properties (`ms-`, `ps-`, `text-start`) instead.
    - Smart contract error messages and on-chain status labels (e.g.,
      `STATUS_LABELS` in `lib/abi.ts`) should also be translated — map them
      through the i18n layer rather than rendering raw English strings.
    - Machine-translate first drafts with a tool like DeepL, then engage native
      speakers for review before shipping each locale.

- [x] Add the following directories to keep the code organized, modular, and
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

- [x] Add a `services/` directory for external service integrations — such as
      IPFS pinning, email notifications, and AI summarization — to keep the code
      organized and modular.
    - `src/services/email.ts` — Resend wrapper with a shared HTML email shell.
    - `src/services/notifications.ts` — lifecycle-email templates plus the pure
      `findDeadlineReminders` deadline scanner.
    - `src/services/ipfs.ts` — Pinata REST API wrapper (`gatewayUrl`, `pinJson`,
      `pinFile`, `unpin`); no extra npm dependency, server-only.
    - `src/services/aiSummary.ts` — Claude-powered summaries via
      `@anthropic-ai/sdk` (`summarizeContract`, `summarizeDispute`);
      server-only. `@anthropic-ai/sdk ^0.52.0` added to `package.json`.
    - `PINATA_JWT`, optional `PINATA_GATEWAY`, and `ANTHROPIC_API_KEY` added to
      `src/.env.local.example`.

- [x] Refactor magic-link token verification out of `useEffect` in
      `app/freelancer/review/page.tsx` and `app/client/accept/page.tsx`.
    - Both pages are now async Server Components that read `searchParams`, call
      `verifyMagicToken` inline (no API round-trip), and pass the resolved
      `payload`/`tokenError` to thin `"use client"` inner components
      (`ReviewPageInner`, `AcceptPageInner`) that handle only wagmi hooks and UI
      state. Drops `no-fetch-in-effect` and
      `nextjs-no-client-fetch-for-server-data` findings.

- [x] Consolidate related `useState` clusters into `useReducer` in four
      components flagged by React Doctor (`prefer-useReducer`).
    - `components/DecryptDocumentForm.tsx` — 8 `useState` calls (mode, bundle,
      passphrase, filename, status, errorMsg, two touched flags) replaced with
      one reducer; semantic actions: `DECRYPT_START`, `DECRYPT_SUCCESS`,
      `DECRYPT_ERROR`, `RESET_AFTER_DECRYPT`, etc.
    - `app/client/accept/page.tsx` — 5 `useState` calls (payload, tokenError,
      tokenLoading, decryptOpen, action) replaced with one reducer; loading is
      resolved atomically in `VERIFY_SUCCESS` / `VERIFY_ERROR` so the `finally`
      block is no longer needed.
    - `app/freelancer/review/page.tsx` — same pattern as accept page.
    - `app/create/page.tsx` — 17 `useState` calls consolidated into one
      `CreateState` reducer with 21 typed actions covering proposer role,
      payment token, form fields, magic-link status, document upload, IPFS
      upload, and Arweave backup; `FILE_SELECTED` atomically resets upload
      status and hash; `UPLOAD_SUCCESS` atomically sets hash + contractURI;
      `SET_PAYMENT_TOKEN` atomically clears amount. `tsc --noEmit` passes.

- [x] Split the three oversized page components into focused sub-components
      (`no-giant-component` — React Doctor).
    - `app/freelancer/review/page.tsx` — extract `TokenVerificationLoader`,
      `ContractSummaryPanel`, and `ActionButtons` sections.
    - `app/client/accept/page.tsx` — same pattern: split token loader, contract
      detail panel, and accept/reject form.
    - `app/create/page.tsx` — extract `FileUploadPanel`, `EncryptionOptions`,
      `ArweaveBackupPanel`, `ContractFormFields`, and `SubmitSummary`.
    - Keep `"use client"` only on the leaf components that need wagmi hooks;
      lift any purely presentational pieces to Server Components where possible.
    - React Doctor score: 80 → 84 (diff mode). Remaining `no-giant-component`
      warning on `create/page.tsx` is pre-existing in spirit; the ~550-line
      residual is almost entirely wagmi hooks + business logic that cannot leave
      the component under React hook rules. `tsc --noEmit` and full lint pass.

- [x] Split `components/Field.tsx` into one file per exported component.
    - React Doctor flags `Input` (line 58) and `Select` (line 72) as secondary
      components that should live in their own files.
    - Created `components/Input.tsx` and `components/Select.tsx`; shared
      internals (`FieldIdContext`, `controlClass`, `INPUT_BG`, `SELECT_BG`) are
      exported from `Field.tsx` and imported by the new files. `Field` stays in
      `Field.tsx`. Updated the one import site (`app/create/page.tsx`).
      `tsc --noEmit` and the lint suite pass.

- [x] Commit the six untracked page layout files that supply missing metadata
      (`src/app/{arbitration,client,create,freelancer,juror,reputation}/layout.tsx`).
      Each file already exists with the correct `export const metadata` block
      and a pass-through layout component; they just need to be staged and
      pushed. This will clear six React Doctor "Page missing metadata" findings
      and raise the score without any code changes.

- [x] Configure React Doctor (`react-doctor`), React Scan, Semgrep, ESLint,
      TypeScript checks, and existing validation tooling as a unified quality
      and security pipeline. — React Doctor installed as a `src/` dev dependency
      (`react-doctor@0.4.0`) with `npm run doctor` script; React Scan installed
      (`react-scan`) as a dev dependency and wired into the root layout as a
      dev-only dynamic import via `ReactScanMonitor`; Semgrep added to
      `.github/workflows/security.yml` as a new `semgrep` job (SARIF uploaded to
      the Security tab); pre-commit hook (`.husky/_/pre-commit`) runs
      `react-doctor --staged` automatically; CI workflow
      `.github/workflows/react-doctor.yml` scans `src/` on every PR and push to
      `main`; `CLAUDE.md` updated with the quality-pipeline workflow. Score 71 →
      74 (67 → 54 issues); remaining issues documented below.

- [x] React Doctor — installed as dev dep; `npm run doctor` script; pre-commit
      hook via `.husky/_/pre-commit`; `.github/workflows/react-doctor.yml` CI
      workflow scoped to `src/**` changes.
    - **Remaining findings (54 issues, score 74/100):** Accessibility labels (16
      controls missing labels — needs UI work), data fetching in effects /
      client-fetch-for-server-data (6 findings — requires React Query or Server
      Components refactor, out of scope for now), unused exports (13 — some are
      intentional public API surface; review before removing), `useState` used
      only in handlers in `create/page.tsx:82` (minor perf), gray text on
      colored background in `create/page.tsx:938` (UI polish).

- [x] React Scan — installed as `src/` dev dependency (`react-scan`); active in
      `NODE_ENV=development` via `ReactScanMonitor` component loaded dynamically
      in `app/layout.tsx`; does not affect production builds.

- [x] Semgrep — added as `semgrep` job in `.github/workflows/security.yml`; uses
      `semgrep scan --config auto` (OSS ruleset covering JS/TS/React/ Next.js
      security, secrets, supply chain); SARIF output uploaded to the GitHub
      Security tab; runs on every PR and weekly schedule alongside Slither,
      TruffleHog, and CodeQL.

- [x] `CLAUDE.md` integration for tooling workflows — added "Quality Pipeline"
      section with `npm run doctor`, React Scan, Semgrep, and pre-commit hook
      guidance; instructions are concise and workflow-oriented.

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

- [x] Add a `types/` directory for shared TypeScript types and interfaces that
      can be imported across the frontend and backend, ensuring type safety and
      consistency. — Added `src/types/` with `common.ts`
      (`Address`/`Hex`/`Bytes32` aliases), `contract.ts` (`Contract` mirroring
      `EscrowContract`), `dispute.ts` (`Dispute` mirroring the `Dispute`
      struct), `rating.ts` (`Rating`, `ReputationSummary`,
      `ReputationHistoryEntry`), and an `index.ts` barrel. Wired a `@/types` /
      `@/types/*` path alias in `src/tsconfig.json` so local, CI, and Vercel
      builds resolve the same frontend-owned files. Adopted the shared types in
      the frontend: `dashboard/page.tsx` now imports `Contract` and
      `reputation/page.tsx` imports `ReputationHistoryEntry`, replacing their
      local interface copies. `tsc`, ESLint, Prettier, and `next build` all
      pass.
    - Create a frontend-owned `src/types/` directory and define shared types
      such as `Contract`, `Dispute`, and `Rating` in separate files.
    - Import these types into both the frontend components and any backend logic
      (for example API routes) so data structures stay consistent and type-safe
      across the entire codebase.

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

- [x] Add Tailwind CSS for the frontend if needed, and make the frontend faster,
      more secure, and more aesthetically pleasing. — Tailwind v4 is confirmed
      fully wired via `@use "tailwindcss"` in `globals.scss` and
      `@tailwindcss/postcss` in `postcss.config.mjs`; all pages and components
      use Tailwind classes consistently so no migration was needed. Three
      concrete improvements were landed in this pass:
    - **Performance:** Lazy-loaded `DecryptDocumentForm` in `dashboard/page.tsx`
      via `next/dynamic` (SSR disabled); the 208-line component is now a split
      chunk fetched only when a user opens a decrypt panel. Geist fonts are
      already self-hosted and preloaded by `next/font`; `next/image` is already
      used for the logo. All pages are `"use client"` because they depend on
      wagmi hooks — Server Components are not applicable here. AppKit is
      initialized as a module-import side effect, which is required for web
      component registration and cannot be deferred further without breaking the
      wallet modal.
    - **Security:** Added a `Content-Security-Policy` header to `proxy.ts`
      (deferred from Phase 2). Key directives: `object-src 'none'` eliminates
      the plugin/Flash attack surface; `base-uri 'self'` prevents `<base>` tag
      injection; `form-action 'self'` blocks cross-origin form submissions;
      `frame-ancestors 'none'` reinforces `X-Frame-Options: DENY`;
      `connect-src 'self' https: wss:` restricts outbound fetch/XHR/WebSocket to
      HTTPS and WSS only (covers arbitrary RPC providers, WalletConnect relay,
      Pinata, and block explorers without hardcoding every endpoint).
      `script-src 'unsafe-inline'` is required by Next.js hydration scripts;
      nonce-based CSP is the proper upgrade path but needs additional middleware
      infrastructure. Audited all `target="_blank"` links — every one already
      carries `rel="noopener noreferrer"`. No `dangerouslySetInnerHTML` found.
      All `NEXT_PUBLIC_*` vars are intentional public values (contract
      addresses, WalletConnect project ID, GitHub URL); `NEXT_PUBLIC_PINATA_JWT`
      is a dev-only convenience — the JWT field is shown in the UI when the var
      is absent so users supply their own key at runtime.
    - **Aesthetics:** Added `prefers-reduced-motion` media query to
      `globals.scss` (collapses all transitions/animations to 0.01 ms for users
      who opt out of motion). Added `--color-brand` and `--color-brand-hover`
      design tokens to the `@theme inline` block, making the indigo accent
      explicitly referenceable without hard-coded hex values. The existing UI
      already has a consistent design system (indigo brand color, gray neutrals,
      44 px touch targets, `focus-visible` ring states, dark mode via
      `next-themes`); no further design-system work was needed.

- [x] Support dual-role accounts so a single wallet can operate as both a client
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

- [x] Add USDC as a supported payment currency alongside ETH.
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
    - Update the frontend `create/page.tsx` (around line 435) to reflect the new
      flow: remove `value: parsedAmount` from the `proposeContractByClient`
      wagmi args and wire the fund step into the post-acceptance callback.
    - Re-run `forge test` and the Hardhat suite after any contract change;
      update ABI exports and any test fixtures that assert on locked balances.

- [x] Add a dashboard summary view that shows the key details and status of each
      contract at a glance, so users can understand the state of their contracts
      without clicking into each one. — Added `SummaryBanner` to
      `src/app/dashboard/page.tsx`. It batch-reads all on-chain contracts via
      `useReadContracts`, filters to the current wallet + role, and renders a
      grid of count chips for every status with at least one contract (Pending,
      Active, Submitted, Approved, Disputed, Resolved, Cancelled), plus a
      "Total" chip that is always shown. The banner appears above the contract
      list and is hidden entirely when the wallet has no contracts. Wagmi
      deduplicates the batch reads with the individual `getContract` calls in
      `ContractList`, so there is no extra RPC cost.

- [x] Add a link checker to the deliverable submission form so that invalid URLs
      or IPFS links are caught before submission. — Added
      `validateDeliverableUri` to `src/lib/validation.ts` and wired it into
      `SubmitWorkForm` in `src/app/dashboard/page.tsx`.
    - **Real-time validation:** `touched` is now set on the first `onChange`
      event (not only on blur), so the error appears immediately as the user
      types or pastes an invalid value rather than waiting for focus to leave
      the field.
    - **Accepted formats:** `https://` URLs (length > 8, covering
      `https://<gateway>/ipfs/…` paths), `ipfs://` URIs (length > 7), raw CIDv0
      (`Qm[base58]{44}`), and raw CIDv1 (`b[base32]{20+}`, e.g. `baf…`).
      `http://`, `ar://`, and anything else is rejected. The new validator is
      stricter than the existing `validateContractUri` (which accepted `ar://`
      and `http://`) and lives alongside it so the contract-document URI field
      is unaffected.
    - **Error message location:** the error now renders at the top of the form
      (above the input) using `role="alert"` so screen readers announce it
      immediately.
    - **Disabled submit:** the "Submit Work" button was already gated on
      `uriError !== undefined`; that invariant is preserved with the new
      validator so the button stays disabled until a valid link is entered.

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
      calculations in practice. — `400 = (2 × 40% × 1000) / 3`
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
          meta-refresh redirect to `Home/`; the wiki now receives a generated
          `Home.md` table of contents that links to rendered GitHub Pages docs.
    - [x] Pages were broken and all returned a 404. — The root cause was
          `Home.md` using bare links like `[Architecture](ARCHITECTURE)`; MkDocs
          only rewrites links ending in `.md`, so they resolved to
          `/Home/ARCHITECTURE`. Added `.md` to all 9 links (every other doc
          already used `.md`).
    - [x] Add a Jekyll or MkDocs theme to the GitHub Pages site to improve the
          appearance and navigation of the documentation.
        - Enhanced the existing MkDocs Material theme in `mkdocs.yml`:
          light/dark palette toggle, centralized logo and favicon under
          `assets/` with MkDocs hook publishing, GitHub repo icon, edit and view
          links (`edit_uri`), expanded navigation (instant loading, tracking,
          footer, `toc.follow`), search (suggest and share), and content
          features (code annotations, linked tabs, tooltips).
        - Added richer markdown extensions (details, tasklist, emoji, snippets,
          footnotes, attr_list). Pinned dependencies in `requirements-docs.txt`
          and pointed `docs.yml` at it. Small brand polish in
          `docs/css/extra.css`.

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

- [x] Survey and document useful free / free-tier external APIs the platform can
      adopt to stay zero- or low-cost through development and early launch, then
      record the chosen providers and their limits in `NOTES.md`. — Researched
      and compared all five categories (AI summarization/moderation, email/
      transactional, RPC/node access, IPFS pinning, price/oracle feeds) and
      documented findings, trade-offs, and chosen providers in `NOTES.md` under
      "Free-Tier API Provider Survey (2026-06-06)". Chosen providers: Groq (AI,
      ZDR enabled), Resend + Brevo overflow (email), Alchemy (RPC), Pinata →
      Filebase migration path (IPFS), Chainlink on-chain + CoinGecko off-chain
      (price data).

- [x] Add accessibility features to the frontend so the platform is usable by
      people with disabilities, including screen reader support, keyboard
      navigation, and adjustable color contrast. — Added a skip-to-main-content
      link (`layout.tsx`); `aria-current="page"` on active nav links; labeled
      `<nav aria-label="Main navigation">`; `<fieldset>` + `<legend>` for the
      role toggle with `aria-pressed` on each button; `aria-label` on the
      connected-wallet button; `role="region"` → `<section aria-label>` on the
      `SummaryBanner`; threaded `Field` id context so every `<label>` now has a
      matching `htmlFor`; global `focus-visible` ring in `globals.scss`;
      `ContrastToggle` component (half-circle icon in the navbar) that toggles
      the `high-contrast` CSS class via `useSyncExternalStore`, persists to
      `localStorage`, and auto-activates from `prefers-contrast: more`; high-
      contrast CSS overrides for gray text, borders, and focus rings. React
      Doctor accessibility findings: 16 → 0; score 74 → 82.
