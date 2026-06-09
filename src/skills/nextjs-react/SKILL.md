---
name: nextjs-react
description:
    Use when changing Next.js App Router pages, layouts, metadata, client
    components, or React hooks.
---

# Next.js And React

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

- Keep server components server-side unless hooks or browser APIs are required.
- Use explicit return types.
- Do not fetch display data in effects when an API route or server component can
  own the read.
- Keep hydration-safe state for wallet, theme, and localStorage reads.
- Run React Doctor after component changes.
