import "server-only";

/**
 * Off-chain database entry point. Re-exports the Prisma client accessor and the
 * repository functions so callers import from a single stable path
 * (`@/lib/db`). Server-only.
 *
 * The database is optional infrastructure: features degrade gracefully and the
 * app builds and runs without `DATABASE_URL`. Guard database work with
 * {@link isDatabaseConfigured} where a fallback path exists.
 */
export { getPrisma, isDatabaseConfigured } from "@/lib/db/client";
export * from "@/lib/db/repositories/contractMetadata";
export * from "@/lib/db/repositories/disputes";
export * from "@/lib/db/repositories/jurors";
export * from "@/lib/db/repositories/analytics";
export * as userProfiles from "@/lib/db/repositories/userProfiles";
export * as notifications from "@/lib/db/repositories/notifications";
