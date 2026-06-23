# AI Guidance Precedence

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

1. User instructions in the active task.
2. Repository `AGENTS.md` or `.codex/AGENTS.md` guidance for Codex.
3. Role-specific files such as `CLAUDE.md`.
4. Cursor rules in `.cursor/rules/`, selected by glob.
5. General repository documentation.

Cursor should route frontend, backend, contract, security, docs, and testing
context based on the modified path globs in `.cursor/rules/`.

All edits must comply with `docs/QUALITY-STANDARDS.md`: React Doctor stays at
100/100, and merges and deployments are blocked when React Doctor, type-check,
lint, tests, build, accessibility, performance, or security checks fail.
