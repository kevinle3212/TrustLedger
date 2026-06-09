# AI Guidance Precedence

1. User instructions in the active task.
2. Repository `AGENTS.md` or `.codex/AGENTS.md` guidance for Codex.
3. Role-specific files such as `CLAUDE.md`.
4. Cursor rules in `.cursor/rules/`, selected by glob.
5. General repository documentation.

Cursor should route frontend, backend, contract, security, docs, and testing
context based on the modified path globs in `.cursor/rules/`.
