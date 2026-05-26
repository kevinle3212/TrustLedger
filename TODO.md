# To-Do List

## Tasks and Future Improvements for Mainnet Release

- [ ] Finalize the TrustLedger whitepaper and move it to `docs/TrustLedger_Whitepaper_v1.0_2026.pdf`.
    - [ ] Once finalized, commit to `docs/` and link to it from the README, other documentation markdown files, and the GitHub pages documentation site.
    - [ ] Use Dune Analytics to create dashboards and visualizations of on-chain data related to the platform, such as the number of contracts created, total value locked, dispute rates, juror participation, and reputation scores. This could help users better understand the activity and performance of the platform, and could also be used to identify trends and areas for improvement.

- [ ] Look into privacy with zero-knowledge proofs, hiding addresses, wallets, amounts, etc. on the frontend and/or via a relayer. This is a non-goal for the initial release, but could be a valuable future improvement to enhance user privacy and security.

- [ ] Implement a decrypt frontend UI for encrypted contract documents.
    - Context: the "Encrypt before upload (AES-256-GCM)" feature uploads an encrypted JSON bundle to IPFS, so fetching the `contractURI` via a gateway returns ciphertext, not the file. There is currently no in-app way to decrypt it.
    - `decryptFile()` already exists and is tested in `src/lib/encryption.ts` (the symmetric counterpart to `encryptFile`) but is not wired into any UI.
    - Add a UI flow: fetch the `contractURI` from a gateway (or accept a pasted bundle), prompt for the passphrase, call `decryptFile`, and download the recovered document. The bundle is self-describing (salt/iv/iterations travel with the ciphertext), so the passphrase is the only secret needed.

- [ ] Build out the `reputation/` page further (rating lookup and submission already work today).
    - Already works: address lookup, "use my wallet", and `averageRating(addr)` → score/100 + rating count with loading/error/not-deployed states. Rating submission is wired on the dashboard via `submitRating(id, score)`.
    - Constraint: `ReputationRegistry` only stores a cumulative `(sum, count)` per address (no per-rating history or role split), so the read side is currently maxed out against available on-chain data.
    - (Now, frontend-only, no redeploy) Add a rating history feed: query `RatingSubmitted` events with viem `getLogs` for the looked-up address and render recent ratings (score, rater, contract id, block timestamp). Roughly 40-60 lines plus a small component.
    - (Mainnet, needs contract change + redeploy) Split reputation by role (as client vs as freelancer) so a score reflects the context it was earned in.
    - (Mainnet, needs contract change + redeploy) Store richer per-rating data on-chain (e.g. optional comment, timestamp) to support a fuller reputation profile.

- [ ] (Mainnet) Add in user authentication and authorization for the website, so that users can create accounts and log in to access their own data and settings.
    - This would involve setting up a database to store user information, as well as implementing a secure authentication system using JWTs or OAuth.

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
