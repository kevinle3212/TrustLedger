# Codex Agent Notes

Read root `AGENTS.md` first. This file only adds Codex-specific behavior.

## Shell

- Read `@/Users/kevinkhanhle/.codex/RTK.md` at session start.
- Prefix shell commands with `rtk` when available.
- Do not duplicate Claude-only behavior from `CLAUDE.md`.

## Repo Hygiene

- Treat uncommitted user changes as owned by the user.
- Keep generated diagnostics, agent run notes, audit output, and error logs in
  `logs/`; the directory is intentionally ignored by git.
- Format `logs/*.md` with `src/.agents/skills/log-markdown/SKILL.md`.
- Run `npm run logs:check` after writing logs; use `npm run logs:prune` when
  retention limits are exceeded.
- For frontend specialist context, read `src/.agents/README.md` and the matching
  skill under `src/.agents/skills/` before editing.

## Required Routing

- Dependency and vulnerability reviews: use
  `src/.agents/agents/dependency-auditor.md` and write the summary log under
  `logs/`.
- If the user explicitly approves high-risk npm audit registry disclosure,
  request escalated `npm audit` execution and state that approval in the
  justification.
- SWC changes: use `src/.agents/skills/swc-config/SKILL.md`, then run
  `npm run swc:populate` and the relevant build.
- React diagnostics: use `src/skills/react-doctor/SKILL.md` and keep the score
  from regressing.
