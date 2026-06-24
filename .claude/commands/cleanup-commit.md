# cleanup-commit

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today.
> See [`CREDITS.md`](../../CREDITS.md).

Step-by-step agent guide for cleaning up code, resolving lint errors, and
committing changes correctly in TrustLedger.

---

## Overview

Four phases in order:

1. Run all linters and collect every error
2. Auto-fix what can be fixed automatically
3. Manually resolve remaining errors
4. Commit with a Conventional Commits message and let hooks verify it

Do not skip phases or commit before all linters exit clean.

---

## Phase 1  -  Run All Linters

Run from the repo root. Collect all output before fixing anything.

```bash
# TypeScript (ESLint 9 flat config, type-aware, strict)
npm run lint:ts

# Solidity style + security rules
npm run lint:sol

# Prettier format check (TypeScript, JSON, Markdown, YAML, Solidity)
npm run lint:prettier

# Solidity formatter check (Foundry)
cd contracts && forge fmt --check

# Frontend ESLint + Prettier (run from src/)
cd src && npm run lint:frontend
```

Shorthand (runs lint:ts + lint:sol together, skips frontend and forge fmt):

```bash
npm run lint
```

---

## Phase 2  -  Auto-Fix What Can Be Fixed

Fix Prettier violations across the entire repo:

```bash
npx prettier --write .
```

Fix Solidity formatting:

```bash
cd contracts && forge fmt
```

ESLint does **not** auto-fix most rules in this project; the ruleset is
intentionally strict. Do not rely on `--fix` for ESLint. Manually resolve the
remaining errors in Phase 3.

---

## Phase 3  -  Resolve ESLint and Solhint Errors Manually

### TypeScript ESLint  -  common violations

| Rule | Fix |
| --- | --- |
| `@typescript-eslint/no-explicit-any` | Replace `any` with the concrete type. Use `unknown` for genuinely unknown input. |
| `@typescript-eslint/no-floating-promises` | `await` the promise, or prefix with `void` if intentionally fire-and-forget. |
| `@typescript-eslint/explicit-function-return-type` | Add an explicit return type to every function, including arrow functions. |
| `@typescript-eslint/no-non-null-assertion` | Replace `x!` with an explicit null check (`if (x === null) throw ...`). |
| `@typescript-eslint/strict-boolean-expressions` | Use explicit comparisons  -  `=== null`, `=== undefined`, `=== ""`  -  not implicit truthiness. |
| `@typescript-eslint/no-unsafe-assignment` | Type-narrow or cast via `as`, but prefer typing the source correctly. |
| `@typescript-eslint/promise-function-async` | Add `async` to any function that returns a `Promise`. |
| `@typescript-eslint/return-await` | Always `return await` inside `try`/`catch`  -  bare `return promise` skips the catch block. |
| `@typescript-eslint/no-unnecessary-condition` | Remove the condition  -  the type guarantees it is always truthy or always falsy. |
| `@typescript-eslint/prefer-readonly` | Add `readonly` to class properties that are never reassigned after construction. |
| `no-console` | Remove `console.*` calls outside `scripts/`. In scripts, `no-console` is disabled by the per-file override. |
| `prefer-const` | Change `let` to `const` for bindings that are never reassigned. |
| `eqeqeq` | Replace `==` / `!=` with `===` / `!==`. |

### Solhint  -  common violations

| Rule | Fix |
| --- | --- |
| `custom-errors` | Replace `require("string")` with a named custom error (`error MyError(); revert MyError();`). |
| `no-magic-numbers` | Extract literals to named `constant` or `immutable` at the contract level. |
| Missing explicit visibility | Add `public`, `private`, `internal`, or `external` to every function. |
| `func-named-parameters` | Use named return parameters where the return type is ambiguous. |

### Verify clean

Re-run after all fixes:

```bash
npm run lint && npm run lint:prettier
cd contracts && forge fmt --check
```

Both must exit with code 0 before moving to Phase 4.

---

## Phase 4  -  Stage and Commit

### Stage only intended files

