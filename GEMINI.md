# GEMINI.md

Context file for Google Gemini CLI. Gemini reads `GEMINI.md` the way Claude
reads `CLAUDE.md` and other agents read `AGENTS.md`.

To keep a single source of truth, follow **[`AGENTS.md`](./AGENTS.md)** for this
repository's engineering conventions (UI copy rules, branching/commit rules,
quality pipeline, documentation, and directory policies). `AGENTS.md` is
authoritative; do not duplicate its rules here.

Tooling notes:

- MCP servers are wired in [`.gemini/settings.json`](./.gemini/settings.json):
  Serena for symbolic navigation (`--context=agent`) and Nexus for the
  pre-indexed code graph, using the canonical wrapper
  `node ./scripts/nexus-mcp.js server --project .` with `NEXUS_MCP_TIMEOUT_MS` /
  `NEXUS_MAX_TREE_SITTER_TS_BYTES` — matching `.mcp.json`.
- Write run notes and audit summaries to the git-ignored `logs/`; format them
  per `src/.agents/skills/log-markdown/SKILL.md`.
- Structured audits belong under `audits/` — see `audits/AGENT-GUIDE.md`.
