# To-Do List

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](./CREDITS.md).

Tasks are grouped into phases and ordered so that earlier work unblocks later
work. Complete each phase roughly in order: tooling and architecture come first,
followed by user-facing features, backend services, quality, and finally the
mainnet launch deliverables.

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

- [ ] Upgrade `src/` to ESLint 10 once the Next.js lint stack supports it. The
      frontend is pinned to ESLint 9 because the plugins pulled in transitively
      by `eslint-config-next@16.2.9` do not yet support ESLint 10:
    - `eslint-plugin-react@7.37.5` — peer caps at `^9.7` and still calls the
      removed `context.getFilename()` (the hard crash on the
      `react/display-name` rule under ESLint 10).
    - `eslint-plugin-jsx-a11y@6.10.2` — `eslint` peer `^9`, no `^10`.
    - `eslint-plugin-import@2.32.0` — `eslint` peer `^9`, no `^10`.
    - When those ship ESLint 10 support, bump `src/` to ESLint 10, remove the
      engine guard at the top of `src/eslint.config.mjs`, and drop the
      `--no-config-lookup -c eslint.config.mjs` hardening on the root
      `lint:ts`/`lint:js`/`lint:config`/`fix:ts` scripts so a bare
      `npx eslint src/...` from the repo root no longer needs guarding.

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
      controls enabled. Configured through the provider-agnostic `@/core/ai`
      layer: `AI_PROVIDER_KIND` (`openai-compatible` or `gemini`), `AI_API_KEY`,
      `AI_DEFAULT_MODEL`, and `AI_BASE_URL` for OpenAI-compatible endpoints (or
      the advanced `AI_PROVIDERS_JSON` / `AI_ROUTES_JSON`).
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
    - **Blocked on external inputs (2026-06-11):** this cannot be completed by
      repository changes alone. Needed from project maintainers: selected
      independent auditor or audit firm, signed engagement or audit scope,
      auditor-requested scope freeze date, final audit report, finding severity
      list, accepted/rejected finding decisions with rationale, remediation
      owners, and links or files for final validation evidence. Once those are
      available, add the report under `docs/reports/`, update
      `docs/AUDIT-READINESS.md`, rerun `npm run quality`, `npm run build`,
      `npm run impeccable`, Slither/Semgrep/security scans, and then this item
      can be checked off.

