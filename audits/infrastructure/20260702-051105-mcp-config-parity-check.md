# mcp config parity check

| Field              | Value                |
| ------------------ | -------------------- |
| Audit type         | infrastructure       |
| Timestamp (UTC)    | 2026-07-02T05:11:05Z |
| Git branch         | main                 |
| Commit hash        | b90cb32              |
| Repository version | 0.1.0                |
| Auditor            | Kevin Khanh Le       |

## Scope

Closes the two follow-up actions left open by
[`20260701-035427-ai-tooling-configuration-audit.md`](./20260701-035427-ai-tooling-configuration-audit.md):

- "Optionally add an MCP-config parity/lint check."
- The recommendation to "add a check that every `--context` value is a valid
  Serena context" so the assistant configs cannot silently drift again.

Scope is the committed per-assistant MCP configuration only. It does not
re-audit MCP runtime behavior or user-global config outside the repository.

## Files Inspected

- `.mcp.json`, `.cursor/mcp.json`, `.copilot/mcp-config.json`,
  `.gemini/settings.json`, `.codex/config.toml`
- `package.json` (`lint`, `lint:config`, `lint:js` scripts)
- `eslint.scripts.config.mjs` (tools glob)

## Issues Found

| #   | Severity | Issue                                                                                                                                                                         | Location             | Status |
| --- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------ |
| 1   | Low      | The new parity check surfaced a real drift the prior audit missed: `.codex/config.toml`'s serena entry had no `NO_COLOR=1` env, unlike every other assistant's serena config. | `.codex/config.toml` | Fixed  |
| 2   | Info     | No automated gate previously asserted MCP-config parity, so future drift (invalid Serena context, Nexus bypassing the wrapper, missing tuned env) would pass unnoticed.       | repo-wide            | Fixed  |

## Fixes Applied

- **#1** — Added `[mcp_servers.serena.env]` with `NO_COLOR = "1"` to
  `.codex/config.toml` so ANSI codes stay out of its stdio JSON-RPC stream,
  matching the other four assistants.
- **#2** — Added `tools/check-mcp-config-parity.mjs`, a dependency-light Node
  check (uses the already-present `smol-toml` for the Codex TOML) that verifies,
  for all five configs:
    - Serena uses a valid `--context` (allow-list: `ide`, `agent`,
      `claude-code`, `codex`, `copilot-cli`) and sets `NO_COLOR=1`.
    - Nexus runs the canonical `scripts/nexus-mcp.js` wrapper (never the raw
      `nexus-graph` binary) with the tuned env (`NEXUS_MCP_TIMEOUT_MS=120000`,
      `NEXUS_MAX_TREE_SITTER_TS_BYTES=25000`, `NODE_ENV=development`,
      `NO_COLOR=1`). Wired it in as `npm run lint:mcp` and chained it into the
      aggregate `npm run lint`, so CI (which runs `npm run lint`) now enforces
      parity. Added the file to the `lint:js` ESLint targets and the
      `eslint.scripts.config.mjs` tools glob.

## Files Modified

- `tools/check-mcp-config-parity.mjs` (new)
- `.codex/config.toml`
- `package.json` (`lint`, `lint:config` → new `lint:mcp`, `lint:js`)
- `eslint.scripts.config.mjs`

## Rationale

A generator that emits every config from one source-of-truth fragment (the prior
audit's stronger suggestion) would also prevent drift, but it is a larger,
higher-risk change that reformats five committed files. A read-only parity check
is surgical, deterministic, and CI-enforceable, and it caught a live drift on
its first run — enough to close the follow-up without churning the configs. The
valid-context set is a static allow-list sourced from the prior audit because
Serena is a Python tool whose contexts cannot be reliably enumerated in CI; the
list is small and documented for updates alongside a Serena upgrade.

## Recommendations

- If the assistant configs grow, revisit the source-of-truth generator idea so
  the Nexus/Serena blocks are emitted rather than hand-maintained.

## Follow-up Actions

- [x] Add an MCP-config parity/lint check (this report).
- [x] Validate every Serena `--context` value against the known-good set.
- [ ] Reconnect serena in each assistant's `/mcp` after the `.codex` env change
      (manual, per-assistant; not automatable from the repo).

## Remaining Work

- None in-repo for parity. Re-running `/mcp` in each assistant is a local user
  action.

## Verification Performed

Ran the new check before and after the `.codex` fix, and re-ran the ESLint and
Prettier gates on every touched file.

### Commands Executed

```bash
node tools/check-mcp-config-parity.mjs   # failed on .codex NO_COLOR, then passed after fix
npm run lint:mcp                          # all five configs consistent
npm run lint:js                           # ok (new tool file linted)
npx prettier --check tools/check-mcp-config-parity.mjs package.json eslint.scripts.config.mjs
```

### Test Results

`lint:mcp`: 5/5 configs consistent after the fix (was 1 failing: `.codex` serena
missing `NO_COLOR=1`). `lint:js`: ok. Prettier: all formatted.

### Build Status

Config/tooling-only change; no application build impact.

## Sign-off

- Auditor: Kevin Khanh Le
- Reviewed by:
- Date:
