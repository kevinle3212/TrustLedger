# `core/` — TrustLedger Core Layer

Framework-agnostic building blocks shared across the frontend. Everything is
re-exported from a single barrel so call sites import from one place:

```ts
import {
    logger,
    analytics,
    isEnabled,
    can,
    TTLCache,
    validateAmount,
} from "@/core";
```

`@/core` resolves to [`index.ts`](./index.ts), which re-exports the canonical
surface in [`core.ts`](./core.ts). See [`docs/CORE.md`](../../docs/CORE.md) for
usage guidance and examples.

## Module map

| Module            | Path           | Purpose                                                        |
| ----------------- | -------------- | -------------------------------------------------------------- |
| Service contracts | `contracts/`   | Interfaces (`Logger`, `AnalyticsSink`, `CacheStore`, `Clock`…) |
| Configuration     | `config/`      | Typed, frozen view of `process.env` (client vs. server split)  |
| Error handling    | `errors/`      | `AppError` hierarchy + `normalizeError`                        |
| Logging           | `logging/`     | Level-gated structured logger with swappable sink              |
| Telemetry         | `telemetry/`   | `startSpan` / `measure` performance timing                     |
| Events            | `events/`      | Typed in-process `EventBus` (`AppEventMap`)                    |
| Feature flags     | `flags/`       | `isEnabled` with env + runtime overrides                       |
| Permissions       | `permissions/` | Role → capability matrix (`can` / `assertCan`)                 |
| Validation        | `validation/`  | `validateAmount`, `isEvmAddress`, `assert`                     |
| Caching           | `cache/`       | `TTLCache` + `memoizeAsync`                                    |
| Analytics         | `analytics/`   | `AnalyticsService` over a pluggable sink                       |
| Shared utilities  | `utils/`       | `clamp`, `truncateMiddle`, `sleep`, `safeJsonParse`, …         |

## Conventions

- **No new runtime dependencies.** Core is built on the standard library and
  `viem` (already a project dependency).
- **SSR-safe.** No module touches `window`/`document`/`navigator` at import
  time; browser APIs are feature-detected at call time.
- **Testable seams.** Time, logging, caching, and analytics are injected through
  the interfaces in `contracts/`, so tests substitute fakes (`BufferSink`, a
  fixed `Clock`) without globals.
- **One public entry.** Add new modules under `core/<name>/index.ts` and
  re-export them from `core.ts`. `core/index.ts!` is the knip entry, so the
  barrel's exports are treated as the public API.

## Testing

Unit tests live in [`../tests/unit/core.test.ts`](../tests/unit/core.test.ts):

```bash
cd src && npx jest core.test
```
