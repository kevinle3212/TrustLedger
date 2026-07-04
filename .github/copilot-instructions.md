# GitHub Copilot instructions

Follow root `AGENTS.md` and `.copilot/instructions.md`.

Enforce `docs/QUALITY-STANDARDS.md`: React Doctor must stay at 100/100, and no
merge or deployment may proceed when React Doctor, type-check, lint, tests,
build, accessibility, performance, or security checks fail. Validate compliance
before completing changes.

Use the path-specific `.cursor/rules/*.mdc` files for frontend, backend,
contract, security, testing, and documentation routing.

After repository changes, use `src/.agents/skills/update-context/SKILL.md` to
keep docs, comments, visible project surfaces, and agent instructions current.

## Orchestration

Act as the orchestrator: use the most token/usage-friendly approach without
compromising quality, security, or best practices. Plan and delegate with
cheaper models where possible, and reserve the most capable model for planning
and the final QA pass rather than routine implementation. The Claude-specific
model-tier delegation policy lives in `CLAUDE.md`.

## graphify

For any question about this repo's architecture, structure, components, or how
to add/modify/find code, your first action should be
`graphify query "<question>"` when `graphify-out/graph.json` exists. Use
`graphify path "<A>" "<B>"` for relationship questions and
`graphify explain "<concept>"` for focused-concept questions. These return a
scoped subgraph, usually much smaller than the full report or raw grep output.

Triggers: "how do I…", "where is…", "what does … do", "add/modify a
<component>", "explain the architecture", or anything that depends on how files
or classes relate.

If `graphify-out/wiki/index.md` exists, use it for broad navigation. Read
`graphify-out/GRAPH_REPORT.md` only for broad architecture review or when
query/path/explain do not surface enough context. Only read source files when
(a) modifying/debugging specific code, (b) the graph lacks the needed detail, or
(c) the graph is missing or stale.

Type `/graphify` in Copilot Chat to build or update the graph.

After a code change that adds, removes, or rewires relationships — imports,
calls, or new, renamed, moved, or deleted files or symbols — run
`graphify update .` to keep the graph current (AST-only, no API cost). Pure
comment, string, or formatting edits that leave the structure unchanged do not
need it.
