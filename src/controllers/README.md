# Controllers

Controllers hold the **request-orchestration** logic that sits between thin API
route handlers (`app/api/**/route.ts`) and the domain/IO logic in `services/`.

## Responsibilities

A controller is responsible for:

- **Authorization gating** — verifying sessions/tokens before acting.
- **Input parsing and whitelisting** — turning untrusted input into a typed,
  validated shape.
- **Service composition** — calling one or more `services/` functions.
- **Response shaping** — returning a framework-agnostic result
  `{ status, body }`.

A controller is **not** responsible for HTTP framework concerns. It never
imports from `next/server` and never touches `NextRequest`/`NextResponse`. This
keeps controllers unit-testable without spinning up the Next.js runtime.

## Boundary

```text
route.ts (HTTP)  ->  controller (orchestration)  ->  services (domain/IO)
```

- **Route** extracts HTTP specifics (headers, parsed body, URL params), calls
  the controller, and maps the returned `{ status, body }` to a `NextResponse`.
- **Controller** is pure orchestration over plain inputs and returns a
  `ControllerResult`.
- **Service** owns domain logic, persistence, crypto, and external calls.

## Shared Types

`ControllerResult<T>` (see `result.ts`) is the common return contract: an HTTP
status code plus a typed success body or a `{ error }` body.

## Adding a Controller

1. Create `src/controllers/<name>Controller.ts`.
2. Accept already-extracted inputs (tokens, parsed bodies), never `NextRequest`.
3. Return `ControllerResult<T>`.
4. Keep the matching route handler thin: extract → call → map to `NextResponse`.
