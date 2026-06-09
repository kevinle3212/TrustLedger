# AGENTS.md

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
- Contract work: `contracts`, `test`, and `.cursor/rules/contracts.mdc`.
- Security work: `SECURITY.md`, `docs/SECURITY.md`, workflows, API routes,
  contracts, and `.cursor/rules/security.mdc`.
- Testing work: `src/tests`, `test`, `contracts/test`, and
  `.cursor/rules/testing.mdc`.
- Documentation work: root markdown, `docs/`, `src/README.md`, and
  `.cursor/rules/docs.mdc`.

## Roadmap Discipline

Do not mark roadmap, Oracle, Phase, milestone, or planning items complete unless
objective implementation and validation evidence exists. Phase 7 Item 3 remains
open until comprehensive coverage evidence satisfies the original scope.
