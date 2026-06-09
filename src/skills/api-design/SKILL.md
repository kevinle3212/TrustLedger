---
name: api-design
description:
    Use when changing Next.js API routes, services, response shapes, validation,
    caching, or monitoring.
---

# API Design

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

- Validate inputs at the route boundary.
- Return JSON-safe values, especially for bigint data.
- Keep external calls bounded, observable, and cached when appropriate.
- Use service helpers for reusable logic.
- Document endpoint behavior and examples.
