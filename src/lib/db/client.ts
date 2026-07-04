import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * Off-chain database client (PostgreSQL via Prisma 7 + the node-postgres driver
 * adapter). Server-only: never import this from a Client Component.
 *
 * The client is created lazily and cached on `globalThis` so Next.js hot reloads
 * and Fluid Compute instance reuse do not open a new connection pool per render.
 * It throws only when a caller actually needs the database and `DATABASE_URL` is
 * missing, so the app still builds and runs (with the DB features dormant) until
 * a connection string is provisioned. See NOTES.md and .env.example.
 */

const globalForPrisma = globalThis as unknown as { trustledgerPrisma?: PrismaClient };

/** True when an off-chain database connection string is configured. */
export function isDatabaseConfigured(): boolean {
	const url = process.env.DATABASE_URL;
	return url !== undefined && url !== "";
}

function createPrismaClient(): PrismaClient {
	const connectionString = process.env.DATABASE_URL;
	if (connectionString === undefined || connectionString === "") {
		throw new Error(
			"DATABASE_URL is not set. Provision the off-chain database (see NOTES.md) " +
				"before using database-backed features.",
		);
	}
	const adapter = new PrismaPg(connectionString);
	return new PrismaClient({ adapter });
}

/**
 * Returns the shared Prisma client, creating it on first use.
 *
 * @throws when `DATABASE_URL` is not configured.
 */
export function getPrisma(): PrismaClient {
	const client = globalForPrisma.trustledgerPrisma ?? createPrismaClient();
	if (process.env.NODE_ENV !== "production") {
		globalForPrisma.trustledgerPrisma = client;
	}
	return client;
}
