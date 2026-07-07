---
name: TrustLedger Workflow Tools And Agentic Sources
alwaysApply: true
---

# Workflow, Tools, And Agentic Sources

- Treat this rule pack as a condensed second brain, not a replacement for the
  source files. When a task touches a specific area, consult the owning source:
  `AGENTS.md`, `CLAUDE.md`, `AGENT-CONTEXT.md`, `.cursor/rules/*.mdc`,
  `.github/copilot-instructions.md`, `.copilot/instructions.md`, project skills,
  review agents, and home agentic files.
- Home guidance to honor when applicable: `~/.claude/CLAUDE.md`,
  `~/.codex/AGENTS.md`, and `~/.codex/RTK.md`. Reference other home agentic
  configs rather than copying secrets or machine-local values.
- Use gstack-style workflows when spawning Claude Code sessions: `/review` for
  code review, `/cso` for security audit, `/qa` or `/qa-only` for URL QA,
  `/autoplan` for planning/building, and `/ship` for final readiness.
- Act as orchestrator: choose the most token- and cost-efficient path that does
  not compromise correctness, security, accessibility, or maintainability.
- For multi-task prompts, render a Markdown checkbox checklist before work, one
  requested task per item with a verification step, and update it as work
  completes.
- Prefer targeted checks first, then broader gates. If a build, dev server,
  doctor run, or analyzer hangs, inspect for duplicate processes or stale locks
  before launching another.
- When moving, replacing, or removing code, remove stale imports, exports,
  tests, route references, docs, styles, and config in the same change.
- Run duplicate and secret checks before staging or commit workflows when
  relevant: `bash tools/remove-duplicates.sh --fail-on-found .` and
  `npm run secrets:check`.
- Agent run notes, audit summaries, triage output, and Impeccable notes belong
  in `logs/`, which is ignored. Format them with
  `src/.agents/skills/log-markdown/SKILL.md`; run `npm run logs:check` after
  writing logs and prune when retention limits are exceeded.
- Scratch files belong in project-local `tmp/`. Set `TRUSTLEDGER_TMP_DIR=./tmp`
  when scripts need an explicit temporary root. Run `npm run tmp:check` after
  creating scratch files and prune when needed.
- After code, config, workflow, deployment, website, documentation, or agent
  guidance changes, use `src/.agents/skills/update-context/SKILL.md` to update
  authoritative docs and remove stale references.
- When adding or changing scripts, workflows, provider integrations, deployment
  steps, CLI dependencies, or external service requirements, update
  `docs/ENVIRONMENT.md#configuration-beyond-env` and nearest owning docs.
- Localhost UI checks are allowed when requested. Start the frontend from `src/`
  with `rtk npm run dev:frontend`; prefer the in-app browser plugin, and fall
  back to Playwright if needed.
- Do not mark roadmap, TODO, phase, milestone, or planning items complete
  without objective implementation and validation evidence.
