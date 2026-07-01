<!--
  TrustLedger audit report template.

  Do not edit reports by hand from scratch — generate a prefilled, timestamped
  copy with:

      npm run audit:new -- <type> "<short-title>"

  where <type> is one of the category directories under audits/ (general,
  security, accessibility, performance, frontend, backend, infrastructure,
  testing, deployment, dependencies). The generator fills the metadata block
  below from git; you fill in the findings.
-->

# {{TITLE}}

| Field              | Value         |
| ------------------ | ------------- |
| Audit type         | {{TYPE}}      |
| Timestamp (UTC)    | {{TIMESTAMP}} |
| Git branch         | {{BRANCH}}    |
| Commit hash        | {{COMMIT}}    |
| Repository version | {{VERSION}}   |
| Auditor            | {{AUTHOR}}    |

## Scope

<!-- What this audit covers and, explicitly, what it does not. -->

## Files Inspected

<!-- List every file, route, or surface examined. One per line. -->

- `path/to/file`

## Issues Found

<!--
  One row per issue. Severity: Critical | High | Medium | Low | Info.
  Status: Open | Fixed | Won't Fix | Deferred.
-->

| #   | Severity | Issue | Location | Status |
| --- | -------- | ----- | -------- | ------ |
| 1   |          |       |          |        |

## Fixes Applied

<!-- What was changed to resolve issues, keyed to the numbers above. -->

- **#1** — describe the fix.

## Files Modified

<!-- Every file changed by this audit. -->

- `path/to/file`

## Rationale

<!-- Why the fixes were chosen; tradeoffs considered. -->

## Recommendations

<!-- Improvements not made in this pass but advised. -->

## Follow-up Actions

<!-- Concrete, assignable next steps. -->

- [ ] action

## Remaining Work

<!-- Known gaps and anything intentionally left unaddressed. -->

## Verification Performed

<!-- How the fixes were verified. Note browser/tooling limitations honestly. -->

### Commands Executed

```bash
# commands run during this audit
```

### Test Results

<!-- Pass/fail summary and relevant output. -->

### Build Status

<!-- Result of the production build, if run. -->

## Sign-off

<!--
  Reports are governance artifacts, not immutable files. The repository cannot
  enforce true filesystem write-protection; instead, integrity is protected by
  branch protection + CODEOWNERS review (see audits/README.md). Do not claim a
  file is "locked."
-->

- Auditor: {{AUTHOR}}
- Reviewed by:
- Date:
