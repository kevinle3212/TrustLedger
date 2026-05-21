# To-Do List

## Tasks and Future Improvements for Mainnet Release

- [ ] Finalize the TrustLedger whitepaper and move it to `docs/TrustLedger_Whitepaper_v1.0_2026.pdf`.
    - Once finalized, commit to `docs/` and link to it from the README, other documentation markdown files, and the GitHub pages documentation site.

- [ ] Build out the `reputation/` page further (rating lookup and submission already work today).
    - Already works: address lookup, "use my wallet", and `averageRating(addr)` → score/100 + rating count with loading/error/not-deployed states. Rating submission is wired on the dashboard via `submitRating(id, score)`.
    - Constraint: `ReputationRegistry` only stores a cumulative `(sum, count)` per address (no per-rating history or role split), so the read side is currently maxed out against available on-chain data.
    - (Now, frontend-only, no redeploy) Add a rating history feed: query `RatingSubmitted` events with viem `getLogs` for the looked-up address and render recent ratings (score, rater, contract id, block timestamp). Roughly 40-60 lines plus a small component.
    - (Mainnet, needs contract change + redeploy) Split reputation by role (as client vs as freelancer) so a score reflects the context it was earned in.
    - (Mainnet, needs contract change + redeploy) Store richer per-rating data on-chain (e.g. optional comment, timestamp) to support a fuller reputation profile.

- [ ] (Mainnet) Add in user authentication and authorization for the website, so that users can create accounts and log in to access their own data and settings.
    - This would involve setting up a database to store user information, as well as implementing a secure authentication system using JWTs or OAuth.

- [x] GitHub Pages for documentation — deployed via MkDocs Material (`mkdocs.yml` + `.github/workflows/docs.yml`).
    - Auto-deploys to `gh-pages` branch on every push to `main` that touches `docs/` or `mkdocs.yml`.
    - Site URL: <https://kevinle3212.github.io/TrustLedger>
    - Remaining: enable GitHub Pages in repo settings (Settings → Pages → Source: Deploy from branch → gh-pages / root), then link from the README and main website.
