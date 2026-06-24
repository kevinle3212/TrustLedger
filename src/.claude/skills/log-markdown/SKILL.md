---
name: log-markdown
description: Format any file written under logs/ as markdownlint-compliant Markdown.
---

# Log Markdown

Use `src/.agents/skills/log-markdown/SKILL.md` as the canonical log formatting
skill. Every `logs/*.md` file should pass markdownlint, avoid secrets, and
summarize command output instead of storing noisy raw terminal dumps. Run
`npm run logs:check` after writing logs; use `npm run logs:prune` when local
logs exceed retention policy.
