/**
 * Applies pending Prisma migrations during a Vercel build, safely.
 *
 * Runs `prisma migrate deploy` (idempotent — only un-applied migrations are
 * applied) over the direct, non-pooled connection Prisma requires for
 * migrations. Behaviour is gated on the deployment environment so a build never
 * mutates the wrong database or fails for a reason unrelated to the change:
 *
 *   - production: migrations are required. A missing `DIRECT_URL` or a failed
 *     migration fails the build, so an app is never promoted ahead of its
 *     schema.
 *   - preview: migrations run only when `DIRECT_URL` is set (e.g. a Neon preview
 *     branch); otherwise they are skipped so preview builds never touch the
 *     production database or fail for lack of a direct connection.
 *   - anything else (local/CI `next build`): skipped.
 *
 * Connection strings are never logged.
 */
import { execFileSync } from "node:child_process";

const vercelEnv = process.env.VERCEL_ENV ?? "";
const isProduction = vercelEnv === "production";
const isPreview = vercelEnv === "preview";
const hasDirectUrl = Boolean(process.env.DIRECT_URL);

/** Log a skip reason and exit successfully. */
function skip(reason) {
	console.log(`[vercel-migrate] Skipping migrations: ${reason}.`);
	process.exit(0);
}

if (!isProduction && !isPreview) {
	skip(`VERCEL_ENV="${vercelEnv || "unset"}" is not a deploy environment`);
}

if (!hasDirectUrl) {
	if (isProduction) {
		console.error(
			"[vercel-migrate] DIRECT_URL is required to run production migrations; aborting build.",
		);
		process.exit(1);
	}
	skip("DIRECT_URL is not set for this preview build");
}

console.log(`[vercel-migrate] Applying pending migrations (VERCEL_ENV=${vercelEnv}).`);
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
execFileSync(npm, ["run", "db:migrate"], { stdio: "inherit" });
