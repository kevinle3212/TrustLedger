# Copilot instructions

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../CREDITS.md).

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
- Enforce `docs/QUALITY-STANDARDS.md`: every change must pass TypeScript,
  ESLint, the tests, and the production build; keep React Doctor at 100/100 and
  Lighthouse at 95+ in every category (Performance, Accessibility, Best
  Practices, SEO) before deployment (target 100 where achievable). Never
  introduce unused code, preserve accessibility and security, and investigate
  and resolve new warnings at their root cause instead of suppressing them.
