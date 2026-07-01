# Audits

Structured, timestamped audit reports for TrustLedger. Every audit — run by a
human or an AI agent — produces one Markdown report in the category folder that
matches its focus, generated from a shared template so reports stay consistent
and comparable over time.

## Categories

| Directory         | Focus                                                   |
| ----------------- | ------------------------------------------------------- |
| `general/`        | Cross-cutting or multi-domain reviews                   |
| `security/`       | Vulnerabilities, secrets, auth, supply chain, headers   |
| `accessibility/`  | WCAG 2.2 AA, Section 508, EN 301 549, ADA/EAA           |
| `performance/`    | Core Web Vitals, bundle size, render cost, Lighthouse   |
| `frontend/`       | UI/UX, responsive layout, visual consistency, i18n      |
| `backend/`        | API routes, controllers, contracts, data flow           |
| `infrastructure/` | Docker, Kubernetes, CI/CD, Vercel, env config           |
| `testing/`        | Coverage, flakiness, test-suite health                  |
| `deployment/`     | Release readiness, rollout, rollback, canary            |
| `dependencies/`   | Package freshness, CVEs, license, devDependency hygiene |

## Generate a report

```bash
npm run audit:new -- <type> "short title"
# example:
npm run audit:new -- accessibility "wcag 2.2 aa sweep"
```

This copies `templates/audit-template.md` to
`audits/<type>/<UTC-timestamp>-<slug>.md` with the audit type, UTC timestamp,
git branch, commit hash, repository version, and auditor prefilled. Fill in the
findings, then commit the report on your working branch.

Every report captures: audit type, timestamp, git branch, commit hash,
repository version, files inspected, issues found + severity, fixes applied,
files modified, rationale, recommendations, follow-up actions, remaining work,
verification performed, commands executed, test results, and build status.

## For AI agents

Read [`AGENT-GUIDE.md`](./AGENT-GUIDE.md) before performing any audit so that
findings, severity ratings, and report structure stay consistent across agents
and sessions.

## Report integrity — no false "locks"

The repository **cannot** enforce true filesystem write-protection, and reports
must not claim a file is "locked." Instead, integrity is governed by review:

- **CODEOWNERS** (`.github/CODEOWNERS`) requests review from the maintainer on
  changes to `audits/` (and other sensitive paths).
- **Branch protection** (configured in GitHub, not the repo) should require pull
  requests, passing CI, and CODEOWNERS review before merging to `main`. See
  [`GOVERNANCE.md`](./GOVERNANCE.md) for the exact settings to enable.
- Reports are **append-only by convention**: correct a finding in a new report
  that references the prior one rather than rewriting history.
