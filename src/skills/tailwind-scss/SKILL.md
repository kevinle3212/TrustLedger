---
name: tailwind-scss
description:
    Use when changing Tailwind v4, PostCSS, SCSS helpers, theme utilities,
    motion, or dark mode styling.
---

# Tailwind And SCSS

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

- Tailwind v4 is loaded through `app/globals.scss` and `postcss.config.mjs`.
- Shared helpers live in `app/helpers.css` and layout shells live in
  `app/app-desktop.scss`.
- Use helper classes for repeated surface, text, focus, link, and motion
  patterns.
- Respect `prefers-reduced-motion`.
- Avoid decorative glass, gradient text, and one-off shadow systems.