```bash
git add path/to/file1 path/to/file2
```

Never use `git add -A` or `git add .` without reviewing the diff first. It can
include `.env` files, binary artifacts, or generated files.

Verify what is staged:

```bash
git diff --staged
```

### Write the commit message

Messages are validated by `commitlint` via the `commit-msg` hook (Husky). The
project follows
[Conventional Commits](https://www.conventionalcommits.org/).

**Format:**

```text
<type>(<optional-scope>): <description>
```

**Valid types:**

| Type | Use for |
| --- | --- |
| `feat` | New feature or on-chain capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, whitespace  -  no logic change |
| `refactor` | Code restructuring  -  no behavior change |
| `test` | Adding or correcting tests |
| `chore` | Dependency updates, tooling, scripts |
| `build` | Build system or compilation changes |
| `ci` | GitHub Actions, workflow files |
| `perf` | Performance improvement |
| `revert` | Reverts a prior commit |

**Scope** (optional): a short kebab-case noun scoping the change, such as
`arbitration`, `juror-registry`, `reputation`, `frontend`, `deploy`, or `docs`.

**Rules enforced by commitlint:**

- Type is required
- Description is required  -  imperative mood, no trailing period
- Max subject line length: 100 characters
- No `Co-Authored-By` footer

**Good examples:**

```text
feat(arbitration): add severe minority slashing threshold constant
fix(trustledger): prevent double payout on re-executed ruling
docs: add rtk and Excalidraw references to MISCELLANEOUS.md
chore: run prettier --write across all files
refactor(juror-registry): extract stake validation into private helper
test: add fuzz coverage for payout conservation on split rulings
ci: pin forge to stable in lint workflow
```

**Bad examples (these will be rejected):**

```text
fixed stuff
Update files
WIP
feat: Add new feature.      ← trailing period
```

### Commit

```bash
git commit -m "type(scope): description"
```

The `pre-commit` hook (Husky) automatically runs before the commit is recorded:

```bash
npm run lint && npm run lint:frontend && npm run lint:prettier
```

If the hook fails, the commit is aborted. Fix all reported errors, re-stage, and
run `git commit` again. **Do not use `--no-verify`.**

The `commit-msg` hook then validates the message format. If it is rejected, amend:

```bash
git commit --amend
```

---

## Checklist

- [ ] `npm run lint`  -  exits 0
- [ ] `npm run lint:prettier`  -  exits 0
- [ ] `cd contracts && forge fmt --check`  -  exits 0
- [ ] `cd src && npm run lint:frontend`  -  exits 0
- [ ] `git diff --staged` reviewed  -  no `.env`, secrets, or unintended files
- [ ] Commit message follows Conventional Commits format
- [ ] Pre-commit hook passed without `--no-verify`

---

## Tools Reference

| Tool | Role | Docs |
| --- | --- | --- |
| **ESLint 9** | TypeScript linting, flat config in `eslint.config.mjs`, type-aware, strict | [eslint.org](https://eslint.org) |
| **Prettier** | Formatting  -  config in `.prettierrc.json` | [prettier.io](https://prettier.io) |
| **Solhint** | Solidity security and style rules  -  config in `.solhint.json` | [protofire.github.io/solhint](https://protofire.github.io/solhint/) |
| **forge fmt** | Solidity auto-formatter built into Foundry | [book.getfoundry.sh](https://book.getfoundry.sh/reference/forge/forge-fmt) |
| **commitlint** | Enforces Conventional Commits on every commit message via the `commit-msg` hook | [commitlint.js.org](https://commitlint.js.org) |
| **Husky** | Manages `pre-commit` and `commit-msg` git hooks | [typicode.github.io/husky](https://typicode.github.io/husky/) |
| **rtk** | Token-optimized Claude Code CLI proxy  -  transparently wraps shell commands to reduce context usage | `rtk gain` to inspect savings |
| **Nexus Graph** | Indexes TypeScript/JS source as a symbol graph for token-budgeted MCP context (`npm run nexus:index`) | `.mcp.json` |
