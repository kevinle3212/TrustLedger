# To-Do List

## Tasks for Version 1.0.0 Release and Ongoing Maintenance

These are tasks for the version 1.0.0 release and ongoing maintenance of the project.

This is a list to prepare for the version 1.0.0 release. It includes tasks that need to be completed before the release, as well as some ongoing tasks for maintenance and improvement.

- [x] Add more test cases for edge cases and error handling.
- [x] Implement automated testing for continuous integration.
- [x] Review and refactor existing test cases for better readability and maintainability.
- [x] Set up a testing environment that closely mimics production.
- [x] Document testing procedures and guidelines for the team.
- [x] Check if Vercel is deployed every time I push.
- [x] Use `gh` CLI to either merge or squash pull requests related to vulnerabilities. Also use it to fix code scan and dependabot alerts.
- [x] Add a link to the source code inside the navigation bar of the website, but don't hardcode it and have Vercel automatically update it when I push to the main branch.
    - This way, users can easily access the source code and contribute to the project if they want to. And if someone were to clone this, it would automatically update the link to the source code without needing to change it manually. There is a NEXT_PUBLIC_APP_URL environment variable that might be of use, but Vercel would have to know it.
- [x] Add indent setting inside .vscode/settings.json that follows current code style and linting rules.
- [x] Remove `Get a free JWT at pinata.cloud → API Keys. Set NEXT_PUBLIC_PINATA_JWT in .env.local to persist it.` from the create contract page, below JWT input field, add to the documentation, and replace it with the actual steps to retrieve the JWT from Pinata.
- [x] GitHub Models `.prompt.yml` files + CI workflow - see `.github/prompts/`, `docs/GITHUB_MODELS.md`, `scripts/models/github_models_example.py`

- [ ] (Mainnet) Add in user authentication and authorization for the website, so that users can create accounts and log in to access their own data and settings.
    - This would involve setting up a database to store user information, as well as implementing a secure authentication system using JWTs or OAuth.
- [ ] (Mainnet) GitHub pages for the documentation, but even more in-depth and detailed than the current documentation on the website. This would include tutorials, examples, and API reference for all the features of the project.
    - Have this be on a separate branch, and have it be automatically deployed to GitHub pages whenever changes are made to the documentation. This would make it easier for users to access the documentation and learn how to use the project, and would also make it easier for developers to contribute to the documentation.
    - This would make it easier for users to learn how to use the project and would also serve as a reference for developers who want to contribute to the project.
    - Once a project prospectus is done, have a whitepaper be made as well. Then we will have it be on the GitHub pages as well, and link to it from the main website. This would provide more in-depth information about the project, its goals, and its technical details for users who are interested in learning more about it.
