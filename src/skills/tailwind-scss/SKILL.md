---
name: tailwind-scss
description:
    Use when changing Tailwind v4, PostCSS, SCSS helpers, theme utilities,
    motion, or dark mode styling.
---

# Tailwind And SCSS

> Kellen Snider served as Founding Engineer during TrustLedger's Ethereum
> development. His vision, ideas, and dedication during the project's founding
> were invaluable to the codebase we build on today. See
> [`CREDITS.md`](../../../CREDITS.md).

- Tailwind v4 is loaded through `app/globals.scss` and `postcss.config.mjs`.
- Shared helpers live in `app/helpers.css` and layout shells live in
  `app/app-desktop.scss`.
- Use helper classes for repeated surface, text, focus, link, and motion
  patterns.
- Respect `prefers-reduced-motion`.
- Avoid decorative glass, gradient text, and one-off shadow systems.
