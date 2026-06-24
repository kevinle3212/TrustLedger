# GitHub Copilot instructions

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../CREDITS.md).

Follow root `AGENTS.md` and `.copilot/instructions.md`.

Enforce `docs/QUALITY-STANDARDS.md`: React Doctor must stay at 100/100, and no
merge or deployment may proceed when React Doctor, type-check, lint, tests,
build, accessibility, performance, or security checks fail. Validate compliance
before completing changes.

Use the path-specific `.cursor/rules/*.mdc` files for frontend, backend,
contract, security, testing, and documentation routing.

After repository changes, use `src/.agents/skills/update-context/SKILL.md` to
keep docs, comments, visible project surfaces, and agent instructions current.
