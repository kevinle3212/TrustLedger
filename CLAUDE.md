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
