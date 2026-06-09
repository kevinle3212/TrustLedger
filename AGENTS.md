# AGENTS.md

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

TrustLedger agent guidance is intentionally layered to avoid contradictions.

## Precedence

1. Active user request.
2. Repository `AGENTS.md`.
3. `.codex/AGENTS.md` for Codex-specific behavior.
4. `CLAUDE.md` for Claude-specific behavior.
5. `.cursor/rules/*.mdc` for Cursor path-specific context.
6. General repository documentation.

## Shell Commands

Codex sessions must read `@/Users/kevinkhanhle/.codex/RTK.md` and prefix shell
commands with `rtk` when available.

## Routing

- Frontend work: `src/app`, `src/components`, `src/contexts`, `src/lib`, and
  `.cursor/rules/frontend.mdc`.
- Backend work: `src/app/api`, `src/services`, and `.cursor/rules/backend.mdc`.
- Admin dashboard work: `src/app/[locale]/admin`, `src/app/api/admin`,
  `src/services/admin*`, `docs/ADMIN.md`, and
  `.sixth/skills/admin-dashboard/SKILL.md`.
- Rust backend work: `.cargo/`, `Cargo.toml`, `lib/`, `programs/`, `infra/`,
  `docs/ADMIN.md`, and `.sixth/skills/rust-backend/SKILL.md`.
- Contract work: `contracts`, `test`, and `.cursor/rules/contracts.mdc`.
- Security work: `SECURITY.md`, `docs/SECURITY.md`, workflows, API routes,
  contracts, and `.cursor/rules/security.mdc`.
- Legal or compliance-sensitive work: root legal draft markdown files,
  `docs/LEGAL.md`, the website legal center, `SECURITY.md`, and
  `.sixth/skills/legal-compliance/SKILL.md`.
- Testing work: `src/tests`, `test`, `contracts/test`, and
  `.cursor/rules/testing.mdc`.
- Documentation work: root markdown, `docs/`, `src/README.md`, and
  `.cursor/rules/docs.mdc`.
- Dependency and vulnerability review: use
  `src/.agents/agents/dependency-auditor.md`; write scan summaries and
  recommendations to `logs/`.
- Agentic run logs, Impeccable notes, audit results, errors, and issue triage
  notes belong in `logs/`. The directory is intentionally ignored by git. Format
  every `logs/*.md` file with `src/.agents/skills/log-markdown/SKILL.md` so
  ignored logs still comply with markdownlint. Run `npm run logs:check` after
  writing logs and `npm run logs:prune` when retention limits are exceeded.
- SWC cache/policy work: use `src/.agents/skills/swc-config/SKILL.md`, keep
  generated native binaries ignored, and run `npm run swc:populate` before
  frontend builds or push-time checks.
- After code, config, workflow, deployment, documentation, website, or agent
  guidance changes, use `src/.agents/skills/update-context/SKILL.md` to update
  the nearest authoritative docs/comments and run the relevant validation.

## Roadmap Discipline

Do not mark roadmap, Oracle, Phase, milestone, or planning items complete unless
objective implementation and validation evidence exists. When a roadmap item is
closed, keep any remaining future scope documented in reports or follow-up tasks
instead of silently dropping it.
