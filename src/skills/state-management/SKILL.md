---
name: state-management
description:
    Use when changing React state, context, localStorage, wallet state, React
    Query, or route data flow.
---

# State Management

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

- Keep state local unless it crosses a route or provider boundary.
- Use context only for cross-cutting state such as role.
- Keep wallet state in wagmi/Reown hooks.
- Avoid localStorage during server render.
- Prefer derived values over duplicated state.