- [ ] Prepare TrustLedger for mainnet deployment with a formal, evidence-backed
      release package.
    - **Why this exists:** mainnet deployment changes TrustLedger from a
      testnet/open-source workflow into software that can custody real value.
      The release process must prove that contracts, frontend, backend routes,
      secrets, monitoring, operations, legal/compliance references, and recovery
      procedures are ready before any mainnet address is presented to users.
    - **Required format:** every mainnet readiness artifact must include owner,
      date, environment, command evidence, links to CI runs, links to deployed
      addresses or dashboards, pass/fail status, risk rating, remediation owner,
      and the exact commit SHA reviewed. Do not use vague statuses such as
      "looks good" or "done"; use objective evidence.
    - **Contract scope freeze:** define the exact Solidity files, libraries,
      deployment scripts, constructor arguments, compiler version, optimizer
      settings, roles, admin authorities, and upgrade/non-upgrade assumptions
      included in the release. No contract code changes after scope freeze
      unless the release is re-reviewed.
    - **External audit gate:** obtain an independent smart-contract audit,
      record findings by severity, patch accepted findings, document rejected
      findings with rationale, rerun Foundry, Hardhat, Slither, Semgrep, npm
      audits, secret scans, and frontend E2E tests after every patch, then
      publish the final audit report under `docs/reports/`.
    - **Deployment rehearsal:** run a full Sepolia rehearsal from a clean clone:
      install dependencies, populate `.swc/`, compile, test, deploy contracts,
      verify source, wire registries, sync frontend environment, deploy Vercel,
      run Playwright, run React Doctor, test wallet connect, create a contract,
      fund it, submit proof of work, approve it, dispute a separate contract,
      and verify admin/status/analytics pages.
    - **Secrets and environment:** create a final environment inventory for
      Vercel, GitHub Actions, Kubernetes/Docker, RPC providers, WalletConnect,
      Solana, Pinata/IPFS, Arweave, email, monitoring, AI summaries, cron, admin
      access, and health checks. Store values only in deployment secret stores.
      Never commit private keys, seed phrases, raw RPC credentials, account
      passwords, `.env*`, keypair JSON, or generated deployer wallets.
    - **Mainnet deployer controls:** use a dedicated deployer wallet or multisig
      with documented funding source, minimal balance, hardware-wallet custody
      where possible, transaction simulation, explicit nonce tracking, and
      post-deploy key-rotation or role-transfer steps. Record transaction hashes
      and block numbers.
    - **Monitoring and incident response:** configure Sentry, Better Stack,
      Grafana, or equivalent for frontend errors, API latency, cron failures, AI
      provider latency/error/cost metrics, oracle freshness, RPC failures,
      deployment metadata, and security alerts. Document paging ownership,
      severity definitions, rollback steps, and public status-update rules.
    - **Frontend and UX verification:** run `npm run impeccable`, React Doctor
      100/100, Playwright across desktop and mobile, wallet menu checks,
      contract countdown checks, legal/status/about/dashboard/admin page checks,
      dark/light/high-contrast checks, and text-overflow checks before mainnet
      links go live.
    - **Backend and API verification:** verify every public endpoint has the
      intended auth level, input validation, rate limiting, safe error output,
      and no secret leakage. Admin-only endpoints must require server-side
      tokens/session and IP allowlisting where configured.
    - **Data and analytics:** decide what metrics are collected, retention
      duration, user notice language, aggregation boundaries, dashboard access,
      and deletion/export process before enabling production analytics.
    - **Legal and compliance review:** review legal markdown, privacy notice,
      cookie/storage notice, terms, arbitration language, risk disclaimers,
      sanctions/geography considerations, open-source license, and contributor
      attribution before launch. Legal docs should be reviewed by qualified
      counsel for target jurisdictions.
    - **Release checklist:** tag a release candidate, freeze dependencies, run
      `npm audit` in root and `src/`, run Python mypy/docstring checks, run
      Hardhat/Foundry/Rust/Solana checks, build Docker images if used, build
      docs, verify README/docs links, verify no empty directories, verify
      `.gitignore`/rulesets block sensitive files, and record the final green
      CI/Vercel links.
    - **Launch decision:** launch only after all blockers are closed or signed
      off with explicit rationale. If any high-severity issue remains open, keep
      the project testnet-only and document the blocker in `NOTES.md`.

- [ ] Build and publish Dune dashboard integration for public on-chain metrics.
    - Create Dune dashboards for contracts created over time, total value
      locked, dispute rate, juror participation, appeal activity, token mix,
      average time to approval, warranty hold-back claims, and reputation score
      distributions.
    - Store dashboard links and SQL query references in `docs/ANALYTICS.md`,
      `docs/SMART-CONTRACTS.md`, and `README.md`. Do not commit Dune API keys.
    - Add a frontend link from public status or analytics surfaces once the
      dashboard is live, and label it as public on-chain data only.
    - Use Dune outputs in the whitepaper only with the query date, contract
      addresses, network, and SQL version documented so results are
      reproducible.

- [ ] Finalize the TrustLedger whitepaper and publish it as
      `docs/TrustLedger_Whitepaper_v1.0_2026.pdf`.
    - Commit the final PDF to `docs/` and link to it from `README.md`, all
      documentation markdown files, and the GitHub Pages site navigation.
    - Reference the dedicated Dune dashboard integration item above when
      incorporating on-chain metrics into the whitepaper.
    - Ensure that everything in this project up to this point, any
      configurations, files, codebase, features, things to note, and other
      relevant information has been documented inside the respective docs files
      in the `docs/` directory, so that the documentation is comprehensive and
      serves as a reliable reference for users and contributors. Ensure that it
      is also inside the whitepaper PDF itself, so that the whitepaper is a
      standalone document that fully explains the platform, its design
      decisions, and its implementation details.

## Phase 10 — Analytics, Staking, and Platform Hardening (In Progress)

This phase tracks the remaining scope of the analytics/staking/core/infra
initiative. The first slice — the shared connected-wallet menu, the `core/`
layer, and Recharts-backed analytics visuals — landed already; the items below
are the parts that need external credentials, on-chain deploys, or a dedicated
test/IaC pass before they can be completed and verified.

