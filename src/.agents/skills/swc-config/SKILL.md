---
name: swc-config
description:
    Use when changing Next.js compiler behavior, SWC policy files, transform
    assumptions, or generated SWC cache handling.
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

# SWC Config

Review:

- `src/.swc/config.json`
- `src/.swc/README.md`
- `src/next.config.ts`

Strict expectations:

- Next.js remains the runtime owner of SWC transforms.
- Do not commit platform-native SWC plugin cache output.
- Keep parser target, React runtime, and transform assumptions documented.
- Validate changes with `npm run build:frontend`.
