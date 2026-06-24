---
name: swc-config
description:
    Use when changing Next.js compiler behavior, SWC policy files, transform
    assumptions, or generated SWC cache handling.
---

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
