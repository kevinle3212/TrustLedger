import path from "node:path";

import { defineConfig } from "prisma/config";

/**
 * Prisma 7 configuration. Connection URLs live here (and in the environment),
 * not in `schema.prisma`. The app connects at runtime via a driver adapter
 * (`src/lib/db/client.ts`); this file only supplies the URL that
 * `prisma migrate` / `prisma db` commands use.
 *
 * - `DATABASE_URL` — pooled connection string used by the application.
 * - `DIRECT_URL`   — optional direct (non-pooled) connection preferred for
 *   migrations; falls back to `DATABASE_URL` when unset.
 */
const migrateUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
	schema: path.join("prisma", "schema.prisma"),
	migrations: { path: path.join("prisma", "migrations") },
	// `datasource.url` is only needed by migrate/introspection; omit it entirely
	// when unset so `exactOptionalPropertyTypes` stays satisfied.
	...(migrateUrl === undefined ? {} : { datasource: { url: migrateUrl } }),
});
