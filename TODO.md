# To-Do List

## Tasks and Future Improvements for Mainnet Release

- [ ] Build out the `reputation/` page further (rating lookup and submission already work today).
    - Already works: address lookup, "use my wallet", and `averageRating(addr)` → score/100 + rating count with loading/error/not-deployed states. Rating submission is wired on the dashboard via `submitRating(id, score)`.
    - Constraint: `ReputationRegistry` only stores a cumulative `(sum, count)` per address (no per-rating history or role split), so the read side is currently maxed out against available on-chain data.
    - (Now, frontend-only, no redeploy) Add a rating history feed: query `RatingSubmitted` events with viem `getLogs` for the looked-up address and render recent ratings (score, rater, contract id, block timestamp). Roughly 40-60 lines plus a small component.
    - (Mainnet, needs contract change + redeploy) Split reputation by role (as client vs as freelancer) so a score reflects the context it was earned in.
    - (Mainnet, needs contract change + redeploy) Store richer per-rating data on-chain (e.g. optional comment, timestamp) to support a fuller reputation profile.
- [ ] (Mainnet) Add in user authentication and authorization for the website, so that users can create accounts and log in to access their own data and settings.
    - This would involve setting up a database to store user information, as well as implementing a secure authentication system using JWTs or OAuth.
- [ ] (Mainnet) GitHub pages for the documentation, but even more in-depth and detailed than the current documentation on the website. This would include tutorials, examples, and API reference for all the features of the project.
    - Have this be on a separate branch, and have it be automatically deployed to GitHub pages whenever changes are made to the documentation. This would make it easier for users to access the documentation and learn how to use the project, and would also make it easier for developers to contribute to the documentation.
    - This would make it easier for users to learn how to use the project and would also serve as a reference for developers who want to contribute to the project.
    - Once a project prospectus is done, have a whitepaper be made as well. Then we will have it be on the GitHub pages as well, and link to it from the main website. This would provide more in-depth information about the project, its goals, and its technical details for users who are interested in learning more about it.
