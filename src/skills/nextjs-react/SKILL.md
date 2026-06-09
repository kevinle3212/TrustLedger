---
name: nextjs-react
description:
    Use when changing Next.js App Router pages, layouts, metadata, client
    components, or React hooks.
---

# Next.js And React

- Keep server components server-side unless hooks or browser APIs are required.
- Use explicit return types.
- Do not fetch display data in effects when an API route or server component can
  own the read.
- Keep hydration-safe state for wallet, theme, and localStorage reads.
- Run React Doctor after component changes.
