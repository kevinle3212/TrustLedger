# Continue Configuration

This directory contains TrustLedger-specific Continue rules. Keep
`~/.continue/config.yaml` global and model-focused; project instructions belong
in `.continue/rules/` so they apply only when this workspace is open.

## Rules

- `01-core-second-brain.md`: always-on identity, precedence, graphify, security,
  and operating defaults.
- `02-architecture-invariants.md`: chain authority, database fallback, AI core,
  sensitive routes, wallet restore, and server/client boundaries.
- `03-workflow-tools-and-agentic-sources.md`: orchestration, gstack, logs, tmp,
  docs sync, and tool fallback.
- `04-frontend-api-ai.md`: path-scoped frontend, API, localization, state, and
  provider-agnostic AI guidance.
- `05-contracts-security-and-compliance.md`: path-scoped Solidity, security,
  dependency, privacy, cookie, and legal-compliance guidance.
- `06-quality-testing-docs.md`: quality gates, React Doctor, Lighthouse, tests,
  documentation, env sync, and commit-message rules.
- `07-source-index-and-skill-map.md`: map back to the project and home agentic
  instruction sources that informed the rule pack.

Continue loads rule files in lexicographical order. Prefix new files with a
number when order matters.
