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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community
structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when
  graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for
  relationships and `graphify explain "<concept>"` for focused concepts. These
  return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw
  grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of
  raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when
  query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current
  (AST-only, no API cost).
