---
name: log-markdown
description: Format any file written under logs/ as markdownlint-compliant Markdown.
---

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or the
desired outcome is unclear, interview the user with focused questions until intent
is unambiguous. State assumptions and confirm them before proceeding.

# Log Markdown

Use `src/.agents/skills/log-markdown/SKILL.md` as the canonical log formatting
skill. Every `logs/*.md` file should pass markdownlint, avoid secrets, and
summarize command output instead of storing noisy raw terminal dumps. Run
`npm run logs:check` after writing logs; use `npm run logs:prune` when local
logs exceed retention policy.
