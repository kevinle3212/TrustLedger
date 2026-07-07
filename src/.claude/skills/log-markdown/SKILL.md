---
name: log-markdown
description: Format any file written under logs/ as readable ignored Markdown.
---

## Tool Fallback <!-- tool-fallback -->

- If a preferred tool, command, or skill is unavailable, failing, or a worse fit
  for the task, use the best available alternative rather than stopping or
  forcing it. Note which tool you used and why. Never fall back to a prohibited
  tool (for example `mcp__claude-in-chrome__*` is banned — use `/browse`).

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or the
desired outcome is unclear, interview the user with focused questions until intent
is unambiguous. State assumptions and confirm them before proceeding.

# Log Markdown

Use `src/.agents/skills/log-markdown/SKILL.md` as the canonical log formatting
skill. Every `logs/*.md` file should avoid secrets and summarize command output
instead of storing noisy raw terminal dumps. Run `npm run logs:check` after
writing logs; use `npm run logs:prune` when local logs exceed retention policy.
