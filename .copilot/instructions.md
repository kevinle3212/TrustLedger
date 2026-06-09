# Copilot instructions

Follow root `AGENTS.md` first, then `.cursor/instructions/precedence.md` for
path routing context.

## Strict defaults

- Keep generated run notes and audit summaries in `logs/`.
- Format every `logs/*.md` file with `src/.agents/skills/log-markdown/SKILL.md`.
- Use `src/.agents/agents/dependency-auditor.md` for package freshness,
  vulnerabilities, devDependencies, and overrides.
- Use `src/.agents/skills/swc-config/SKILL.md` before changing `.swc/` policy or
  compiler settings.
- Use `src/.agents/skills/update-context/SKILL.md` after repository changes so
  docs, comments, visible project surfaces, and agent instructions stay current.
- Do not include secrets, `.env` values, tokens, mnemonics, private keys, or raw
  credentials in instructions, logs, prompts, or generated files.
- Prefer targeted tests and the existing project scripts over ad hoc commands.
