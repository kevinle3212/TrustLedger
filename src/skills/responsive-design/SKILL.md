---
name: responsive-design
description:
    Use when changing layouts, navigation, tables, cards, panels, or
    mobile/tablet behavior.
---

## Tool Fallback <!-- tool-fallback -->

- If a preferred tool, command, or skill is unavailable, failing, or a worse fit
  for the task, use the best available alternative rather than stopping or
  forcing it. Note which tool you used and why. Never fall back to a prohibited
  tool (for example `mcp__claude-in-chrome__*` is banned — use `/browse`).

## Clarify Before Acting <!-- clarify-before-acting -->

Before running this skill or producing output, if the request is ambiguous or
the desired outcome is unclear, interview the user with focused questions until
intent is unambiguous. State assumptions and confirm them before proceeding.

# Responsive Design

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../../CREDITS.md).

- Prefer stable shell classes from `app/app-desktop.scss`.
- Prevent horizontal overflow on every public route.
- Keep fixed-format controls at stable dimensions.
- Use wrapping clusters or horizontal scrollers for dense nav and toolbars.
- Test at mobile, tablet, desktop, and wide desktop widths.
