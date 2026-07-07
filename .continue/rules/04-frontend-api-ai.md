---
name: TrustLedger Frontend API And AI
globs:
    - "src/app/**/*"
    - "src/components/**/*"
    - "src/contexts/**/*"
    - "src/hooks/**/*"
    - "src/lib/**/*"
    - "src/services/**/*"
    - "src/controllers/**/*"
    - "src/core/ai/**/*"
    - "src/messages/**/*.json"
alwaysApply: false
---

# Frontend, API, And AI Rules

- Use strict TypeScript with explicit return types for new functions, hooks,
  services, controllers, and public APIs. Avoid `any` unless justified.
- Keep Server Components server-side unless hooks or browser APIs are required.
  Mark Client Components intentionally and keep their dependency graph small.
- Do not fetch display data in effects when a Server Component, API route, or
  service can provide the data cleanly.
- Keep state local unless it crosses a route or provider boundary. Use context
  only for cross-cutting state such as role; keep wallet state in wagmi/Reown.
- Avoid `localStorage` during server render. Keep wallet, theme, and browser
  state hydration-safe.
- Keep route-specific components colocated with their route. Shared primitives,
  layout shells, and reusable UI belong in `src/components`.
- Use Tailwind v4 tokens and existing helpers from `app/globals.scss`,
  `app/helpers.css`, and layout SCSS. Avoid one-off inline styles and decorative
  glass, gradient text, or shadow systems.
- Prevent horizontal overflow on public routes. Test mobile, tablet, desktop,
  and wide desktop layouts for changed screens.
- User-visible copy belongs in locale message files. Use Title Case for short UI
  labels, buttons, badges, menu items, headings, and chips. Use sentence case
  for full explanatory text. Preserve project acronyms exactly.
- After changing visible localized copy, compare non-source locale files against
  `src/messages/en.json` for accidental English leftovers.
- Validate API request bodies, path params, query params, headers, and cookies
  at the route boundary before service calls.
- Return JSON-safe values from API routes, especially for bigint and dates.
  Avoid stack traces, secrets, internal paths, and raw provider errors in
  responses.
- Gate privileged routes with server-only bearer secrets or documented auth
  layers. Keep non-`NEXT_PUBLIC_*` env values out of browser code.
- Keep external calls bounded, observable, and cached when appropriate. Avoid
  unbounded RPC scans, event scans, retries, and provider waits.
- Use service helpers for reusable API and business logic; avoid duplicating
  route handlers across endpoints.
- Add or update focused tests for changed helpers, API behavior, components,
  hooks, route flows, and AI adapters.
- Run or recommend nearest checks after frontend/API changes:
  `cd src && npx tsc --noEmit`, `npm run lint:frontend`, relevant Jest or
  Playwright tests, `npm run doctor`, and the production build.
