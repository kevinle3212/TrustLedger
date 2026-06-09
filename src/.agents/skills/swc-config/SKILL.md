---
name: swc-config
description:
    Use when changing Next.js compiler behavior, SWC policy files, transform
    assumptions, or generated SWC cache handling.
version: "1.0.0"
---

# SWC Config

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

Review:

- `src/.swc/config.json`
- `src/.swc/README.md`
- `src/next.config.ts`

Strict expectations:

- Next.js remains the runtime owner of SWC transforms.
- Do not commit platform-native SWC plugin cache output.
- Keep parser target, React runtime, and transform assumptions documented.
- Validate changes with `npm run build:frontend`.
