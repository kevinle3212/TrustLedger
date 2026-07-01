# Audit Agent Guide

Instructions for AI agents (Claude Code, Cursor, Codex, Gemini, and others)
performing audits in this repository. Follow this so every audit is consistent,
verifiable, and honest about its limits.

## Procedure

1. **Pick the category** that matches the audit focus (see `README.md`). Use
   `general` only for genuinely cross-cutting work.
2. **Generate the report** first, so metadata is captured against the exact
   commit you audit:

    ```bash
    npm run audit:new -- <type> "short title"
    ```

3. **Inspect before changing anything.** Record every file, route, or surface
   you examine under "Files Inspected." Prefer read-only search tools for the
   discovery pass.
4. **Record findings** in the "Issues Found" table with an honest severity:

    | Severity | Meaning                                                      |
    | -------- | ------------------------------------------------------------ |
    | Critical | Exploitable security hole, data loss, or fully broken flow   |
    | High     | Broken feature, failed a11y success criterion, blocking bug  |
    | Medium   | Degraded UX/perf, partial coverage, non-blocking correctness |
    | Low      | Cosmetic, minor inconsistency, nice-to-have                  |
    | Info     | Observation, no action required                              |

5. **Fix what is realistic in scope**, keeping changes surgical (see root
   `CLAUDE.md`). Log each fix under "Fixes Applied" and list touched files under
   "Files Modified."
6. **Verify.** Run the relevant gates and paste real output under "Verification
   Performed":
    - Frontend: `npx tsc --noEmit`, `npm run lint:frontend`, `npm run doctor`,
      `npm test`, `next build`.
    - Contracts: `forge test`, `forge fmt --check`, `forge build`.
7. **Be honest about verification limits.** State plainly what could not be
   verified — e.g. "Safari/Firefox/Edge/Arc/Brave not tested; only headless
   Chromium was available." Never imply a browser or assistive technology was
   exercised when it was not.
8. **Do not claim files are locked.** Integrity is enforced by review
   (CODEOWNERS + branch protection), not by the filesystem.

## Consistency rules

- One report per audit run; never overwrite a prior report. Supersede it with a
  new report that links back.
- Keep reports markdownlint-clean (mirror `logs/` formatting conventions).
- Use UTC timestamps (the generator does this).
- Reference issues by their table number throughout the report.
- Wrap all paths, commands, and identifiers in backticks.

## Prompt snippet (reusable)

> Perform a `<type>` audit of TrustLedger. Generate a report with
> `npm run audit:new -- <type> "<title>"`, inspect the relevant surfaces before
> modifying anything, record findings with honest severities, apply only
> surgical fixes, run the verification gates, and paste real command output.
> State explicitly what you could not verify. Do not claim any file is locked.
