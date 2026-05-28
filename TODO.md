# To-Do List

## Tasks and Future Improvements for Mainnet Release

- [ ] Finalize the TrustLedger whitepaper and publish it as `docs/TrustLedger_Whitepaper_v1.0_2026.pdf`.
    - Commit the final PDF to `docs/` and link to it from `README.md`, all documentation markdown files, and the GitHub Pages site nav.
    - Create Dune Analytics dashboards to visualize key on-chain metrics: contracts created over time, total value locked, dispute rate, juror participation, and reputation score distributions. Publish the dashboard URL in the docs and `README.md` so contributors and users can track platform activity.
    - Document how Dune is set up to query the contracts, including the SQL queries used for each chart and any relevant schema details.
        - Also document how Dune was used to generate data, visualizations, and insights for the whitepaper research phase, so future contributors can understand the data-driven approach to platform design and improvement.

- [ ] Investigate privacy improvements using zero-knowledge proofs and/or a transaction relayer — specifically: hiding wallet addresses, contract amounts, and counterparty identities on the frontend.
    - This is explicitly a non-goal for the initial release. Track it as a post-launch improvement once the core platform is stable on mainnet.
    - Potential approaches: a relayer that submits transactions on behalf of users (concealing the sender's address), ZK proofs that verify eligibility without revealing identity, or a privacy-preserving wrapper for `contractURI` so the document is not publicly linkable to either wallet.

- [ ] (Mainnet) Add off-chain user accounts to support profile data, notifications, and messaging that cannot or should not live on-chain.
    - **Authentication:** Require users to sign a typed EIP-712 message with their wallet to prove address ownership. Issue a short-lived JWT on successful verification — no passwords required.
    - **Authorization:** Gate off-chain write actions (e.g. updating a profile, reading notifications) to the authenticated wallet. On-chain actions remain permissionless and are enforced entirely by the smart contracts.
    - **User profiles:** Allow users to set a display name and profile picture, stored off-chain in a database or on IPFS and linked to their on-chain address. Profiles should surface on the reputation and dashboard pages.
    - **Notifications:** Send email or in-app notifications for key contract lifecycle events — new contract offers, submitted work, approval/dispute outcomes, and rating submissions.
    - **In-app messaging:** Allow clients and freelancers to communicate within the platform without exposing personal contact information. Messages should be end-to-end encrypted so only the two parties can read them. Use an AI moderation layer (e.g. Gemini) to flag policy violations such as harassment or sharing of personal information outside the platform.
    - **2FA (optional):** Add TOTP-based two-factor authentication as an opt-in security layer on top of wallet sign-in.
    - Requires a backend with API routes and a database. Consider Supabase, PlanetScale, or a self-hosted Postgres instance for persistence, with JWTs for session management.

- [ ] Build out the arbitration and juror UI to make the dispute resolution flow fully self-serve for all parties.
    - **Evidence submission:** Add a structured form to the arbitration detail page (`/arbitration/[id]`) where clients and freelancers can submit a written dispute summary, supporting documents (linked via IPFS or Arweave URI), and a requested completion percentage.
    - **Juror voting interface:** Extend the juror page (`/juror`) so jurors can view all open disputes assigned to them, read evidence from both parties, and cast a completion-percentage ruling directly from the UI — currently this requires a manual contract call.
    - **Ruling status and outcome display:** Show the live vote tally (without revealing individual votes before the ruling is finalized) and, once `executeRuling()` resolves the dispute, display the final outcome including the funds distribution breakdown and any automatic reputation penalties applied.
    - **Juror fee visibility:** Surface the expected juror fee reward on the juror page so participants know what they stand to earn before accepting a case.

- [x] Allow users to earn back reputation by successfully completing new contracts or doing well during arbitration, so that a bad rating doesn't permanently damage a client or freelancer's ability to get work on the platform.
    - This could involve implementing a decay function for reputation scores over time, or allowing users to "redeem" themselves by completing a certain number of successful contracts after receiving a low rating.
    - Implemented via a recovery mechanism in `ReputationRegistry`: scores ≤ 30 enter recovery mode; 3 subsequent scores ≥ 70 resolve one recovery period and apply a synthetic +50-point bonus rating. Exposed via `recoveryStatus(address)` on both the contract and `IReputationRegistry`.

- [x] Fix the division part of the formula to be 2/3 and not 2/300, and add a worked example to the README and documentation. The current formula in the code is correct, but the README has an outdated version that should be updated for clarity. It should be `rawPay = (2 × pct × amount) / 3` instead of `rawPay = (2 × pct × amount) / 300`.
    - Add a working example with numbers would also help users understand how the fee and payment calculations work in practice.
        - 400 = (2 times 40% times 1000) / 3
    - Change documentation to not refer to freelancers getting 60% of the contract amount for 60% completion to avoid confusion with the 2/3 formula. Instead, clarify that the freelancer gets 2/3 of the "earned amount" (pct × amount) and the fee is taken from that.

- [x] Implement a decrypt frontend UI for encrypted contract documents.
    - Context: the "Encrypt before upload (AES-256-GCM)" feature uploads an encrypted JSON bundle to IPFS, so fetching the `contractURI` via a gateway returns ciphertext, not the file. There is currently no in-app way to decrypt it.
    - `decryptFile()` already exists and is tested in `src/lib/encryption.ts` (the symmetric counterpart to `encryptFile`) but is not wired into any UI.
    - Added `DecryptDocumentForm` to `src/app/dashboard/page.tsx`: contract cards with a document URI show a "Decrypt" toggle next to "View".
    - Clicking it expands a full-width panel with a "Fetch from URI" / "Paste bundle" source toggle, passphrase field, output filename field, and a "Decrypt & Download" button that calls `decryptFile()` and triggers a browser download. Wrong-passphrase `OperationError` is surfaced as a human-readable message.

- [x] Build out the `reputation/` page further (rating lookup and submission already work today).
    - Already works: address lookup, "use my wallet", and `averageRating(addr)` → score/100 + rating count with loading/error/not-deployed states. Rating submission is wired on the dashboard via `submitRating(id, score)`.
    - Constraint: `ReputationRegistry` only stores a cumulative `(sum, count)` per address (no per-rating history or role split), so the read side is currently maxed out against available on-chain data.
    - (Now, frontend-only, no redeploy) Add a rating history feed: query `RatingSubmitted` events with viem `getLogs` for the looked-up address and render recent ratings (score, rater, contract id, block timestamp). Roughly 40-60 lines plus a small component.
    - (Mainnet, needs contract change + redeploy) Split reputation by role (as client vs as freelancer) so a score reflects the context it was earned in.
    - (Mainnet, needs contract change + redeploy) Store richer per-rating data on-chain (e.g. optional comment, timestamp) to support a fuller reputation profile.

- [x] Document the GitHub Pages setup and deployment process in the README or a separate CONTRIBUTING.md file, so that future contributors can easily understand how to update the documentation site. — added "Documentation Site" section to `docs/CONTRIBUTING.md`.
    - [x] Fix Vercel command failing on the `gh-pages` branch. — disabled via `git.deploymentEnabled.gh-pages: false` in `src/vercel.json`.
    - [x] Fix the `/` endpoint to point to Home instead of the default GitHub Pages landing page as it gives a 404 error currently. — added `docs/index.html` meta-refresh redirect to `Home/` (not synced to the wiki since `wiki-sync` only copies `*.md`).
    - [x] Pages are broken and all return a 404. — root cause was `Home.md` using bare links like `[Architecture](ARCHITECTURE)`; MkDocs only rewrites links ending in `.md`, so they resolved to `/Home/ARCHITECTURE`. Added `.md` to all 9 links (every other doc already used `.md`).

    - [x] Add a Jekyll or MkDocs theme to the GitHub Pages site to improve the appearance and navigation of the documentation.
        - Enhanced the existing MkDocs Material theme in `mkdocs.yml`: light/dark palette toggle, logo + favicon (`docs/assets/`), GitHub repo icon, "edit/view this page" links (`edit_uri`), expanded navigation (instant loading, tracking, footer, `toc.follow`), search (suggest/share), and content features (code annotations, linked tabs, tooltips).
        - Added richer markdown extensions (details, tasklist, emoji, snippets, footnotes, attr_list). Pinned deps in `requirements-docs.txt` and pointed `docs.yml` at it. Small brand polish in `docs/assets/extra.css`.

- [x] GitHub Pages for documentation — deployed via MkDocs Material (`mkdocs.yml` + `.github/workflows/docs.yml`).
    - Auto-deploys to `gh-pages` branch on every push to `main` that touches `docs/` or `mkdocs.yml`.
    - Site URL: <https://kevinle3212.github.io/TrustLedger>
    - Remaining: enable GitHub Pages in repo settings (Settings → Pages → Source: Deploy from branch → gh-pages / root), then link from the README and main website.

- [x] Update documentation for things that are currently missing or incomplete, such as:
    - [x] Smart contract documentation: add more detailed explanations of the smart contract functions, events, and data structures, as well as example interactions. — added the `Status`/`Phase` enums and `EscrowContract`/`Dispute` struct definitions to `docs/CONTRACTS.md`, plus an "Example Interactions" section with `cast` + viem snippets for the happy path and the dispute/juror flow (and event reads).
    - [x] GitHub Pages documentation: add more detailed guides and tutorials for using the documentation site, as well as troubleshooting tips for common issues. — expanded the "Documentation Site" section in `docs/CONTRIBUTING.md` with navigating-the-site and local-preview tutorials and a troubleshooting table for common doc-site issues.
    - [x] Add a FAQ.md file to address common questions and issues that users may have when using the platform and have that be referenced inside the documentation and GitHub pages. — created `docs/FAQ.md` (clients, freelancers, jurors, disputes, fees, developers, doc-site) and referenced it from the `mkdocs.yml` nav, `Home.md` index, and `CONTRACTS.md` related docs.
