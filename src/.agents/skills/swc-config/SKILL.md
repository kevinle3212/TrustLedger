---
name: swc-config
description:
    Use when changing Next.js compiler behavior, SWC policy files, transform
    assumptions, or generated SWC cache handling.
---

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
