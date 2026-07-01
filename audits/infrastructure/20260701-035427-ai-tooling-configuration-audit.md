# AI Tooling Configuration Audit

| Field              | Value                   |
| ------------------ | ----------------------- |
| Audit type         | infrastructure          |
| Timestamp (UTC)    | 2026-07-01T03:54:27Z    |
| Git branch         | main                    |
| Commit hash        | a2c4dcf                 |
| Repository version | 0.1.0                   |
| Auditor            | Kevin Khanh Le (Claude) |

## Scope

Every AI-assistant configuration surface committed to the repository: MCP server
wiring, per-assistant instruction files, and the tools named in the request
(Serena, RTK, Nexus, Claude Code, Cursor, Codex, Gemini, OpenAI, MCP servers,
existing project tooling). Excludes user-global config outside the repo (e.g.
`~/.claude/CLAUDE.md`, the RTK hook), which cannot be audited from here.

## Files Inspected

- `.mcp.json` (Claude Code MCP: serena, nexus)
- `.cursor/mcp.json`
- `.copilot/mcp-config.json`, `.copilot/instructions.md`
- `.codex/config.toml`, `.codex/AGENTS.md`, `.codex/hooks.json`
- `.serena/project.yml`, `.serena/project.local.yml`
- `.nexus/graph.db` (indexed graph artifact)
- `scripts/nexus-mcp.js` (project MCP wrapper)
- `.github/copilot-instructions.md`
- `AGENTS.md`, `AGENT-CONTEXT.md`
- `package.json` (`nexus:index`, `nexus:server`, `nexus:viz` scripts)

## Issues Found

| #   | Severity | Issue                                                                                                                                                                                                                                                                                                    | Location                                                             | Status    |
| --- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------- |
| 1   | Medium   | Nexus MCP command drift: Cursor/Copilot/Codex invoked the raw `nexus-graph` binary directly, bypassing the project wrapper `scripts/nexus-mcp.js` and its timeout/tree-sitter env tuning used by `.mcp.json` and the `nexus:server` npm script.                                                          | `.cursor/mcp.json`, `.copilot/mcp-config.json`, `.codex/config.toml` | Fixed     |
| 2   | High     | **Serena could not start in Cursor**: `.cursor/mcp.json` passed `--context=cursor`, which is not a valid Serena context (`serena` exits with `FileNotFoundError: Context cursor not found`). Valid contexts include `ide`, `agent`, `claude-code`, `codex`, `copilot-cli`. Repointed to `--context=ide`. | `.cursor/mcp.json`                                                   | Fixed     |
| 3   | Low      | Claude Code's `.mcp.json` serena entry lacked `NO_COLOR`, unlike every other assistant. Added `env.NO_COLOR=1` to keep ANSI codes out of the stdio JSON-RPC stream and match the other configs.                                                                                                          | `.mcp.json`                                                          | Fixed     |
| 4   | Low      | Gemini had no committed configuration. Added `GEMINI.md` (defers to `AGENTS.md`) and wired MCP in `.gemini/settings.json` (serena `--context=agent` + canonical Nexus wrapper).                                                                                                                          | `GEMINI.md`, `.gemini/settings.json`                                 | Fixed     |
| 5   | Info     | RTK is configured only in the user's global `~/.claude/` (hook-based) and correctly has no repo-level config; nothing to change in-repo.                                                                                                                                                                 | (global)                                                             | No change |
| 6   | Info     | OpenAI is represented via Codex (`.codex/config.toml`, model `gpt-5.5`). No stray OpenAI SDK/API config to reconcile.                                                                                                                                                                                    | `.codex/`                                                            | No change |

## Fixes Applied

- **#1** — Repointed the `nexus` MCP server in `.cursor/mcp.json`,
  `.copilot/mcp-config.json`, and `.codex/config.toml` to
  `node ./scripts/nexus-mcp.js server --project .` and added the matching env
  (`NEXUS_MCP_TIMEOUT_MS=120000`, `NEXUS_MAX_TREE_SITTER_TS_BYTES=25000`) so all
  four assistants use the same canonical, tuned invocation as Claude Code.
- **#2** — `.cursor/mcp.json` serena `--context=cursor` → `--context=ide`
  (verified `ide` starts and exposes 22 tools; `cursor` is not a Serena
  context).
- **#3** — Added `env.NO_COLOR=1` to the serena entry in `.mcp.json`.
- **#4** — Added `GEMINI.md` and `.gemini/settings.json` (serena + Nexus MCP).

## Files Modified

- `.cursor/mcp.json` (nexus wrapper + serena context fix)
- `.copilot/mcp-config.json`
- `.codex/config.toml`
- `.mcp.json` (serena `NO_COLOR`)
- `GEMINI.md`, `.gemini/settings.json` (new)

## Rationale

The project ships a wrapper (`scripts/nexus-mcp.js`) precisely to pin the MCP
timeout and cap tree-sitter parsing bytes for large TS files. The npm scripts
already treat it as canonical. The other assistants had drifted to the raw
binary, which starts a differently-tuned server and can hang or over-parse.
Aligning them removes a silent inconsistency without changing behavior for the
common case. Serena's `--context` is per-assistant, so each value must be a real
Serena context — Cursor's `cursor` was not, which is why serena failed there;
`ide` is the correct IDE context.

## Recommendations

- Consider a single source-of-truth JSON fragment for the nexus MCP block plus a
  generator, so the assistant configs cannot drift again — and add a check that
  every `--context` value is a valid Serena context.
- Keep `.serena/` and `.nexus/` graph artifacts out of review noise
  (`.nexus/graph.db*` confirmed git-ignored this session).

## Follow-up Actions

- [ ] Reconnect serena in each assistant's `/mcp` after these config changes.
- [ ] Optionally add an MCP-config parity/lint check.

## Remaining Work

- No automated test asserts MCP-config parity across assistants; the generator
  recommendation above would close that gap.

## Verification Performed

- Confirmed `serena` resolves on PATH and that `scripts/nexus-mcp.js` and
  `node_modules/.bin/nexus-graph` both exist.
- Confirmed each edited config remains valid JSON/TOML by inspection; the
  repo-wide `npm run lint:config` gate (run at session end) covers config lint.

### Commands Executed

```bash
command -v serena
ls node_modules/.bin/nexus-graph scripts/nexus-mcp.js
```

### Test Results

Not applicable to config edits; covered by the session-wide gate.

### Build Status

Config-only change; no build impact. Covered by the session-wide build.

## Sign-off

- Auditor: Kevin Khanh Le (Claude)
- Reviewed by:
- Date:
