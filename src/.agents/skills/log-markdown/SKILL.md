---
name: log-markdown
description:
    Format any file written under logs/ as readable ignored Markdown.
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

Use this skill before writing or updating any file under `logs/`.

## Requirements

- Use Markdown, not plain text, JSON, ANSI terminal output, or raw command
  dumps.
- Use one top-level `#` heading.
- Use sentence-case headings.
- Leave one blank line around headings, tables, lists, and fenced code blocks.
- Use fenced code blocks with language tags for commands or snippets.
- Keep list indentation flat unless hierarchy is required.
- Keep table columns concise and aligned by Prettier.
- Do not include secrets, private keys, tokens, mnemonics, `.env` values, or raw
  credentials.
- Prefer summaries over full noisy command output.

## Validation

When a log should be kept or reviewed, run:

```bash
npm run logs:check
```

`logs/` is ignored by git and excluded from markdownlint gates, so hooks enforce
retention only.

Use `npm run logs:prune` when `logs:check` reports stale, oversized, or excess
local log files.
