---
trigger: always_on
description: graphify-first exploration policy
---

This project has a graphify knowledge graph at `graphify-out/`.

**Before using search/read tools to explore the codebase, run graphify first:**

- `graphify query "<question>"` — scoped subgraph for any codebase or
  architecture question
- `graphify path "<A>" "<B>"` — dependency path between two symbols
- `graphify explain "<concept>"` — all nodes related to a concept

This applies to Cascade and to every subagent it spawns. Restate this rule
explicitly in any subagent prompt that involves code exploration. Do not skip
graphify because files are "already known" or because a plan is being executed —
the graph surfaces cross-file dependencies and inferred edges that grep and file
reads cannot find.

Only read files directly when:

1. graphify has already oriented you and you need to modify or debug specific
   lines, or
2. `graphify-out/graph.json` does not exist yet.

- If `graphify-out/wiki/index.md` exists, navigate it instead of reading raw
  files.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review, when
  query/path/explain don't surface enough context.
- After modifying code, run `graphify update .` to keep the graph current
  (AST-only, no API cost).
