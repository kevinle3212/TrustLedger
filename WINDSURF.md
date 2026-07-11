# WINDSURF.md

Context file for [Windsurf](https://windsurf.com)'s Cascade agent. Windsurf
reads `WINDSURF.md` the way Claude reads `CLAUDE.md`, Gemini reads `GEMINI.md`,
and other assistants read `AGENTS.md`.

To keep a single source of truth, follow **[`AGENTS.md`](./AGENTS.md)** for this
repository's engineering conventions (UI copy rules, branching/commit rules,
quality pipeline, documentation, and directory policies). `AGENTS.md` is
authoritative; do not duplicate its rules here. This file covers only what is
specific to Windsurf/Cascade: where its rules and workflows live, how its MCP
servers are wired, how the app's AI provider config (including DeepSeek) works,
and how to create symlinks in this repo.

## Table of contents

- [Purpose and precedence](#purpose-and-precedence)
- [Windsurf configuration directory (`.windsurf/`)](#windsurf-configuration-directory-windsurf)
- [MCP servers](#mcp-servers)
- [graphify](#graphify)
- [AI provider configuration](#ai-provider-configuration)
- [Symlinks](#symlinks)
- [Quality gates and workflows](#quality-gates-and-workflows)
- [Logs, scratch, and docs sync](#logs-scratch-and-docs-sync)
- [Files this document references or introduces](#files-this-document-references-or-introduces)

## Purpose and precedence

When guidance conflicts, Cascade should resolve it in this order:

1. User instructions in the active task.
2. Root [`AGENTS.md`](./AGENTS.md) — authoritative engineering conventions.
3. This file (`WINDSURF.md`) and its `.windsurf/rules/*.md` — Windsurf/
   Cascade-specific configuration.
4. `CLAUDE.md` / `GEMINI.md` — the same rules restated for other assistants;
   useful precedent, not binding on Cascade.
5. General repository documentation (`docs/`, `README.md`).

All edits must comply with `docs/QUALITY-STANDARDS.md`: React Doctor stays at
100/100, and merges/deployments are blocked when React Doctor, type-check, lint,
tests, build, accessibility, performance, or security checks fail.

## Windsurf configuration directory (`.windsurf/`)

Windsurf's Cascade agent reads project configuration from `.windsurf/`,
mirroring the pattern already used in this repo for `.cursor/`, `.continue/`,
`.gemini/`, `.copilot/`, and `.codex/`:

| Path                        | Purpose                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------- |
| `.windsurf/rules/*.md`      | Cascade rules — always-on guardrails or scoped, per-glob context.                       |
| `.windsurf/workflows/*.md`  | Cascade workflows — reusable multi-step procedures invoked as `/workflow-name`.         |
| `.windsurf/mcp_config.json` | Reference copy of this repo's MCP server definitions (see [MCP servers](#mcp-servers)). |

Each rule file carries YAML frontmatter that sets its `trigger`:

| `trigger`        | Behavior                                                                          |
| ---------------- | --------------------------------------------------------------------------------- |
| `always_on`      | Always included in Cascade's context. Use sparingly — costs tokens on every turn. |
| `glob`           | Included only when a file matching `globs:` is open or edited.                    |
| `model_decision` | Cascade decides, from `description:`, whether the rule is relevant.               |
| `manual`         | Only included when explicitly invoked (`@rule-name`).                             |

This repo ships two rules, both `always_on` because they encode non-negotiable,
repo-wide policy (small, so the token cost is worth it):

- [`.windsurf/rules/precedence.md`](./.windsurf/rules/precedence.md) — the
  precedence order from the section above, as a rule Cascade actually loads
  (this markdown file is documentation; the rule is what Cascade reads at
  runtime).
- [`.windsurf/rules/graphify.md`](./.windsurf/rules/graphify.md) — the
  graphify-first exploration policy (see [graphify](#graphify)).

Add new rules with `trigger: glob` for path-scoped guidance (mirroring
`.cursor/rules/frontend.mdc`, `.cursor/rules/contracts.mdc`, etc.) rather than
growing the `always_on` rules — keep those two minimal.

Windsurf's exact settings surface has moved before; if a path above doesn't
match your installed build, check Windsurf → Settings → Cascade for the current
location and treat the files in this repo as the source of truth for _content_,
adjusting only _where Windsurf expects to find them_.

## MCP servers

The canonical MCP server schema for this repo is [`.mcp.json`](./.mcp.json)
(Serena for symbolic code navigation, Nexus for the pre-indexed knowledge graph
— see `tools/nexus-mcp.js`). Every assistant config in this repo is checked
against it for drift by `npm run lint:mcp`
(`tools/check-mcp-config-parity.mjs`), which now also covers
`.windsurf/mcp_config.json`.

As of this writing, Cascade loads MCP server definitions from a **global**
config, not a per-project one — typically `~/.codeium/windsurf/mcp_config.json`,
editable from Windsurf → Settings → Cascade → Plugins → "View raw config".
`.windsurf/mcp_config.json` in this repo is a reference copy (same `mcpServers`
block as `.cursor/mcp.json`) to copy/merge into that global file — merge it in
rather than overwriting any other servers you already have configured there.

## graphify

This project has a knowledge graph at `graphify-out/` with god nodes, community
structure, and cross-file relationships.
[`.windsurf/rules/graphify.md`](./.windsurf/rules/graphify.md) enforces this as
an `always_on` rule; the policy:

- For codebase questions, run `graphify query "<question>"` first, when
  `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"` for
  relationships and `graphify explain "<concept>"` for focused concepts. These
  return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md` or raw
  grep output.
- If `graphify-out/wiki/index.md` exists, use it for broad navigation instead of
  raw source browsing.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review, or
  when query/path/explain don't surface enough context.
- After modifying code, run `graphify update .` to keep the graph current
  (AST-only, no API cost).
- This applies to every subagent Cascade spawns for code exploration too —
  restate it explicitly in subagent prompts.

## AI provider configuration

Two separate systems both get called "AI config" here — don't conflate them when
debugging behavior:

1. **TrustLedger's app-level AI core** (`src/core/ai`) — the runtime the
   _product_ uses (see the Architecture Invariants in `CLAUDE.md`).
   Provider-agnostic, driven entirely by environment variables; never hardcode a
   provider at a call site.
2. **Cascade's own reasoning model** — which model _Windsurf itself_ uses to act
   as your agent. Configured in Windsurf → Settings → Cascade → Manage Models
   (subscription models, or a custom OpenAI-compatible endpoint on builds that
   support BYOK). This has no effect on TrustLedger's runtime AI routes, and
   vice versa.

### App-level provider config (`src/core/ai`)

Two ways to declare providers (full schema:
[`src/core/ai/config.ts`](./src/core/ai/config.ts), env reference:
`.env.example` lines 196-236):

- **Simple, single provider** — `AI_PROVIDER_KIND` (`openai-compatible` or
  `gemini`), `AI_BASE_URL`, `AI_API_KEY`, `AI_DEFAULT_MODEL`.
- **Advanced, multi-provider** — `AI_PROVIDERS_JSON` (an array of provider
  entries, each naming an `apiKeyEnv` to read), with per-task routing via
  `AI_ROUTES_JSON`.

A built-in `disabled` provider always exists as a safe fallback, so the app runs
(returning clearly marked placeholder output) with zero AI config.

### DeepSeek provider

DeepSeek's API speaks the OpenAI Chat Completions protocol, so reaching it needs
no new adapter — just an `openai-compatible` provider entry.

**Already reachable today, zero config** — the built-in OpenRouter fallback
(active once `OPENROUTER_API_KEY` is set) defaults `AI_FALLBACK_MODEL` to
`deepseek/deepseek-chat-v3-0324:free`, routed through OpenRouter's free tier.
This is why `deepseek` already appears in `src/core/ai/config.ts` and
`src/tests/unit/core-ai.test.ts`.

**Direct, first-party DeepSeek API key** — wire DeepSeek as its own named
provider via `AI_PROVIDERS_JSON` (this is the "deepseek config"):

```json
[
    {
        "name": "deepseek",
        "kind": "openai-compatible",
        "baseUrl": "https://api.deepseek.com",
        "apiKeyEnv": "DEEPSEEK_API_KEY",
        "defaultModel": "deepseek-chat"
    }
]
```

Then set (server-only — never `NEXT_PUBLIC_*`, never source control):

```bash
DEEPSEEK_API_KEY=sk-...
# Optional — make DeepSeek the default provider instead of "default"/OpenRouter:
AI_DEFAULT_PROVIDER=deepseek
```

Model ids: `deepseek-chat` (DeepSeek-V3, general purpose) and
`deepseek-reasoner` (DeepSeek-R1, extended chain-of-thought reasoning).

**Docs reference:** <https://api-docs.deepseek.com> — DeepSeek's official API
reference (endpoints, model ids, rate limits, and OpenAI-SDK compatibility
notes; `baseUrl` above works with or without a trailing `/v1`, per those docs).

## Symlinks

Cascade may be asked to mirror a file or directory into a new location. This
repo already does that deliberately in several places — reuse the existing
pattern rather than copying files.

### Creating a symlinked directory

```bash
ln -s <target-dir> <link-name>
```

Existing example — `db` at the repo root points at `database/`:

```bash
ln -s database db
```

### Creating a symlinked file

```bash
ln -s <target-file> <link-name>
```

Existing example — `database/schema.prisma` points at the canonical Prisma
schema under `src/` (create the link from inside the link's own directory so the
relative target resolves correctly):

```bash
cd database && ln -s ../src/prisma/schema.prisma schema.prisma
```

### Existing symlinks in this repo (reference — don't recreate)

| Link                           | Target                       | Why                                                           |
| ------------------------------ | ---------------------------- | ------------------------------------------------------------- |
| `db`                           | `database/`                  | short alias                                                   |
| `database/schema.prisma`       | `src/prisma/schema.prisma`   | single source of truth (Architecture Invariants, `CLAUDE.md`) |
| `database/migrations`          | `src/prisma/migrations`      | same                                                          |
| `docs/TERMS_AND_CONDITIONS.md` | `../TERMS_AND_CONDITIONS.md` | legal doc kept byte-identical, no drift possible              |
| `docs/PRIVACY_POLICY.md`       | `../PRIVACY_POLICY.md`       | same                                                          |
| `docs/RISK_DISCLOSURE.md`      | `../RISK_DISCLOSURE.md`      | same                                                          |

### Notes

- Git tracks a symlink as a blob holding the link-target text, at mode `120000`
  — `git ls-files -s <path>` shows this. Stage the link itself; don't resolve
  and copy in the contents it points to.
- Use relative targets (`../src/prisma/schema.prisma`), not absolute paths, so
  the link still resolves after a clone to a different path.
- Windows needs Developer Mode or admin rights to materialize symlinks, and
  `git config core.symlinks` must be `true` (the default on macOS and Linux) or
  a clone turns the link into a plain text file containing the target path
  instead of a real symlink.
- `CREDITS.md` / `AGENT-CONTEXT.md` and their `docs/` counterparts are **not**
  symlinks — they're separately maintained mirrors kept in sync by
  `npm run docs:mirrors` (see `CLAUDE.md` → Docs Sync), because the `docs/`
  copies intentionally add wiki navigation chrome the root files don't have.
  Don't "fix" those into symlinks.

## Quality gates and workflows

The blocking gates are documented once, in `CLAUDE.md` → Quality Gates — run
them from `src/` before any PR:

```bash
npx tsc --noEmit          # TypeScript
npm run lint:frontend     # ESLint + Prettier
npm run doctor            # React Doctor — must stay 100/100
```

[`.windsurf/workflows/quality-gates.md`](./.windsurf/workflows/quality-gates.md)
wraps the same three commands as a Cascade slash-command (`/quality-gates`) so
you don't have to retype them. React Doctor below 100/100 blocks merge, release,
and deploy; Husky's pre-commit hook runs React Doctor `--staged` then the lint
suite, but it fails _late_ — run the gates above yourself first.

## Logs, scratch, and docs sync

- Write run notes and audit summaries to the git-ignored `logs/`, formatted per
  `src/.agents/skills/log-markdown/SKILL.md`.
- Scratch files go in project-local `tmp/` (`TRUSTLEDGER_TMP_DIR=./tmp`); run
  `npm run tmp:check` after creating one, `npm run tmp:prune` on retention
  limits.
- After a change that touches behavior, env vars, scripts, API routes, or
  moved/renamed files, run the `update-context` skill
  (`src/.agents/skills/update-context/SKILL.md`) to keep docs and agent
  instructions — this file included — in sync.
- Structured audits belong under `audits/`; see `audits/AGENT-GUIDE.md`.

## Files this document references or introduces

Created alongside this file:

- [`.windsurf/mcp_config.json`](./.windsurf/mcp_config.json) — MCP server
  definitions to copy into Windsurf's global Cascade MCP config.
- [`.windsurf/rules/precedence.md`](./.windsurf/rules/precedence.md) — the
  precedence order above, as a rule Cascade loads at runtime.
- [`.windsurf/rules/graphify.md`](./.windsurf/rules/graphify.md) — the
  graphify-first exploration policy, as an `always_on` rule.
- [`.windsurf/workflows/quality-gates.md`](./.windsurf/workflows/quality-gates.md)
  — the `/quality-gates` Cascade workflow.

Existing files this document points to:

- [`AGENTS.md`](./AGENTS.md) — authoritative engineering conventions.
- [`CLAUDE.md`](./CLAUDE.md) — Claude-specific mirror of the same rules, plus
  the Architecture Invariants and Quality Gates sections referenced throughout
  this file.
- [`docs/QUALITY-STANDARDS.md`](./docs/QUALITY-STANDARDS.md) — canonical quality
  spec.
- [`.mcp.json`](./.mcp.json) — canonical MCP schema this file's config mirrors.
- [`src/core/ai/config.ts`](./src/core/ai/config.ts), `.env.example` — AI
  provider config the DeepSeek example above follows.
- [`tools/check-mcp-config-parity.mjs`](./tools/check-mcp-config-parity.mjs) —
  now also checks `.windsurf/mcp_config.json`.
