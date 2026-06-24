# Core Layer

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Importing](#importing)
- [Modules and examples](#modules-and-examples)
    - [Logging](#logging)
    - [Errors](#errors)
    - [Feature flags](#feature-flags)
    - [Permissions](#permissions)
    - [Validation](#validation)
    - [Caching](#caching)
    - [Analytics and events](#analytics-and-events)
- [Adding a module](#adding-a-module)
- [Configuration reference](#configuration-reference)
- [Authors and Contributors](#authors-and-contributors)
- [Legal](#legal)

<!-- docs-toc:end -->

The core layer (`src/core/`) is TrustLedger's framework-agnostic foundation: a
small set of reusable modules that the app, API routes, and feature code build
on. It is documented in
[`src/core/README.md`](https://github.com/kevinle3212/TrustLedger/blob/main/src/core/README.md);
this page covers usage and integration guidance.

## Importing

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

```ts
import {
    logger,
    analytics,
    isEnabled,
    can,
    validateAmount,
    normalizeError,
} from "@/core";
```

`@/core` resolves to `src/core/index.ts`, which re-exports the canonical surface
in `src/core/core.ts`. Prefer the barrel import over reaching into individual
module folders.

## Modules and examples

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

### Logging

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

```ts
import { logger } from "@/core";

const log = logger.child({ feature: "staking" });
log.info("stake submitted", { asset: "USDC", amount: "100" });
```

Level is controlled by `NEXT_PUBLIC_LOG_LEVEL` (`debug` | `info` | `warn` |
`error`), defaulting to `debug` in development and `warn` in production. Install
a custom sink in tests with `setLogSink` / `resetLogSink`.

### Errors

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

```ts
import { normalizeError, ValidationError, isAppError } from "@/core";

try {
    doWork();
} catch (err) {
    const appError = normalizeError(err); // always an AppError
    logger.error(appError.message, { code: appError.code });
}
```

### Feature flags

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

```ts
import { isEnabled, setFlagOverride } from "@/core";

if (isEnabled("stakingSolEnabled")) {
    /* render SOL staking option */
}
```

Defaults live in `core/flags`. Override per environment with
`NEXT_PUBLIC_FLAG_<NAME>=true|false`, or at runtime via `setFlagOverride`.

### Permissions

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

```ts
import { can, assertCan } from "@/core";

if (can(role, "analytics:view")) {
    /* show dashboards */
}
assertCan(role, "admin:access"); // throws PermissionError otherwise
```

### Validation

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

```ts
import { validateAmount, isEvmAddress } from "@/core";

const result = validateAmount(input, 6); // USDC has 6 decimals
if (!result.ok) setError(result.message);
```

### Caching

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

```ts
import { memoizeAsync } from "@/core";

const getSummary = memoizeAsync(fetchSummary, (id) => id, 30_000);
```

### Analytics and events

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

```ts
import { analytics, eventBus } from "@/core";

analytics.track("stake_created", { asset: "SOL" });
eventBus.on("stake:created", ({ asset }) => log.debug("staked", { asset }));
```

`analytics.track` is a no-op when `NEXT_PUBLIC_ANALYTICS_DISABLED=true`.

## Adding a module

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

1. Create `src/core/<name>/index.ts` with the implementation and doc comments.
2. Re-export it from `src/core/core.ts`.
3. Add unit tests to `src/tests/unit/core.test.ts`.
4. Update the module map in `src/core/README.md`.

Keep modules dependency-free and SSR-safe (no top-level browser globals).

## Configuration reference

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

| Env var                          | Effect                                                    |
| -------------------------------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_LOG_LEVEL`          | Minimum log level emitted by `logger`                     |
| `NEXT_PUBLIC_ANALYTICS_ENDPOINT` | Analytics POST endpoint (default `/api/analytics/events`) |
| `NEXT_PUBLIC_ANALYTICS_DISABLED` | `true` disables `analytics.track`                         |
| `NEXT_PUBLIC_FLAG_<NAME>`        | Per-flag override (`true`/`false`)                        |

## Authors and Contributors

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **Kevin K. Le** — Founder, Founding Engineer, and Current Lead Engineer
  ([LinkedIn](https://www.linkedin.com/in/lekevin1))
- **Kellen Snider** — Founding Engineer
  ([LinkedIn](https://www.linkedin.com/in/kellen-snider-683396256/))

See [`CREDITS.md`](CREDITS.md) for the complete acknowledgement list.

## Legal

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

This document is part of TrustLedger, an open-source decentralized escrow and
arbitration protocol. Use of this software and documentation is subject to the
[Terms and Conditions](../TERMS_AND_CONDITIONS.md),
[Privacy Policy](../PRIVACY_POLICY.md), and
[Risk Disclosure](../RISK_DISCLOSURE.md). See [`LEGAL.md`](LEGAL.md) for the
full compliance and licensing overview.
