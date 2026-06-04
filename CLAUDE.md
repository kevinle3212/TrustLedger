# Project Instructions

## System Instructions

- Omit all conversational preambles and pleasantries. Get straight to the point.
  Examples:
    - "Sure, I can help with that." -> "Here is the information you requested."
    - "Let me check on that for you." -> "Here is the information you
      requested."
    - "I hope you're having a great day!" -> (Omit entirely)
- Output code blocks immediately.
- Avoid long paragraphs. Explain logic using short, bulleted fragments only.

## Branching and Committing

- Never commit a feature, fix, or other change directly to the `main` branch.
  Always create a dedicated branch first and commit the work there. Use a
  descriptive, conventional branch name, for example:
    - `feat/add-rating-history-feed`
    - `fix/safari-wallet-connect`
    - `chore/bump-eslint`
- Before merging that branch into `main`, make sure everything passes on the
  branch itself:
    - Tests (Foundry `forge test`, Hardhat tests, and any others).
    - Linters and formatters (`npm run lint`, `prettier --check .`,
      `forge fmt --check`, `forge lint`).
    - Builds (`forge build`, the frontend `next build`, and any other build
      step).
- Only merge into `main` once the branch is green. Prefer opening a pull request
  so CI runs, and confirm the required checks pass before merging.
- Merge safely: keep `main` deployable at all times. If a change cannot be made
  green without breaking the codebase, do not force it onto `main` — explain the
  problem and the options instead.

## Directory or File Deletion

- If a directory or file has heavy storage, leave the deletion to the user to
  avoid long timeouts. Include instructions on how to delete the directory or
  file, but do not delete it yourself. Examples:
    - "The `node_modules` directory is quite large. You can delete it by running
      `rm -rf node_modules` in your terminal."
    - Rebuild instructions: "After deleting the `node_modules` directory, you
      can reinstall the dependencies by running `npm install` or `yarn install`
      in your terminal."
    - "The `dist` directory contains build files that can be safely deleted. You
      can remove it with `rm -rf dist`."

## Documentation

- Whenever a feature, function, component, environment variable, or any other
  relevant code element is introduced, provide a brief documentation comment
  above it, if necessary, always take into account if it's necessary to document
  it. The documentation should include:
    - A concise description of what the code element does.
    - Any important parameters or return values, if applicable.
    - An example usage, if relevant.
- Beyond inline code comments, keep all project documentation in sync with every
  change that is committed to GitHub. Before opening a pull request, review
  whether the change affects any documentation and update it in the same branch
  so the docs never drift from the code. This applies to, but is not limited to:
    - Workflows and CI/CD: when a GitHub Actions workflow, job, or required
      check is added, removed, or modified, update any documentation that
      references it (for example, the `README.md` badges and the contribution or
      CI sections).
    - Features, components, and functions: when behavior, public APIs, props, or
      return values change, update the corresponding sections of `README.md`,
      the `docs/` directory, and any usage examples.
    - Environment variables: when an environment variable is added, renamed,
      removed, or has its meaning changed, update `.env.example` (and any other
      `*.example` env templates) along with any prose that documents
      configuration.
    - Dependencies and tooling: when dependencies, scripts, or version
      requirements change, update install/setup instructions, `SECURITY.md`, and
      any notes on technical debt (for example, `NOTES.md`).
    - Scripts and commands: when an `npm` script, Foundry command, or other
      developer command is added or changed, update the documented command
      reference so contributors can copy and paste it without errors.
- For every documentation change, always perform a final review pass to ensure
  correct capitalization, grammar, punctuation, syntax, and overall clarity.
  Prefer short, unambiguous sentences, keep terminology consistent with the rest
  of the codebase, and make sure code blocks, file paths, and identifiers are
  formatted correctly (for example, wrapped in backticks).

## Dependabot Alerts, Code Scanning, Vulnerabilities, and Pull Requests

- Pull each one with the `gh` CLI, I've already authenticated my account.
- For every issue, please ensure it is safe to merge and apply the changes with
  the latest codebase. If there are any conflicts, please resolve them before
  merging, but ensure that the code is still functional and doesn't break any
  existing features.
- If there are any issues that require manual intervention or cannot be
  automatically merged, please provide a detailed explanation of the issue and
  the steps needed to resolve it, so it can be addressed manually.
- After merging, please verify that the changes have been successfully applied
  and that there are no new issues or vulnerabilities introduced. You can do
  this by running the tests and checking the codebase for any errors or
  warnings.
- If there are any issues that arise after merging, please provide a detailed
  explanation of the issue and the steps needed to resolve it, so it can be
  addressed promptly.

## Checking off TODO.md

- Whenever a TODO item is completed, please check it off in the TODO.md file by
  changing the markdown syntax from `- [ ]` to `- [x]`.
- Ensure that the TODO.md file is updated in a timely manner to reflect the
  current status of the tasks and to maintain an accurate record of completed
  and pending items.
- If there are any TODO items that require additional information or
  clarification, please provide a brief explanation or comment next to the item
  in the TODO.md file to ensure that it is clear and understandable for anyone
  who may be reviewing the file in the future.
- After checking off a TODO item, please verify that the corresponding code
  changes have been successfully implemented and that there are no new issues or
  bugs introduced as a result of completing the task. You can do this by running
  the tests and checking the codebase for any errors or warnings.
- If there are any issues that arise after checking off a TODO item, please
  provide a detailed explanation of the issue and the steps needed to resolve
  it, so it can be addressed promptly.
