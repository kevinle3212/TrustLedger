# Codex Agent Notes

Read root `AGENTS.md` first. This file adds TrustLedger-specific Codex behavior
only. Global Codex defaults live in `~/.codex/AGENTS.md` and
`~/.codex/config.toml`.

## Orientation

- Use `graphify query "<question>"` before raw source browsing for codebase,
  architecture, routing, dependency, and ownership questions when
  `graphify-out/graph.json` exists.
- Use `graphify path "<A>" "<B>"` for relationship tracing and
  `graphify explain "<concept>"` for one focused concept.
- Read `graphify-out/wiki/index.md` for broad navigation when it exists.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review.
- After modifying code, config, docs, or agent instructions, run
  `graphify update .` so the local graph stays current.

## Configuration Ownership

- Keep universal Codex defaults in `~/.codex/config.toml`.
- Keep TrustLedger-only model, hook, and MCP settings in `.codex/config.toml`.
- Keep project hooks in `.codex/hooks.json`; do not move them into global
  config.
- Keep long-lived project behavior in `AGENTS.md` or this file, not in one-off
  prompts.
- Do not add API keys, tokens, RPC URLs, private wallet data, deployment
  secrets, or machine-local credentials to Codex config files.
- ChatGPT auth is primary for Codex. Do not introduce `OPENAI_API_KEY`
  dependencies for Codex, Serena, Nexus, Graphify, or hooks.

## MCP Responsibilities

Cross-agent ownership split: root `AGENTS.md` §"MCP and Graph Tool Ownership"
is the single definition; this section adds Codex mechanics only.

- Serena is global and cwd-aware. Use it for symbolic navigation and focused
  repository inspection.
- Nexus is project-local. Use it for MCP-backed source graph context from
  `./scripts/nexus-mcp.js`.
- Graphify is a project skill and CLI workflow. Use it for graph queries,
  graph refreshes, and graph-audit output instead of starting a duplicate
  always-on MCP.
- Browser and Chrome tools come from global Codex plugins. Prefer the in-app
  browser for localhost UI validation; fall back to Playwright only when the
  browser plugin is unavailable or blocked.
- Computer Use is for desktop UI tasks only. Do not use it for source inspection
  or shell work.

## Shell And Permissions

- Read `@/Users/kevinkhanhle/.codex/RTK.md` at session start.
- Prefix shell commands with `rtk` when available.
- Treat uncommitted user changes as user-owned.
- Request escalation for network, GUI, out-of-workspace writes, destructive
  operations, and sandbox-blocked commands that are necessary to the task.
- Never run destructive git commands, broad deletes, force pushes, or production
  mutations unless explicitly requested and approved.
- Keep local external fetches and RPC transports bounded by explicit timeouts.

## Repository Hygiene

- Keep agent run notes, audit output, and error triage in ignored `logs/`.
- Format `logs/*.md` with `src/.agents/skills/log-markdown/SKILL.md` and run
  `npm run logs:check` after writing logs.
- Keep scratch files in project-local `tmp/` unless an external tool requires
  another location. Run `npm run tmp:check` after creating scratch files.
- Prefer targeted checks before broad gates.
- If a command appears stuck, inspect duplicate build, dev, doctor, analyzer, or
  generated lock processes before launching another copy.
- Do not delete pre-existing dead code outside the task. Surface it separately.

## Required Routing

- Dependency or vulnerability reviews use
  `src/.agents/agents/dependency-auditor.md` and write a summary under `logs/`.
- SWC changes use `src/.agents/skills/swc-config/SKILL.md`.
- Admin dashboard changes use `.sixth/skills/admin-dashboard/SKILL.md`.
- Rust backend changes use `.sixth/skills/rust-backend/SKILL.md`.
- Legal, privacy, cookie, or compliance-sensitive changes use
  `src/.agents/skills/legal-compliance/SKILL.md`.
- After repository changes, use `src/.agents/skills/update-context/SKILL.md` to
  keep docs, comments, and agent instructions synchronized.

## Quality Gates

- Enforce `docs/QUALITY-STANDARDS.md`.
- React Doctor must stay at `100/100`.
- Lighthouse must stay at `95+` in Performance, Accessibility, Best Practices,
  and SEO before deployment.
- Run the nearest relevant lint, type, test, build, and security checks for the
  files changed.
- Resolve new warnings at the root cause. Suppress only verified false positives
  with an inline justification.
- Keep `controllers/` separation and `CREDITS.md` acknowledgements current.

## Commit And Release Discipline

- Never commit directly to `main`.
- Commit messages must satisfy `commitlint.config.js`: valid type, allowed
  optional scope, lower-case or sentence-case subject, no trailing period, and a
  header of `72` characters or fewer.
- Before staging, run the nearest relevant duplicate, secret, type, lint, test,
  and build checks for the changed surface.
- Do not mark roadmap, phase, milestone, or planning items complete without
  objective implementation and validation evidence.

## Tool Fallback

- If a preferred tool, command, skill, script, or agent is unavailable, use the
  best permitted alternative and state the substitution.
- Never use prohibited tools to bypass policy.
