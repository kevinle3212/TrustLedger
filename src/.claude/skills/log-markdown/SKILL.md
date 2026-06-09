---
name: log-markdown
description: Format any file written under logs/ as markdownlint-compliant Markdown.
version: "1.0.0"
---

# Log Markdown

Use `src/.agents/skills/log-markdown/SKILL.md` as the canonical log formatting
skill. Every `logs/*.md` file should pass markdownlint, avoid secrets, and
summarize command output instead of storing noisy raw terminal dumps.
