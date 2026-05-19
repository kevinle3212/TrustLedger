# To-Dos

This is a list to prepare for the version 1.0.0 release. It includes tasks that need to be completed before the release, as well as some ongoing tasks for maintenance and improvement.

- [x] Add more test cases for edge cases and error handling.
- [x] Implement automated testing for continuous integration.
- [x] Review and refactor existing test cases for better readability and maintainability.
- [x] Set up a testing environment that closely mimics production.
- [x] Document testing procedures and guidelines for the team.
- [x] Check if Vercel is deployed every time I push.
- [ ] Use `gh` CLI to either merge or squash pull requests related to vulnerabilities. Also use it to fix code scan and dependabot alerts.
- [x] Add a link to the source code inside the navigation bar of the website, but don't hardcode it and have Vercel automatically update it when I push to the main branch.
    - This way, users can easily access the source code and contribute to the project if they want to. And if someone were to clone this, it would automatically update the link to the source code without needing to change it manually. There is a NEXT_PUBLIC_APP_URL environment variable that might be of use, but Vercel would have to know it.
- [x] Add indent setting inside .vscode/settings.json that follows current code style and linting rules.
- [x] Remove `Get a free JWT at pinata.cloud → API Keys. Set NEXT_PUBLIC_PINATA_JWT in .env.local to persist it.` from the create contract page, below JWT input field, add to the documentation, and replace it with the actual steps to retrieve the JWT from Pinata.
