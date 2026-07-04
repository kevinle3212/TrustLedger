#!/usr/bin/env node
/**
 * Database connectivity + schema smoke test.
 *
 * Connects with DIRECT_URL (falling back to DATABASE_URL) and confirms the
 * expected off-chain tables exist. Prints a row count per table. Read-only:
 * it never writes. Exits non-zero on a failed connection or a missing table.
 *
 * Usage (from repo root or database/):
 *   DIRECT_URL=... node database/verify.mjs
 * Locally the URL is read from src/.env.local / root .env automatically.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// `pg` is a dependency of the frontend workspace (src/node_modules), so resolve
// it from there regardless of where this script is invoked.
const require = createRequire(path.join(ROOT, "src", "package.json"));
const { Client } = require("pg");

function readEnvFile(rel) {
	try {
		for (const line of readFileSync(path.join(ROOT, rel), "utf8").split("\n")) {
			const m = /^(DIRECT_URL|DATABASE_URL)=(.*)$/.exec(line);
			if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
		}
	} catch {
		/* file may not exist in CI; env vars can come from the environment */
	}
}
readEnvFile("src/.env.local");
readEnvFile(".env");

const EXPECTED = ["contract_metadata", "disputes", "jurors", "juror_votes", "analytics_aggregates"];

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
	console.error("verify: no DIRECT_URL or DATABASE_URL configured");
	process.exit(1);
}

const client = new Client({ connectionString: url });
try {
	await client.connect();
	const { rows } = await client.query(
		"select table_name from information_schema.tables where table_schema='public'",
	);
	const present = new Set(rows.map((r) => r.table_name));
	const missing = EXPECTED.filter((t) => !present.has(t));
	if (missing.length) {
		console.error("verify: missing tables:", missing.join(", "));
		console.error("Run `npm run db:migrate` from src/ to apply migrations.");
		process.exit(1);
	}
	for (const t of EXPECTED) {
		const c = await client.query(`select count(*)::int as n from "${t}"`);
		console.log(`ok  ${t.padEnd(22)} rows=${c.rows[0].n}`);
	}
	console.log("verify: all expected tables present");
} catch (err) {
	console.error("verify: connection failed:", err.message);
	process.exit(1);
} finally {
	await client.end().catch(() => {});
}
