---
name: log-markdown
description:
    Format any file written under logs/ as markdownlint-compliant Markdown.
---

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
npx markdownlint-cli2 "logs/**/*.md"
```

If `logs/` is ignored and the command is too broad for the current task, run it
against the specific log file.

Use `npm run logs:prune` when `logs:check` reports stale, oversized, or excess
local log files.
