/**
 * TrustLedger core layer — single entry point.
 *
 * Re-exports every core module so consumers can `import { logger, analytics,
 * isEnabled, can, TTLCache } from "@/core"`. See `core/README.md` for the module
 * map and `docs/core.md` for usage guidance.
 *
 * Modules: configuration, error handling, logging, telemetry, events, feature
 * flags, permissions, validation, caching, analytics, shared utilities, and the
 * service contracts/interfaces they are written against.
 */

export * from "@/core/contracts";
export * from "@/core/config";
export * from "@/core/errors";
export * from "@/core/logging";
export * from "@/core/telemetry";
export * from "@/core/events";
export * from "@/core/flags";
export * from "@/core/permissions";
export * from "@/core/validation";
export * from "@/core/cache";
export * from "@/core/analytics";
export * from "@/core/utils";
