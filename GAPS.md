# GAPS.md

Known defects, debt, and risks, from the 2026-07-09 repository audit. Every item
below was verified against the working tree, not inferred. Update this file when
items are fixed; move resolved entries to `## Resolved` with a date.

Severity: **Critical** (breaks correctness/security now) · **High** (will cause
real failures or drift soon) · **Medium** (friction, waste, risk) · **Low**
(polish).

## Medium

### M2 — Agent preamble is still token-heavy (partially fixed)

`AGENTS.md` (347 → 187 lines), `TODO.md` (1,530 → 383) and `NOTES.md` (950
→ 199) were trimmed, with history moved to `docs/TODO-ARCHIVE.md` and
`docs/NOTES-ARCHIVE.md`. **Still open:** `AGENT-CONTEXT.md` remains 341 lines
and every agent session is told to read it in full. **Fix:** move per-role
detail out of `AGENT-CONTEXT.md` into the role's own skill file, leaving
precedence + invariants + pointers.

## Low

### L1 — Repo-root clutter

`profile.cpuprofile` (3.5 MB), `.DS_Store`, `.tsbuildinfo.debug`, and `trace/`
(3.4 MB) sit at the repo root. All are gitignored, so this is local-only noise —
regenerable TypeScript/Node profiling artifacts. **Fix:** delete locally, or
relocate to `tmp/` and adopt a `tmp:prune` habit. Deliberately left in place as
of 2026-07-09.

### L2 — `db -> database` symlink

The tracked root symlink `db` aliases `database/`. Symlinked duplicate paths
confuse file watchers and agents. **Fix:** `git rm db` and drop its row from the
layout table in `database/README.md` (the only reference). Deliberately left in
place as of 2026-07-09.

## Not audited this pass (needs its own session)

- Full application-surface production-readiness sweep (auth flows, uploads,
  messaging, notifications end-to-end) — needs a running environment.
- Vercel dashboard-side settings (headers, analytics, runtime selection) — only
  `src/vercel.json` (crons) is in-repo.
- Security-scanner backlogs (Dependabot/CodeQL/Semgrep/Slither alerts) — needs
  `gh` triage per the CLAUDE.md Dependabot policy.
- Contract-level economic/game-theory review (juror selection seed uses
  `block.prevrandao` when no VRF — documented trade-off, not re-derived here).

## Resolved

- **H1 — Diverged skill trees** (2026-07-09). `src/.agents/skills/` is now the
  canonical home for the seven shared skills (`dependency-audit`, `env-sync`,
  `kubernetes`, `legal-compliance`, `log-markdown`, `react-doctor`,
  `update-context`); the copies in `src/.claude/skills/`, `src/skills/`, and
  `.sixth/skills/` are one-line pointer stubs.
- **H2 — Conflicting legal-compliance routing** (2026-07-09). `CLAUDE.md`,
  `AGENTS.md`, and `.codex/AGENTS.md` all route to
  `src/.agents/skills/legal-compliance/SKILL.md`.
- **H3 — Root/docs pairs drift** (2026-07-09). `tools/check-doc-mirrors.mjs`
  (`npm run docs:mirrors`, also run by `docs:build`) now fails on drift. Root
  legal drafts stay canonical; `FAQ.md` and `SECURITY.md` are intentionally
  distinct from their `docs/` namesakes.
- **M1 — Stale CLAUDE.md skill list** (2026-07-09).
- **M3 — Unnamed graphify communities** (2026-07-09). `graphify cluster-only .`
  named all 260 non-thin communities (66 thin ones are omitted by design).
  Incremental `graphify update .` maintains them from here.
- **M4 — Uncommitted work on `chore/docs-and-signin-nonces`** (2026-07-09).
  Validated and committed. The juror change keeps the register form mounted when
  the registry is unavailable, showing an inline notice and disabling submit,
  with a matching guard in `handleRegister`.
- **M5 — Duplicate MCP/graph tooling responsibilities** (2026-07-09).
  `AGENTS.md` §"MCP and Graph Tool Ownership" is the single cross-agent
  definition.
- **L3 — Arbitrum Sepolia TODO in docs prose** (2026-07-09). Moved from
  `docs/ARCHITECTURE.md` into `TODO.md` Phase 10.