- [ ] Ship full on-chain staking with both SOL and USDC.
    - **Prerequisites:** a deployed staking contract per chain and funded deploy
      keys. Ethereum/Sepolia path needs the Solidity staking contract plus
      `SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, and the USDC token address for
      the target network. Solana path needs an Anchor/native program, a funded
      Devnet keypair, the SPL USDC mint address, and the published program ID in
      `NEXT_PUBLIC_SOLANA_STAKING_PROGRAM_ID`.
    - **Scope:** asset-selector dropdowns for stake/unstake, dual-asset balance
      reads, validation, reward math, schemas, APIs, and analytics; edge/failure
      cases (insufficient balance, decimals mismatch, rejected approval, network
      switch mid-flow) covered by tests.
    - **Verify:** Hardhat + Foundry contract tests, Anchor tests, frontend unit
      tests for both assets, and `npm run quality` + `npm run build` green.
    - **Status (USDC shipped; SOL pending deploy):** The dual-asset selector,
      decimal-aware balance reads (ETH 18 / USDC 6 / SOL 9), validation, reward
      math, adapters, schemas, APIs, and analytics are built. USDC staking is
      fully live: `StakingVault` is deployed and Etherscan-verified on Sepolia
      (`0xE183ebD22D879d126378A541F893BDB5d4BF3817`), reward-funded, and
      exercised end-to-end on a real chain (approve → stake → accrue → claim →
      unstake) by both the Anvil integration test
      (`src/tests/unit/staking-integration.test.ts`) and a live Sepolia
      read-back. ETH staking remains via `JurorRegistry`. Remaining for full
      completion: deploy the Solana staking program (`programs/solana-staking`)
      to Devnet and publish `NEXT_PUBLIC_SOLANA_STAKING_PROGRAM_ID`; until then
      the SOL adapter stays correctly gated to "unavailable". Production L2
      vault deploys are tracked in Phase 11. Do not ship fabricated addresses or
      a mocked on-chain path to `main`.

- [ ] Complete the admin analytics dashboard (platform, infra, deployment).
    - **Prerequisites:** read-only API credentials, kept server-side only:
      `VERCEL_TOKEN` (+ `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`) for Web/Speed
      Analytics, deployment status, and build health; an error/monitoring token
      (e.g. Sentry `SENTRY_AUTH_TOKEN`) for error rates; and the existing
      admin-health gate token for the analytics endpoints.
    - **Scope:** platform usage, active users, staking/escrow/dispute metrics,
      contract activity, API performance, error rates, build health, and
      deployment/infrastructure metrics, rendered with the shared Recharts
      wrappers in `src/components/charts/`.
    - **Verify:** charts render with accessible names in unit tests; no secret
      is exposed to the client (`NEXT_PUBLIC_*` audit); `npm run quality` green.

- [ ] Provision infrastructure-as-code under `infra/<tool>/`.
    - **Prerequisites:** a chosen cloud target and validated credentials before
      anything is committed (per `docs/INFRA.md` "Not yet provisioned").
      Terraform needs provider credentials and a backend; Ansible needs
      inventory and SSH access; alerting/metrics need a backend (e.g.
      Prometheus/Alertmanager).
    - **Scope:** Terraform modules (networking, cluster, DNS, secrets manager),
      Ansible playbooks for VM-based admin-API hosts, alerting rules, a metrics
      backend, and automated backup/restore jobs, each with a matching section
      in `docs/INFRA.md` and a runbook.
    - **Verify:** `terraform validate` and `ansible-lint` run clean in CI before
      merge.

- [ ] Add Arbitrum Sepolia (`421614`) chain config before listing it as a
      supported deployment target.
    - **Prerequisites:** `ARBITRUM_SEPOLIA_RPC_URL` and `ARBISCAN_API_KEY` in
      `.env` / `.env.example`.
    - **Scope:** register the chain in the Hardhat and Foundry network configs,
      `src/lib/wagmi.ts`, and the explorer helpers, then add the row to the
      `docs/ARCHITECTURE.md` "Network Support" table.
    - **Verify:** `forge build` and `next build` stay green; the frontend chain
      switcher offers Arbitrum Sepolia and explorer links resolve.

## Phase 11 — Production L2 Staking Deployments (Blocked: Real Funds)

USDC staking is deployed, Etherscan-verified, reward-funded, and end-to-end
tested on Sepolia (`StakingVault 0xE183ebD22D879d126378A541F893BDB5d4BF3817`).
The exact same scripts deploy to the production L2s — each chain is blocked
**only** on real funds plus per-chain RPC/explorer credentials. Revisit this the
moment real funds are available; do not deploy with fabricated addresses, and
the UI stays gated to "unavailable" per chain until a real vault address is
published.

- [ ] Deploy `StakingVault` to Arbitrum One (42161), Base (8453), and Optimism
      (10).
    - **Prerequisites (per chain — real funds):**
        - Real ETH for gas on the deployer
          (`0xeC85f08b9320D3f6EB4B41b893ec13c8A3C945e0`) on that L2 (currently 0
          on all three).
        - Real USDC for the reward pool — amount per chain is a business
          decision, not a testnet default.
        - `STAKING_USDC_ADDRESS` = the chain's native USDC (defaults already in
          `src/lib/wagmi.ts`: Arbitrum
          `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`, Base
          `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, Optimism
          `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85`).
        - RPC + explorer keys in `.env`: `ARBITRUM_RPC_URL` / `BASE_RPC_URL` /
          `OPTIMISM_RPC_URL` and `ARBISCAN_API_KEY` / `BASESCAN_API_KEY` /
          `OPTIMISM_ETHERSCAN_API_KEY` (all currently unset).
    - **Steps (proven on Sepolia):**
        1. Fund the deployer with gas + USDC on the target L2.
        2. Add per-chain npm scripts mirroring `foundry:deploy:staking:sepolia`
           and `foundry:fund:staking:sepolia` (swap `--rpc-url <chain>`).
        3. Set `STAKING_USDC_ADDRESS` for the chain, then run
           `DeployStaking.s.sol` with `--broadcast --verify`.
        4. Publish the vault address into
           `NEXT_PUBLIC_STAKING_VAULT_ADDRESS_<CHAIN>` (local `.env` + Vercel
           Production/Preview), then redeploy (`vercel --prod`).
        5. Fund rewards: set `STAKING_VAULT_ADDRESS` + `STAKING_REWARD_AMOUNT`,
           run `FundStaking.s.sol`.
        6. Live read-back: `approve → stake → claim → unstake` via `cast`
           against the deployed vault.
    - **Verify:** vault reads (`STAKING_TOKEN`, `owner`, decimals) match the
      target chain; the USDC staking UI flips from "unavailable" to "available"
      on that network; `npm run quality` + `npm run build` stay green.

## Future Infrastructure: Full Local Chain (Anvil) E2E

Deferred follow-up to the automated test matrix. The connected-wallet E2E suite
currently uses a deterministic mock wagmi connector
(`NEXT_PUBLIC_E2E_MOCK_WALLET=1`) that reports a connected account without a
real chain, so contract reads stay disabled (zero-address). The next step is a
full local chain so staking, escrow, and dispute flows can be exercised
on-chain.

- **Purpose:** full on-chain staking lifecycle testing (deposit, register,
  unstake, reward math, dispute/settlement) against a real EVM node rather than
  the UI-only mock connector.
- **Components:**
    - [ ] Anvil local node: start a Foundry Anvil instance with deterministic
          accounts and a fixed mnemonic/chain ID for reproducible runs.
    - [ ] CI contract deployment step: compile and deploy the escrow,
          arbitration, juror-registry, and staking contracts to the Anvil node,
          then export the addresses into the frontend build env
          (`NEXT_PUBLIC_*_ADDRESS`) for an Anvil-targeted E2E build.
    - [ ] Funded deterministic account test harness: a fixture that wires the
          mock/injected connector to an Anvil private key, funds it, and exposes
          helpers for balance/allowance assertions.
    - [ ] Full on-chain staking lifecycle E2E: Playwright specs (new `@onchain`
          tag) that stake at/above the minimum, register as a juror, read back
          on-chain state, and unstake, asserting real contract reads.
- **Note:** deferred due to infrastructure complexity and flakiness risk (node
  startup, deploy timing, nonce/funding races). Keep it out of the required CI
  gates until it runs deterministically; gate it behind a separate opt-in job so
  a flaky chain never blocks unrelated PRs.

## Completed

Older completed items are archived in
[`docs/TODO-ARCHIVE.md`](docs/TODO-ARCHIVE.md). Move newly completed items here
first (per the workflow in `CLAUDE.md`), then archive periodically.
