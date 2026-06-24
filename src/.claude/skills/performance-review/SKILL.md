---
name: performance-review
description: Use when changing wallet reads, event scans, rendering loops, large assets, images, animations, or client bundle dependencies.
---

# Performance Review

## Checklist

- Avoid adding client dependencies for server-only tasks.
- Keep RPC scans bounded and chunked.
- Prefer SVG or optimized images for small UI marks.
- Avoid layout-property animations.
- Keep expensive wallet reads scoped to the route that needs them.
- Run React Doctor after React component changes.
