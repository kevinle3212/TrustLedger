---
name: accessibility-review
description: Use when auditing or changing forms, navigation, buttons, dialogs, status messages, dark mode, contrast, or keyboard behavior.
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

# Accessibility Review

## Checklist

- Every form control has a visible label and programmatic association.
- Every actionable icon has an accessible name.
- Focus states are visible in light, dark, and high-contrast modes.
- Color-coded state also has text, shape, or icon support.
- Body text meets WCAG AA contrast.
- Motion respects `prefers-reduced-motion`.
- Public routes have no horizontal overflow at mobile and desktop widths.
